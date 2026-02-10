use chrono::{DateTime, Utc};
use electricity_price_optimizer::{
    optimizer_context::battery::{AssignedBattery as RustAssignedBattery, Battery as RustBattery},
    time::Time,
};
use pyo3::{PyResult, Python, exceptions::PyValueError, pyclass, pymethods};

use crate::time_utils::datetime_to_time;
use crate::units::{Watt, WattHour};

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
    pub fn to_rust(&self) -> RustBattery {
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
impl AssignedBattery {
    pub fn new(inner: RustAssignedBattery, start_timestamp: DateTime<Utc>) -> Self {
        AssignedBattery {
            inner,
            start_timestamp,
        }
    }
    // getters
    pub fn get_inner(&self) -> &RustAssignedBattery {
        &self.inner
    }
}
