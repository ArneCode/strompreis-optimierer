//! Time series types exposed to Python.
//!
//! `DataPoint` pairs a UTC timestamp with an arbitrary Python value.
//! `TimeSeries` collects data points over a bounded interval and supports
//! lookup by timestamp.

use std::fmt::Debug;

use chrono::{DateTime, Utc};
use electricity_price_optimizer::{
    optimizer_context::prognoses::Prognoses,
    time::{Time, TimeIterator},
};
use pyo3::{Bound, IntoPyObject, IntoPyObjectExt, Py, PyAny, PyResult, Python, pyclass, pymethods};

use crate::time_utils::time_to_datetime;

/// A single data point in a time series.
#[pyclass]
pub struct DataPoint {
    #[pyo3(get, set)]
    pub timestamp: DateTime<Utc>,
    #[pyo3(get, set)]
    pub value: Py<PyAny>,
}
impl Clone for DataPoint {
    fn clone(&self) -> Self {
        Python::attach(|py| Self {
            timestamp: self.timestamp,
            value: self.value.clone_ref(py),
        })
    }
}
#[pymethods]
impl DataPoint {
    #[new]
    /// Create a data point with a timestamp and an arbitrary Python value.
    fn new(timestamp: DateTime<Utc>, value: Py<PyAny>) -> Self {
        DataPoint { timestamp, value }
    }
}

/// A time series with explicit start and end bounds.
///
/// Points are expected to be sorted by timestamp in ascending order.
/// `get_value_at` performs a linear scan to find the latest point at or before
/// the requested time, effectively providing step-function interpolation.
#[pyclass]
#[derive(Clone)]
pub struct TimeSeries {
    #[pyo3(get, set)]
    pub start_time: DateTime<Utc>,
    #[pyo3(get, set)]
    pub end_time: DateTime<Utc>,
    #[pyo3(get, set)]
    pub points: Vec<DataPoint>,
}

impl TimeSeries {
    /// Construct a `TimeSeries` from a `Prognoses<T>`, converting each timestep
    /// into a `DataPoint` whose timestamp is derived from `start_time`.
    pub fn from_prognoses<'py, T>(
        py: Python<'py>,
        prognoses: &Prognoses<T>,
        start_time: DateTime<Utc>,
    ) -> PyResult<Self>
    where
        T: Clone + Debug + IntoPyObject<'py>,
    {
        let start = Time::from_timestep(0);
        let end = Time::get_day_end();
        let end_time = time_to_datetime(end, start_time)?;

        let points = (start..end)
            .iter_steps()
            .filter_map(|time| {
                prognoses.get(time).map(|value| {
                    let py_value = value.clone().into_py_any(py)?;
                    let timestamp = time_to_datetime(time, start_time)?;
                    Ok(DataPoint {
                        timestamp,
                        value: py_value,
                    })
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

#[pymethods]
impl TimeSeries {
    #[new]
    /// Create a time series from explicit bounds and a list of data points.
    fn new(start_time: DateTime<Utc>, end_time: DateTime<Utc>, points: Vec<DataPoint>) -> Self {
        TimeSeries {
            start_time,
            end_time,
            points,
        }
    }

    /// Look up the value at a specific time using step-function interpolation.
    ///
    /// Returns `None` if `time` is outside `[start_time, end_time)`.
    /// Otherwise returns the value of the latest data point whose timestamp ≤ `time`.
    fn get_value_at<'py>(
        &self,
        py: Python<'py>,
        time: DateTime<Utc>,
    ) -> PyResult<Option<Bound<'py, PyAny>>> {
        if time < self.start_time || time >= self.end_time {
            return Ok(None);
        }

        // Linear scan: keep the last point that is at or before `time`.
        let mut result: Option<&DataPoint> = None;
        for point in &self.points {
            if point.timestamp <= time {
                result = Some(point);
            } else {
                break; // points are sorted, so no later point can match
            }
        }

        Ok(result.map(|p| p.value.bind(py).clone()))
    }

    /// Return the number of data points in the series.
    fn __len__(&self) -> usize {
        self.points.len()
    }
}
