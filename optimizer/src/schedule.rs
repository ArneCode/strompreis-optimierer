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

    fn get_network_consumption<'py>(&self, py: Python<'py>) -> PyResult<TimeSeries> {
        let prognoses = &self.inner.network_consumption;
        let prognoses = Prognoses::from_closure(|t| {
            let value = prognoses.get(t).expect("internal error");
            // convert from i64 in milli-Wh to WattHour
            WattHour::from_milli_wh(*value as f64)
        });
        TimeSeries::from_prognoses(py, &prognoses, self.start_timestamp)
    }
}
impl Schedule {
    pub fn new(inner: RustSchedule, start_timestamp: DateTime<Utc>) -> Self {
        Schedule {
            inner,
            start_timestamp,
        }
    }
}
