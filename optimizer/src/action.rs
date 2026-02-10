use chrono::{DateTime, TimeDelta, Utc};
use electricity_price_optimizer::{
    optimizer_context::action::{
        constant::{
            AssignedConstantAction as RustAssignedConstantAction,
            ConstantAction as RustConstantAction,
        },
        variable::{
            AssignedVariableAction as RustAssignedVariableAction,
            VariableAction as RustVariableAction,
        },
    },
    time::{MINUTES_PER_TIMESTEP, Time, TimeIterator},
};
use pyo3::{
    IntoPyObjectExt, Py, PyAny, PyResult, Python, exceptions::PyValueError, pyclass, pymethods,
};

use crate::time_utils::{check_on_timestep_boundary, datetime_to_time, time_to_datetime};
use crate::timeseries::{DataPoint, TimeSeries};
use crate::units::{Watt, WattHour};

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
    pub fn to_rust<'py>(
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
    pub fn get_end_time(&self) -> PyResult<DateTime<Utc>> {
        time_to_datetime(self.inner.get_end_time(), self.start_timestamp)
    }
    /// Get the unique action ID.
    pub fn get_id(&self) -> u32 {
        self.inner.get_id()
    }
}
impl AssignedConstantAction {
    pub fn new(inner: RustAssignedConstantAction, start_timestamp: DateTime<Utc>) -> Self {
        AssignedConstantAction {
            inner,
            start_timestamp,
        }
    }
    // getters
    pub fn get_inner(&self) -> &RustAssignedConstantAction {
        &self.inner
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
    pub fn to_rust(&self, start_time: DateTime<Utc>) -> PyResult<RustVariableAction> {
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

    fn get_consumption_time_series<'py>(&self, py: Python<'py>) -> PyResult<TimeSeries> {
        let start_time = time_to_datetime(self.inner.get_start(), self.start_timestamp)?;
        let end_time = time_to_datetime(self.inner.get_end(), self.start_timestamp)?;

        let points = (self.inner.get_start()..self.inner.get_end())
            .iter_steps()
            .map(|time| {
                let consumption = self.inner.get_consumption(time);
                let value = Watt::from_milli_watt_hour_per_timestep(consumption as f64);
                let timestamp = time_to_datetime(time, self.start_timestamp)?;
                Ok(DataPoint {
                    timestamp,
                    value: value.into_py_any(py)?,
                })
            })
            .collect::<PyResult<Vec<DataPoint>>>()?;

        Ok(TimeSeries {
            start_time,
            end_time,
            points,
        })
    }
}

impl AssignedVariableAction {
    pub fn new(inner: RustAssignedVariableAction, start_timestamp: DateTime<Utc>) -> Self {
        AssignedVariableAction {
            inner,
            start_timestamp,
        }
    }
    // getters
    pub fn get_inner(&self) -> &RustAssignedVariableAction {
        &self.inner
    }
}
