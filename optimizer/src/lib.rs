//! Python bindings for electricity_price_optimizer.
//!
//! This module exposes:
//! - Units (Euro, EuroPerWh, Watt, WattHour) with conversion helpers
//! - Time conversions between chrono DateTime<Utc> and optimizer Time
//! - PrognosesProvider for passing Python closures to Rust
//! - Actions (constant and variable), batteries, optimizer context, and schedules
//!
//! Conventions:
//! - Timestep length: MINUTES_PER_TIMESTEP minutes
//! - Prices: micro-euro per Wh internally (i64)
//! - Power/energy: milli-Wh and milli-Wh per timestep (i64) internally
//! - DateTime values must lie on timestep boundaries (minute % MINUTES_PER_TIMESTEP == 0; seconds/nanoseconds == 0)
mod units;
use std::{fmt::Debug, sync::Arc};

use chrono::{DateTime, Datelike, TimeDelta, TimeZone, Timelike, Utc};
use electricity_price_optimizer::{
    optimizer_context::{
        OptimizerContext as RustOptimizerContext,
        action::{
            constant::AssignedConstantAction as RustAssignedConstantAction,
            constant::ConstantAction as RustConstantAction,
            variable::AssignedVariableAction as RustAssignedVariableAction,
            variable::VariableAction as RustVariableAction,
        },
        battery::AssignedBattery as RustAssignedBattery,
        battery::Battery as RustBattery,
        prognoses::Prognoses,
    },
    schedule::Schedule as RustSchedule,
    time::{MINUTES_PER_TIMESTEP, Time},
};
use pyo3::{
    Bound, Py, PyAny, PyErr, PyResult, Python,
    exceptions::PyValueError,
    prelude::FromPyObjectOwned,
    pyclass, pyfunction, pymethods, pymodule,
    types::{PyModule, PyModuleMethods},
    wrap_pyfunction,
};
// gives to optimizer:
// speeds in mWH per timestep
// charge in  mWH
// price in micro Euro per Wh
// thus return cost is in milli micro Euro = nano Euro

use crate::units::{Euro, EuroPerWh, Watt, WattHour, register_units_submodule};

#[pyclass]
/// Provides prognoses data through a Python callable returning values for a time interval.
/// The callable signature must be: get_data(curr: DateTime[UTC], next: DateTime[UTC]) -> T.
/// T must be extractable from Python (e.g., EuroPerWh or i64).
struct PrognosesProvider {
    get_data: Py<PyAny>,
}

#[pymethods]
impl PrognosesProvider {
    #[new]
    /// Create a new provider with a Python callable that returns data for a given interval.
    fn new(get_data: Py<PyAny>) -> Self {
        PrognosesProvider { get_data }
    }
}

/// Convert optimizer Time to a DateTime<Utc>, aligned to the timestep boundary relative to start_time.
/// Rounds down to the nearest timestep and never before start_time.
fn time_to_datetime(time: Time, start_time: DateTime<Utc>) -> PyResult<DateTime<Utc>> {
    // 1. Get starting point in nanoseconds
    // .expect() is used here because Utc timestamps usually fit in i64 nanos
    // unless you're dealing with years far in the future/past.
    let start_ns = start_time
        .timestamp_nanos_opt()
        .expect("Timestamp out of range");

    // 2. Define our interval in nanoseconds
    let ns_per_minute: i64 = 60 * 1_000_000_000;
    let interval_ns = (MINUTES_PER_TIMESTEP as i64 * ns_per_minute);

    // 3. Calculate target time in nanoseconds
    let added_ns = time.get_minutes() as i64 * ns_per_minute;
    let target_ns = start_ns + added_ns;

    // 4. Round down to the nearest timestep
    // The modulo operation gives us the "overflow" past the last clean interval
    let rounded_ns = target_ns - (target_ns % interval_ns);

    // 5. Ensure we don't round back to a time before the start_time
    let res_ns = rounded_ns.max(start_ns);
    // 6. Convert nanoseconds back into a DateTime object
    let result = Utc.timestamp_nanos(res_ns);

    Ok(result)
}

/// Validate that a DateTime<Utc> is on a timestep boundary relative to start_time.
/// Returns error if before start_time or not aligned to the timestep.
fn check_on_timestep_boundary(dt: DateTime<Utc>, start_time: DateTime<Utc>) -> PyResult<()> {
    if dt < start_time {
        return Err(PyValueError::new_err(format!(
            "DateTime {} is before start time {}",
            dt, start_time
        )));
    }
    if dt == start_time {
        return Ok(());
    }
    if !dt.minute().is_multiple_of(MINUTES_PER_TIMESTEP)
        || dt.second() != 0
        || dt.timestamp_subsec_nanos() != 0
    {
        return Err(PyValueError::new_err(format!(
            "DateTime is not on a timestep boundary: minute={}, second={}, nanos={}",
            dt.minute(),
            dt.second(),
            dt.timestamp_subsec_nanos()
        )));
    }
    Ok(())
}

/// Convert a DateTime<Utc> to optimizer Time, assuming dt is on a timestep boundary.
/// Errors if dt < start_time or cannot construct the base alignment.
fn datetime_to_time(dt: DateTime<Utc>, start_time: DateTime<Utc>) -> Result<Time, PyErr> {
    if dt == start_time {
        return Ok(Time::from_timestep(0));
    }
    if dt < start_time {
        return Err(PyValueError::new_err(format!(
            "DateTime {} is before start time {}",
            dt, start_time
        )));
    }
    // the first datetime before or equal to start_time that is on a timestep boundary
    let base_dt = {
        let minute = start_time.minute() - (start_time.minute() % MINUTES_PER_TIMESTEP);
        Utc.with_ymd_and_hms(
            start_time.year(),
            start_time.month(),
            start_time.day(),
            start_time.hour(),
            minute,
            0,
        )
        .single()
        .ok_or_else(|| {
            PyValueError::new_err(format!("Failed to create base datetime from {}", dt))
        })?
    };

    let duration = dt.signed_duration_since(base_dt);
    let total_minutes = duration.num_minutes() as u32;
    let timesteps = total_minutes / MINUTES_PER_TIMESTEP;
    let result = Time::from_timestep(timesteps);
    Ok(result)
}

impl PrognosesProvider {
    /// Create a Prognoses<T> from the Python callable, invoked per timestep interval [t, t+1).
    /// T must implement FromPyObjectOwned. Errors propagate from Python callable or extraction.
    fn get_prognoses<'py, T: Clone + Debug + Default + FromPyObjectOwned<'py>>(
        &self,
        py: Python<'py>,
        start_time: DateTime<Utc>,
    ) -> Result<Prognoses<T>, PyErr> {
        Prognoses::from_closure_result(|t: Time| {
            let curr_t = time_to_datetime(t, start_time)?;
            let next_t = time_to_datetime(t.get_next_timestep(), start_time)?;
            let result = self.get_data.call1(py, (curr_t, next_t))?;
            result.extract::<T>(py).map_err(Into::into)
        })
    }
}

#[pyclass]
#[derive(Clone)]
/// A fixed-duration action with constant consumption per timestep.
/// Times must be on timestep boundaries.
pub struct ConstantAction {
    /// Earliest action start (inclusive).
    pub start_from: DateTime<Utc>,
    /// Latest action end (exclusive).
    pub end_before: DateTime<Utc>,
    /// Duration of the action. Must be < 1 day and a multiple of MINUTES_PER_TIMESTEP.
    pub duration: TimeDelta,
    /// Fixed consumption per timestep.
    pub consumption: Watt,
    /// Unique identifier.
    id: u32,
}
#[pymethods]
impl ConstantAction {
    #[new]
    /// Create a ConstantAction. All DateTime values must align to timestep boundaries.
    fn new(
        start_from: DateTime<Utc>,
        end_before: DateTime<Utc>,
        duration: TimeDelta,
        consumption: Watt,
        id: u32,
    ) -> Self {
        ConstantAction {
            start_from,
            end_before,
            duration,
            consumption,
            id,
        }
    }
}
impl ConstantAction {
    /// Convert to internal RustConstantAction, validating duration and timestep alignment.
    fn to_rust<'py>(
        &self,
        _py: Python<'py>,
        start_time: DateTime<Utc>,
    ) -> PyResult<RustConstantAction> {
        let duration = self.duration;
        if duration.num_days() != 0 {
            return Err(PyValueError::new_err("Duration must be less than 1 day"));
        }
        let duration_minutes = duration.num_minutes() as u32;
        if !duration_minutes.is_multiple_of(MINUTES_PER_TIMESTEP) {
            return Err(PyValueError::new_err(format!(
                "Duration must be a multiple of {} minutes",
                MINUTES_PER_TIMESTEP
            )));
        }
        let duration = Time::new(0, duration_minutes);

        check_on_timestep_boundary(self.start_from, start_time)?;
        let start_time_converted = datetime_to_time(self.start_from, start_time)?;
        check_on_timestep_boundary(self.end_before, start_time)?;
        let end_time_converted = datetime_to_time(self.end_before, start_time)?;

        Ok(RustConstantAction::new(
            start_time_converted,
            end_time_converted,
            duration,
            self.consumption.to_milli_watt_hour_per_timestep() as i64,
            self.id,
        ))
    }
}

#[pyclass]
/// A constant action assigned by the optimizer, exposing start/end times and ID.
pub struct AssignedConstantAction {
    inner: RustAssignedConstantAction,
    start_timestamp: DateTime<Utc>,
}
#[pymethods]
impl AssignedConstantAction {
    /// Get the assigned start time as DateTime<Utc>.
    fn get_start_time(&self) -> PyResult<DateTime<Utc>> {
        time_to_datetime(self.inner.get_start_time(), self.start_timestamp)
    }
    /// Get the assigned end time as DateTime<Utc>.
    fn get_end_time(&self) -> PyResult<DateTime<Utc>> {
        time_to_datetime(self.inner.get_end_time(), self.start_timestamp)
    }
    /// Get the unique action ID.
    fn get_id(&self) -> u32 {
        self.inner.get_id()
    }
}

#[pyclass]
#[derive(Clone)]
/// A variable action with total energy and per-timestep max consumption constraints.
/// Times must be on timestep boundaries.
pub struct VariableAction {
    /// Earliest time the action can start (inclusive).
    pub start: DateTime<Utc>,
    /// Latest time the action must end (exclusive).
    pub end: DateTime<Utc>,
    /// Total energy to consume over the window.
    pub total_consumption: WattHour,
    /// Per-timestep maximum consumption.
    pub max_consumption: Watt,
    /// Unique identifier.
    id: u32,
}
#[pymethods]
impl VariableAction {
    #[new]
    /// Create a VariableAction. DateTimes must be aligned to timestep boundaries.
    fn new(
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        total_consumption: WattHour,
        max_consumption: Watt,
        id: u32,
    ) -> Self {
        VariableAction {
            start,
            end,
            total_consumption,
            max_consumption,
            id,
        }
    }
}
impl VariableAction {
    /// Convert to internal RustVariableAction, validating timestep alignment.
    fn to_rust(&self, start_time: DateTime<Utc>) -> PyResult<RustVariableAction> {
        check_on_timestep_boundary(self.start, start_time)?;
        let start_time_converted = datetime_to_time(self.start, start_time)?;
        check_on_timestep_boundary(self.end, start_time)?;
        let end_time_converted = datetime_to_time(self.end, start_time)?;

        Ok(RustVariableAction::new(
            start_time_converted,
            end_time_converted,
            self.total_consumption.to_milli_wh() as i64,
            self.max_consumption.to_milli_watt_hour_per_timestep() as i64,
            self.id,
        ))
    }
}

#[pyclass]
pub struct AssignedVariableAction {
    inner: RustAssignedVariableAction,
    start_timestamp: DateTime<Utc>,
}
#[pymethods]
impl AssignedVariableAction {
    fn get_consumption(&self, time: DateTime<Utc>) -> PyResult<Watt> {
        let time_converted = datetime_to_time(time, self.start_timestamp)?;
        let consumption_per_timestep = self.inner.get_consumption(time_converted);
        Ok(Watt::from_milli_watt_hour_per_timestep(
            consumption_per_timestep as f64,
        ))
    }
    fn get_id(&self) -> u32 {
        self.inner.get_id()
    }
}
#[pyclass]
#[derive(Clone)]
pub struct Battery {
    /// Maximum capacity.
    pub capacity: WattHour,
    /// Maximum charge rate per timestep.
    pub max_charge_rate: Watt,
    /// Maximum discharge rate per timestep.
    pub max_discharge_rate: Watt,
    /// Initial charge level.
    pub initial_charge: WattHour,
    /// Unique identifier.
    pub id: u32,
}
#[pymethods]
impl Battery {
    #[new]
    /// Create a Battery definition.
    fn new(
        capacity: WattHour,
        max_charge_rate: Watt,
        max_discharge_rate: Watt,
        initial_charge: WattHour,
        id: u32,
    ) -> Self {
        Battery {
            capacity,
            max_charge_rate,
            max_discharge_rate,
            initial_charge,
            id,
        }
    }
}
impl Battery {
    /// Convert to internal RustBattery with losses fixed at 1.0 (no loss).
    fn to_rust(&self) -> RustBattery {
        RustBattery::new(
            self.capacity.to_milli_wh() as i64,
            self.initial_charge.to_milli_wh() as i64,
            self.max_charge_rate.to_milli_watt_hour_per_timestep() as i64,
            self.max_discharge_rate.to_milli_watt_hour_per_timestep() as i64,
            1.0,
            self.id,
        )
    }
}

#[pyclass]
/// A battery assignment exposing charge level and instantaneous charge speed at timesteps.
pub struct AssignedBattery {
    inner: RustAssignedBattery,
    start_timestamp: DateTime<Utc>,
}
#[pymethods]
impl AssignedBattery {
    /// Get charge level at a given DateTime<Utc>. Errors if out of range.
    fn get_charge_level(&self, time: DateTime<Utc>) -> PyResult<WattHour> {
        let time_converted = datetime_to_time(time, self.start_timestamp)?;
        if let Some(result) = self.inner.get_charge_level(time_converted) {
            Ok(WattHour::from_milli_wh(*result as f64))
        } else {
            Err(PyValueError::new_err(
                "Time out of range for battery charge level FIXME",
            ))
        }
    }
    /// Get charge speed (delta between timestep and next). Returns 0 at end-of-day.
    fn get_charge_speed(&self, time: DateTime<Utc>) -> PyResult<Watt> {
        let time_converted = datetime_to_time(time, self.start_timestamp)?;
        let next_time = time_converted.get_next_timestep();
        // get charge levels at time and next_time
        // next time might be end of day in which case we return 0
        let curr_level = if let Some(level) = self.inner.get_charge_level(time_converted) {
            *level
        } else {
            return Err(PyValueError::new_err(
                "Time out of range for battery charge level FIXME",
            ));
        };
        let next_level = if let Some(level) = self.inner.get_charge_level(next_time) {
            *level
        } else if next_time == Time::get_day_end() {
            0
        } else {
            return Err(PyValueError::new_err(
                "Time out of range for battery charge level FIXME",
            ));
        };

        let delta_charge = next_level - curr_level;
        Ok(Watt::from_milli_watt_hour_per_timestep(delta_charge as f64))
    }
    /// Get battery ID.
    fn get_id(&self) -> u32 {
        self.inner.get_battery().get_id()
    }
}

#[pyclass]
/// Builder holding prognoses and assets before solving.
/// Add actions/batteries/prognoses, then convert to RustOptimizerContext for solving.
struct OptimizerContext {
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
    /// Variable actions.
    variable_actions: Vec<Arc<RustVariableAction>>,
    /// Reference start timestamp for conversions and first timestep fraction.
    start_time: DateTime<Utc>,
}

#[pymethods]
impl OptimizerContext {
    #[new]
    /// Create an OptimizerContext with electricity price prognoses provider.
    /// Time is the reference start DateTime<Utc>. Other prognoses default to 0.
    fn new(
        py: Python<'_>,
        time: DateTime<Utc>,
        electricity_price: &PrognosesProvider,
    ) -> Result<Self, PyErr> {
        let electricity_price = electricity_price.get_prognoses::<EuroPerWh>(py, time)?;
        let electricity_price = Prognoses::from_closure(|t: Time| {
            let price = electricity_price.get(t).expect("Electricity price missing");
            // convert to i64 in micro Euro per Wh
            price.to_micro_euro_per_wh() as i64
        });
        let generated_electricity = Prognoses::from_closure(|_| 0);
        let beyond_control_consumption = Prognoses::from_closure(|_| 0);
        let batteries = vec![];
        let constant_actions = vec![];
        let variable_actions = vec![];
        let start_time = time;

        Ok(OptimizerContext {
            electricity_price,
            generated_electricity,
            beyond_control_consumption,
            batteries,
            constant_actions,
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
    /// Its remaining consumption is added to beyond_control_consumption until its end.
    fn add_past_constant_action<'py>(
        &mut self,
        _py: Python<'py>,
        action: &AssignedConstantAction,
    ) -> PyResult<()> {
        // find out how much time has passed since action start
        let end_time = action.get_end_time()?;
        let end_time = datetime_to_time(end_time, self.start_time)?;
        self.beyond_control_consumption += Prognoses::from_closure(|t: Time| {
            if t >= end_time {
                0
            } else {
                action.inner.get_action().get_consumption()
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
    /// Convert to RustOptimizerContext. Computes first_timestep_fraction from start_time alignment.
    fn to_rust(&self) -> PyResult<RustOptimizerContext> {
        // first_timestep fraction is the length of the first timestep that is remaining divided by full timestep length
        let first_timestep_fraction = {
            let start_time = self.start_time;
            let next_timestep = time_to_datetime(Time::from_timestep(1), start_time)?;
            let remaining_duration = next_timestep.signed_duration_since(start_time);
            // calculate as precise as possible
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
}

#[pyclass]
/// Final schedule returned by the optimizer. Use accessors to retrieve assigned actions and batteries.
pub struct Schedule {
    inner: RustSchedule,
    start_timestamp: DateTime<Utc>,
}
#[pymethods]
impl Schedule {
    /// Get an assigned constant action by ID, if present.
    fn get_constant_action(&self, id: u32) -> Option<AssignedConstantAction> {
        self.inner
            .get_constant_action(id)
            .map(|action| AssignedConstantAction {
                inner: action.clone(),
                start_timestamp: self.start_timestamp,
            })
    }
    /// Get an assigned variable action by ID, if present.
    fn get_variable_action(&self, id: u32) -> Option<AssignedVariableAction> {
        self.inner
            .get_variable_action(id)
            .map(|action| AssignedVariableAction {
                inner: action.clone(),
                start_timestamp: self.start_timestamp,
            })
    }
    /// Get an assigned battery by ID, if present.
    fn get_battery(&self, id: u32) -> Option<AssignedBattery> {
        self.inner.get_battery(id).map(|battery| AssignedBattery {
            inner: battery.clone(),
            start_timestamp: self.start_timestamp,
        })
    }
}

#[pyfunction]
/// Run simulated annealing with a given OptimizerContext.
/// Returns total cost in Euro and the resulting Schedule.
fn run_simulated_annealing(
    py: Python<'_>,
    context: &OptimizerContext,
) -> PyResult<(Euro, Schedule)> {
    // 2. Release the GIL for the heavy computation
    let (cost, rust_schedule) = py.detach(|| -> PyResult<(i64, RustSchedule)> {
        // This closure runs WITHOUT the GIL
        let rust_context = context.to_rust()?;

        Ok(electricity_price_optimizer::simulated_annealing::run_simulated_annealing(rust_context))
    })?;
    Ok((
        Euro::from_nano_euro(cost as f64),
        Schedule {
            inner: rust_schedule,
            start_timestamp: context.start_time,
        },
    ))
}

#[pymodule]
/// Python module initializer. Registers units, classes, and functions.
fn electricity_price_optimizer_py(m: &Bound<'_, PyModule>) -> PyResult<()> {
    // Register units submodule
    register_units_submodule(m)?;
    // Register classes
    m.add_class::<PrognosesProvider>()?;
    m.add_class::<ConstantAction>()?;
    m.add_class::<AssignedConstantAction>()?;
    m.add_class::<VariableAction>()?;
    m.add_class::<AssignedVariableAction>()?;
    m.add_class::<Battery>()?;
    m.add_class::<AssignedBattery>()?;
    m.add_class::<OptimizerContext>()?;
    m.add_class::<Schedule>()?;

    // Register functions
    m.add_function(wrap_pyfunction!(run_simulated_annealing, m)?)?;

    Ok(())
}
