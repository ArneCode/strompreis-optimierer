//! Conversion utilities between `chrono::DateTime<Utc>` and the optimizer's
//! internal `Time` representation.
//!
//! The optimizer works in discrete timesteps of `MINUTES_PER_TIMESTEP` minutes.
//! These helpers translate wall-clock datetimes into that discrete domain and
//! back, enforcing alignment to timestep boundaries where required.

use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};
use electricity_price_optimizer::time::{MINUTES_PER_TIMESTEP, Time};
use pyo3::{PyErr, PyResult, exceptions::PyValueError};

/// Convert optimizer `Time` to a `DateTime<Utc>`.
///
/// This function calculates the datetime at which the given `time` occurs,
/// relative to a specified `start_time`.
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
/// `start_time` itself is always considered valid, even if it doesn't meet these criteria.
/// because it's timestep 0, which doesn't have to be aligned to a boundary.
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
/// finds the first timestep boundary at or before `dt` and returns the time corresponding to that boundary.
/// This ensures that any datetime within a given timestep maps to the same `Time` value.
/// If `dt` is before `start_time`, an error is returned. If `dt` is exactly equal to `start_time`, Time(0) is returned.
///
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, TimeZone};

    fn dt(year: i32, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(year, month, day, hour, min, sec)
            .single()
            .unwrap()
    }

    #[test]
    fn test_time_to_datetime() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let time = Time::from_timestep(3); // 3 * MINUTES_PER_TIMESTEP
        let expected = start + Duration::minutes(3 * MINUTES_PER_TIMESTEP as i64);
        let result = time_to_datetime(time, start).unwrap();
        assert_eq!(result, expected);
    }
    // test time_to datetime with a start time that is not on a boundary
    #[test]
    fn test_time_to_datetime_non_boundary_start() {
        let base = dt(2024, 1, 1, 0, 0, 0);
        let start = base + Duration::seconds(30); // 30 seconds after the base, not on a boundary
        let time = Time::from_timestep(2); // 2 * MINUTES_PER_TIMESTEP
        let expected = base + Duration::minutes(2 * MINUTES_PER_TIMESTEP as i64); // should snap to the nearest boundary
        let result = time_to_datetime(time, start).unwrap();
        assert_eq!(result, expected);
    }
    // test timestep 0 with a non-boundary start time
    #[test]
    fn test_time_to_datetime_timestep_zero_non_boundary_start() {
        let base = dt(2024, 1, 1, 0, 0, 0);
        let start = base + Duration::seconds(30); // 30 seconds after the base, not on a boundary
        let time = Time::from_timestep(0); // timestep 0 should return the start time itself
        let expected = start; // should return the start time itself
        let result = time_to_datetime(time, start).unwrap();
        assert_eq!(result, expected);
    }

    // test datetime_to_time with a datetime that is exactly on a boundary
    #[test]
    fn test_datetime_to_time_on_boundary() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start + Duration::minutes(2 * MINUTES_PER_TIMESTEP as i64); // exactly on a boundary
        let expected = Time::from_timestep(2);
        let result = datetime_to_time(dt, start).unwrap();
        assert_eq!(result, expected);
    }

    // test datetime_to_time with a datetime that is not on a boundary
    #[test]
    fn test_datetime_to_time_not_on_boundary() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start + Duration::minutes(2 * MINUTES_PER_TIMESTEP as i64) + Duration::seconds(30); // not on a boundary
        let expected = Time::from_timestep(2); // should snap down to the nearest boundary
        let result = datetime_to_time(dt, start).unwrap();
        assert_eq!(result, expected);
    }

    // test datetime_to_time with a datetime before the start time
    #[test]
    fn test_datetime_to_time_before_start() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start - Duration::minutes(10); // before the start time
        let result = datetime_to_time(dt, start);
        assert!(result.is_err());
    }

    // test datetime_to_time with a datetime exactly equal to the start time
    #[test]
    fn test_datetime_to_time_equal_to_start() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start; // exactly equal to the start time
        let expected = Time::from_timestep(0); // should return Time(0)
        let result = datetime_to_time(dt, start).unwrap();
        assert_eq!(result, expected);
    }

    // test check_on_timestep_boundary with a datetime that is on a boundary
    #[test]
    fn test_check_on_timestep_boundary_on_boundary() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start + Duration::minutes(2 * MINUTES_PER_TIMESTEP as i64); // on a boundary
        let result = check_on_timestep_boundary(dt, start);
        assert!(result.is_ok());
    }

    // test check_on_timestep_boundary with a datetime that is not on a boundary
    #[test]
    fn test_check_on_timestep_boundary_not_on_boundary() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start + Duration::minutes(2 * MINUTES_PER_TIMESTEP as i64) + Duration::seconds(30); // not on a boundary
        let result = check_on_timestep_boundary(dt, start);
        assert!(result.is_err());
    }

    // test check_on_timestep_boundary with a datetime before the start time
    #[test]
    fn test_check_on_timestep_boundary_before_start() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start - Duration::minutes(10); // before the start time
        let result = check_on_timestep_boundary(dt, start);
        assert!(result.is_err());
    }

    // test check_on_timestep_boundary with a datetime exactly equal to the start time
    #[test]
    fn test_check_on_timestep_boundary_equal_to_start() {
        let start = dt(2024, 1, 1, 0, 0, 0);
        let dt = start; // exactly equal to the start time
        let result = check_on_timestep_boundary(dt, start);
        assert!(result.is_ok()); // should be considered valid
    }

    use electricity_price_optimizer::time::STEPS_PER_DAY;
    use proptest::prelude::*;
    proptest! {
        #[test]
        fn test_roundtrip_time_to_datetime(
                        // Generate random timesteps between 0 and TIMESTEPS_PER_DAY (to avoid overflow)
                        timestep in 0..STEPS_PER_DAY as u32,
        ) {
            let start = dt(2024, 1, 1, 0, 0, 0);
            let time = Time::from_timestep(timestep);
            let datetime = time_to_datetime(time, start).unwrap();
            let time_converted_back = datetime_to_time(datetime, start).unwrap();
            prop_assert_eq!(time, time_converted_back);
        }

    }
}
