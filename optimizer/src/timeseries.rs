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
    fn new(timestamp: DateTime<Utc>, value: Py<PyAny>) -> Self {
        DataPoint { timestamp, value }
    }
}

/// A time series with explicit start and end bounds.
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
    fn new(start_time: DateTime<Utc>, end_time: DateTime<Utc>, points: Vec<DataPoint>) -> Self {
        TimeSeries {
            start_time,
            end_time,
            points,
        }
    }

    fn get_value_at<'py>(
        &self,
        py: Python<'py>,
        time: DateTime<Utc>,
    ) -> PyResult<Option<Bound<'py, PyAny>>> {
        if time < self.start_time || time >= self.end_time {
            return Ok(None);
        }

        let mut result: Option<&DataPoint> = None;
        for point in &self.points {
            if point.timestamp <= time {
                result = Some(point);
            } else {
                break;
            }
        }

        Ok(result.map(|p| p.value.bind(py).clone()))
    }

    fn __len__(&self) -> usize {
        self.points.len()
    }
}
