use std::fmt::Debug;

use chrono::{DateTime, Utc};
use electricity_price_optimizer::{optimizer_context::prognoses::Prognoses, time::Time};
use pyo3::{Py, PyAny, PyErr, PyResult, Python, prelude::FromPyObjectOwned, pyclass, pymethods};

use crate::time_utils::time_to_datetime;

#[pyclass]
/// Provides prognoses data through a Python callable returning values for a time interval.
/// The callable signature must be: get_data(curr: DateTime[UTC], next: DateTime[UTC]) -> T.
/// T must be extractable from Python (e.g., EuroPerWh or i64).
pub struct PrognosesProvider {
    get_data: Py<PyAny>,
}

#[pymethods]
impl PrognosesProvider {
    #[new]
    /// Create a new provider with a Python callable that returns data for a given interval.
    fn new(get_data: Py<PyAny>) -> Self {
        PrognosesProvider { get_data }
    }
}

impl PrognosesProvider {
    /// Create a Prognoses<T> from the Python callable, invoked per timestep interval [t, t+1).
    /// T must implement FromPyObjectOwned. Errors propagate from Python callable or extraction.
    pub fn get_prognoses<'py, T: Clone + Debug + Default + FromPyObjectOwned<'py>>(
        &self,
        py: Python<'py>,
        start_time: DateTime<Utc>,
    ) -> Result<Prognoses<T>, PyErr> {
        Prognoses::from_closure_result(|t: Time| {
            let curr_t = time_to_datetime(t, start_time)?;
            let next_t = time_to_datetime(t.get_next_timestep(), start_time)?;
            let result = self.get_data.call1(py, (curr_t, next_t))?;
            result.extract::<T>(py).map_err(Into::into)
        })
    }
}
