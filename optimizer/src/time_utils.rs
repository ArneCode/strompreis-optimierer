//! Conversion utilities between `chrono::DateTime<Utc>` and the optimizer's
//! internal `Time` representation.
//!
//! The optimizer works in discrete timesteps of `MINUTES_PER_TIMESTEP` minutes.
//! These helpers translate wall-clock datetimes into that discrete domain and
//! back, enforcing alignment to timestep boundaries where required.

use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};
use electricity_price_optimizer::time::{MINUTES_PER_TIMESTEP, Time};
use pyo3::{PyErr, PyResult, exceptions::PyValueError};

/// Convert optimizer `Time` to a `DateTime<Utc>`, aligned to the timestep
/// boundary relative to `start_time`.
///
/// The result is rounded *down* to the nearest timestep and is guaranteed to
/// be ≥ `start_time`.
pub fn time_to_datetime(time: Time, start_time: DateTime<Utc>) -> PyResult<DateTime<Utc>> {
    let start_ns = start_time
        .timestamp_nanos_opt()
        .expect("Timestamp out of range");

    let ns_per_minute: i64 = 60 * 1_000_000_000;
    let interval_ns = MINUTES_PER_TIMESTEP as i64 * ns_per_minute;

    // Offset from start in nanoseconds corresponding to `time.get_minutes()`
    let added_ns = time.get_minutes() as i64 * ns_per_minute;
    let target_ns = start_ns + added_ns;

    // Snap down to the nearest clean interval boundary
    let rounded_ns = target_ns - (target_ns % interval_ns);

    // Never produce a result before the start
    let res_ns = rounded_ns.max(start_ns);
    let result = Utc.timestamp_nanos(res_ns);

    Ok(result)
}

/// Validate that `dt` sits exactly on a timestep boundary relative to
/// `start_time`.
///
/// A boundary is defined as a datetime whose minute is a multiple of
/// `MINUTES_PER_TIMESTEP` and whose seconds and sub-second components are zero.
pub fn check_on_timestep_boundary(dt: DateTime<Utc>, start_time: DateTime<Utc>) -> PyResult<()> {
    if dt < start_time {
        return Err(PyValueError::new_err(format!(
            "DateTime {} is before start time {}",
            dt, start_time
        )));
    }
    if dt == start_time {
        return Ok(()); // start_time itself is always considered valid
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

/// Convert a `DateTime<Utc>` back to an optimizer `Time`.
///
/// `dt` is assumed to be on a timestep boundary (call
/// `check_on_timestep_boundary` first).  The returned `Time` is expressed in
/// timesteps relative to `start_time`.
pub fn datetime_to_time(dt: DateTime<Utc>, start_time: DateTime<Utc>) -> Result<Time, PyErr> {
    if dt == start_time {
        return Ok(Time::from_timestep(0));
    }
    if dt < start_time {
        return Err(PyValueError::new_err(format!(
            "DateTime {} is before start time {}",
            dt, start_time
        )));
    }
    // Find the latest datetime ≤ start_time that is on a clean timestep boundary.
    // This serves as the reference point for counting timesteps.
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

    // Count whole timesteps between base_dt and dt
    let duration = dt.signed_duration_since(base_dt);
    let total_minutes = duration.num_minutes() as u32;
    let timesteps = total_minutes / MINUTES_PER_TIMESTEP;
    let result = Time::from_timestep(timesteps);
    Ok(result)
}
