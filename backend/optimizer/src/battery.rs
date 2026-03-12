//! Python-facing battery types.
//!
//! `Battery` is the user-facing definition (capacity, rates, etc.).
//! `AssignedBattery` is the optimizer's result, exposing the planned charge
//! level and charge/discharge speed at every timestep.

use chrono::{DateTime, Utc};
use electricity_price_optimizer::{
    optimizer_context::{
        battery::{AssignedBattery as RustAssignedBattery, Battery as RustBattery},
        prognoses::Prognoses,
    },
    time::{Time, TimeIterator},
};
use pyo3::{PyResult, Python, exceptions::PyValueError, pyclass, pymethods};

use crate::time_utils::{datetime_to_time, time_to_datetime};
use crate::timeseries::{DataPoint, TimeSeries};
use crate::units::{Watt, WattHour};

#[pyclass]
#[derive(Clone)]
/// Battery definition with capacity, charge/discharge limits, and initial state.
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
    /// Create a battery definition with the given parameters.
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
    /// Convert to the internal `RustBattery`.
    ///
    /// Efficiency is currently hard-coded to 1.0 (lossless).
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
/// An optimizer-assigned battery exposing charge level and charge speed over
/// the scheduling horizon.
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
    /// Get the charge speed (power flowing into or out of the battery) at a
    /// given time.
    ///
    /// Computed as the difference in charge level between the current and the
    /// next timestep.  Positive means charging, negative means discharging.
    /// Returns 0 W at end-of-day since there is no next timestep.
    fn get_charge_speed(&self, time: DateTime<Utc>) -> PyResult<Watt> {
        let time_converted = datetime_to_time(time, self.start_timestamp)?;
        let next_time = time_converted.get_next_timestep();
        let curr_level = if let Some(level) = self.inner.get_charge_level(time_converted) {
            *level
        } else {
            return Err(PyValueError::new_err(
                "Time out of range for battery charge level FIXME",
            ));
        };
        // At end-of-day there is no next timestep, so we report zero speed
        let next_level = if let Some(level) = self.inner.get_charge_level(next_time) {
            *level
        } else if next_time == Time::get_day_end() {
            0
        } else {
            return Err(PyValueError::new_err(
                "Time out of range for battery charge level FIXME",
            ));
        };

        // delta > 0 → charging, delta < 0 → discharging
        let delta_charge = next_level - curr_level;
        Ok(Watt::from_milli_watt_hour_per_timestep(delta_charge as f64))
    }
    /// Get battery ID.
    fn get_id(&self) -> u32 {
        self.inner.get_battery().get_id()
    }

    /// Get the charge level over the full day as a `TimeSeries` of `WattHour` values.
    fn get_charge_level_time_series<'py>(&self, py: Python<'py>) -> PyResult<TimeSeries> {
        let prognoses = Prognoses::from_closure(|t| {
            self.inner
                .get_charge_level(t)
                .map(|level| WattHour::from_milli_wh(*level as f64))
        });
        TimeSeries::from_prognoses(py, &prognoses, self.start_timestamp)
    }

    /// Get the charge speed over the full day as a `TimeSeries` of `Watt` values.
    fn get_charge_speed_time_series<'py>(&self, py: Python<'py>) -> PyResult<TimeSeries> {
        let prognoses = Prognoses::from_closure(|time| {
            let curr_level = *self.inner.get_charge_level(time)?;
            let next_time = time.get_next_timestep();
            // At end-of-day there is no next timestep; treat level as 0
            let next_level = if let Some(level) = self.inner.get_charge_level(next_time) {
                *level
            } else if next_time == Time::get_day_end() {
                0
            } else {
                return None;
            };
            let delta = next_level - curr_level;
            Some(Watt::from_milli_watt_hour_per_timestep(delta as f64))
        });
        TimeSeries::from_prognoses(py, &prognoses, self.start_timestamp)
    }
}
impl AssignedBattery {
    /// Wrap a Rust `AssignedBattery` with a start timestamp for datetime conversion.
    pub fn new(inner: RustAssignedBattery, start_timestamp: DateTime<Utc>) -> Self {
        AssignedBattery {
            inner,
            start_timestamp,
        }
    }
    /// Access the underlying Rust assigned battery.
    pub fn get_inner(&self) -> &RustAssignedBattery {
        &self.inner
    }
}
