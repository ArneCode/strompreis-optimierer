use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};
use electricity_price_optimizer::time::{MINUTES_PER_TIMESTEP, Time};
use pyo3::{PyErr, PyResult, exceptions::PyValueError};

/// Convert optimizer Time to a DateTime<Utc>, aligned to the timestep boundary relative to start_time.
/// Rounds down to the nearest timestep and never before start_time.
pub fn time_to_datetime(time: Time, start_time: DateTime<Utc>) -> PyResult<DateTime<Utc>> {
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
pub fn check_on_timestep_boundary(dt: DateTime<Utc>, start_time: DateTime<Utc>) -> PyResult<()> {
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
