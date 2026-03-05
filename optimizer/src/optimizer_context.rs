//! Python-facing optimizer context builder.
//!
//! `OptimizerContext` accumulates prognoses, actions, and batteries from Python
//! and converts them into the internal `RustOptimizerContext` used by the solver.
//! Unit conversions (e.g. `EuroPerWh` → micro-euro/Wh, `Watt` → milli-Wh/timestep)
//! happen at the boundary when data enters this struct.

use std::{collections::HashMap, sync::Arc};

use chrono::{DateTime, Utc};
use electricity_price_optimizer::{
    optimizer_context::{
        OptimizerContext as RustOptimizerContext,
        action::{
            constant::{
                AssignedConstantAction as RustAssignedConstantAction,
                ConstantAction as RustConstantAction,
            },
            variable::VariableAction as RustVariableAction,
        },
        battery::Battery as RustBattery,
        prognoses::Prognoses,
    },
    time::{MINUTES_PER_TIMESTEP, Time},
};
use pyo3::{PyErr, PyResult, Python, pyclass, pymethods};

use crate::{
    action::{AssignedConstantAction, ConstantAction, VariableAction},
    battery::Battery,
    prognoses::PrognosesProvider,
    time_utils::{datetime_to_time, time_to_datetime},
    units::{EuroPerWh, WattHour},
};

#[pyclass]
/// Builder holding prognoses and assets before solving.
///
/// Create via `OptimizerContext(time, electricity_price)`, then call
/// `add_constant_action`, `add_variable_action`, `add_battery`, etc.
/// Finally pass to `run_simulated_annealing` which calls `to_rust()` internally.
pub struct OptimizerContext {
    /// Electricity price prognoses: micro-euro per Wh (i64) internally.
    electricity_price: Prognoses<i64>,
    /// Generated electricity prognoses: Wh/timestep (i64). Defaults to 0.
    generated_electricity: Prognoses<i64>,
    /// Uncontrollable consumption prognoses: Wh/timestep (i64). Defaults to 0.
    beyond_control_consumption: Prognoses<i64>,
    /// Batteries.
    batteries: Vec<Arc<RustBattery>>,
    /// Constant actions.
    constant_actions: Vec<Arc<RustConstantAction>>,
    /// past constant actions
    past_constant_actions: HashMap<u32, AssignedConstantAction>,
    /// Variable actions.
    variable_actions: Vec<Arc<RustVariableAction>>,
    /// Reference start timestamp for conversions and first timestep fraction.
    start_time: DateTime<Utc>,
}

#[pymethods]
impl OptimizerContext {
    #[new]
    /// Create an `OptimizerContext` with electricity price prognoses.
    ///
    /// `time` is the reference start `DateTime<Utc>`.  All other prognoses
    /// (generated electricity, beyond-control consumption) default to zero and
    /// can be added later.
    fn new(
        py: Python<'_>,
        time: DateTime<Utc>,
        electricity_price: &PrognosesProvider,
    ) -> Result<Self, PyErr> {
        let electricity_price = electricity_price.get_prognoses::<EuroPerWh>(py, time)?;
        // Convert from EuroPerWh to micro-euro/Wh (i64) for internal use
        let electricity_price = Prognoses::from_closure(|t: Time| {
            let price = electricity_price.get(t).expect("Electricity price missing");
            price.to_micro_euro_per_wh() as i64
        });
        let generated_electricity = Prognoses::from_closure(|_| 0);
        let beyond_control_consumption = Prognoses::from_closure(|_| 0);
        let batteries = vec![];
        let constant_actions = vec![];
        let past_constant_actions = HashMap::new();
        let variable_actions = vec![];
        let start_time = time;

        Ok(OptimizerContext {
            electricity_price,
            generated_electricity,
            beyond_control_consumption,
            batteries,
            constant_actions,
            past_constant_actions,
            variable_actions,
            start_time,
        })
    }

    /// Add a constant action. Validates duration and timestep alignment.
    fn add_constant_action<'py>(
        &mut self,
        py: Python<'py>,
        action: &ConstantAction,
    ) -> PyResult<()> {
        self.constant_actions
            .push(Arc::new(action.to_rust(py, self.start_time)?));
        Ok(())
    }

    /// Add a variable action. Validates timestep alignment.
    fn add_variable_action<'py>(
        &mut self,
        _py: Python<'py>,
        action: &VariableAction,
    ) -> PyResult<()> {
        self.variable_actions
            .push(Arc::new(action.to_rust(self.start_time)?));
        Ok(())
    }

    /// Add a battery.
    fn add_battery(&mut self, battery: &Battery) -> PyResult<()> {
        self.batteries.push(Arc::new(battery.to_rust()));
        Ok(())
    }

    /// Add a constant action that already started before the context start_time.
    ///
    /// Its remaining consumption is added to `beyond_control_consumption` for
    /// every timestep from now until its scheduled end, so the optimizer treats
    /// the load as uncontrollable.
    fn add_past_constant_action<'py>(
        &mut self,
        _py: Python<'py>,
        action: &AssignedConstantAction,
    ) -> PyResult<()> {
        // find out how much time has passed since action start
        self.past_constant_actions
            .insert(action.get_id(), action.clone());
        let end_time = action.get_end_time()?;
        let end_time = datetime_to_time(end_time, self.start_time)?;
        // Add the action's consumption to every timestep before its end
        self.beyond_control_consumption += Prognoses::from_closure(|t: Time| {
            if t >= end_time {
                0
            } else {
                action.get_inner().get_action().get_consumption()
            }
        });
        Ok(())
    }

    /// Add generated electricity prognoses via a provider. Values are summed with existing prognoses.
    fn add_generated_electricity_prognoses<'py>(
        &mut self,
        py: Python<'py>,
        provider: &PrognosesProvider,
    ) -> PyResult<()> {
        let prognoses = provider.get_prognoses::<WattHour>(py, self.start_time)?;
        self.generated_electricity += Prognoses::from_closure(|t| -> i64 {
            prognoses.get(t).expect("internal error").to_milli_wh() as i64
        });
        Ok(())
    }
}
impl OptimizerContext {
    /// Convert to the internal `RustOptimizerContext`.
    ///
    /// Computes `first_timestep_fraction`: the fraction of the first timestep
    /// that remains after `start_time`.  For example, if `start_time` is 2
    /// minutes into a 5-minute timestep the fraction is 3/5 = 0.6.
    pub fn to_rust(&self) -> PyResult<RustOptimizerContext> {
        // first_timestep fraction is the length of the first timestep that is remaining divided by full timestep length
        let first_timestep_fraction = {
            let start_time = self.start_time;
            let next_timestep = time_to_datetime(Time::from_timestep(1), start_time)?;
            let remaining_duration = next_timestep.signed_duration_since(start_time);
            // Use nanoseconds to avoid rounding issues with coarser units
            let remaining_nanos = remaining_duration.num_nanoseconds().unwrap() as f64;
            let full_timestep_nanos = (MINUTES_PER_TIMESTEP as i64 * 60 * 1_000_000_000) as f64;
            remaining_nanos / full_timestep_nanos
        };
        Ok(RustOptimizerContext::new(
            self.electricity_price.clone(),
            self.generated_electricity.clone(),
            self.beyond_control_consumption.clone(),
            self.batteries.clone(),
            self.constant_actions.clone(),
            self.variable_actions.clone(),
            first_timestep_fraction as f32,
        ))
    }

    /// Returns a reference to the list of constant actions.
    pub fn get_constant_actions(&self) -> &Vec<Arc<RustConstantAction>> {
        &self.constant_actions
    }
    pub fn get_past_constant_actions(&self) -> &HashMap<u32, AssignedConstantAction> {
        &self.past_constant_actions
    }
    /// Returns a reference to the list of variable actions.
    pub fn get_variable_actions(&self) -> &Vec<Arc<RustVariableAction>> {
        &self.variable_actions
    }
    /// Returns a reference to the list of batteries.
    pub fn get_batteries(&self) -> &Vec<Arc<RustBattery>> {
        &self.batteries
    }
    /// Returns a reference to the electricity price prognoses (micro-euro/Wh).
    pub fn get_electricity_price(&self) -> &Prognoses<i64> {
        &self.electricity_price
    }
    /// Returns a reference to the generated electricity prognoses (milli-Wh).
    pub fn get_generated_electricity(&self) -> &Prognoses<i64> {
        &self.generated_electricity
    }
    /// Returns a reference to the beyond-control consumption prognoses (milli-Wh).
    pub fn get_beyond_control_consumption(&self) -> &Prognoses<i64> {
        &self.beyond_control_consumption
    }
    /// Returns the reference start timestamp.
    pub fn get_start_time(&self) -> DateTime<Utc> {
        self.start_time
    }
}
