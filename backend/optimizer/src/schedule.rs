//! Python-facing `Schedule` wrapper.
//!
//! Wraps the internal Rust `Schedule` and pairs it with a start timestamp so
//! that all time-related accessors can return proper `DateTime<Utc>` values.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use electricity_price_optimizer::{
    optimizer_context::prognoses::Prognoses, schedule::Schedule as RustSchedule,
};
use pyo3::{PyResult, Python, pyclass, pymethods};

use crate::action::{AssignedConstantAction, AssignedVariableAction};
use crate::battery::AssignedBattery;
use crate::timeseries::TimeSeries;
use crate::units::WattHour;

#[pyclass]
/// Final schedule returned by the optimizer.
///
/// Provides accessors to retrieve assigned actions, batteries, and the
/// network consumption time series. All time values are relative to the
/// `start_timestamp` used when the optimizer was invoked.
pub struct Schedule {
    inner: RustSchedule,
    past_constant_actions: HashMap<u32, AssignedConstantAction>,
    start_timestamp: DateTime<Utc>,
}
#[pymethods]
impl Schedule {
    /// Get an assigned constant action by ID, if present.
    fn get_constant_action(&self, id: u32) -> Option<AssignedConstantAction> {
        if let Some(action) = self.past_constant_actions.get(&id) {
            return Some(action.clone());
        }
        self.inner
            .get_constant_action(id)
            .map(|action| AssignedConstantAction::new(action.clone(), self.start_timestamp))
    }
    /// Get an assigned variable action by ID, if present.
    fn get_variable_action(&self, id: u32) -> Option<AssignedVariableAction> {
        self.inner
            .get_variable_action(id)
            .map(|action| AssignedVariableAction::new(action.clone(), self.start_timestamp))
    }
    /// Get an assigned battery by ID, if present.
    fn get_battery(&self, id: u32) -> Option<AssignedBattery> {
        self.inner
            .get_battery(id)
            .map(|battery| AssignedBattery::new(battery.clone(), self.start_timestamp))
    }

    /// Get the network consumption over the full day as a `TimeSeries` of `WattHour` values.
    ///
    /// Internal milli-Wh integers are converted to `WattHour` for each timestep.
    fn get_network_consumption<'py>(&self, py: Python<'py>) -> PyResult<TimeSeries> {
        let prognoses = &self.inner.network_consumption;
        // Convert from internal milli-Wh (i64) to the user-facing WattHour type
        let prognoses = Prognoses::from_closure(|t| {
            let value = prognoses.get(t).expect("internal error");
            WattHour::from_milli_wh(*value as f64)
        });
        TimeSeries::from_prognoses(py, &prognoses, self.start_timestamp)
    }
}
impl Schedule {
    /// Construct a Python-facing `Schedule` from a Rust `Schedule` and a reference timestamp.
    pub fn new(
        inner: RustSchedule,
        past_constant_actions: HashMap<u32, AssignedConstantAction>,
        start_timestamp: DateTime<Utc>,
    ) -> Self {
        Schedule {
            inner,
            past_constant_actions,
            start_timestamp,
        }
    }
}
