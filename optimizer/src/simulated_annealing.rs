//! Python bindings for the simulated annealing optimizer.
//!
//! This module provides the `run_simulated_annealing` function and its `SimulatedAnnealingSettings`.

use crate::optimizer_context::OptimizerContext;
use crate::schedule::Schedule;
use crate::units::Euro;
use electricity_price_optimizer::schedule::Schedule as RustSchedule;
use electricity_price_optimizer::simulated_annealing::SimulatedAnnealingSettings as RustSimulatedAnnealingSettings;
use pyo3::{PyResult, Python, pyclass, pyfunction, pymethods};

#[pyclass]
#[derive(Clone)]
/// Settings for the simulated annealing algorithm.
pub struct SimulatedAnnealingSettings {
    /// The starting temperature for the annealing process.
    #[pyo3(get, set)]
    pub initial_temperature: f64,
    /// The rate at which the temperature decreases.
    #[pyo3(get, set)]
    pub cooling_rate: f64,
    /// The temperature at which the algorithm stops.
    #[pyo3(get, set)]
    pub final_temperature: f64,
    /// Influences much constant actions are moved in each simulated annealing step (higher means more movement).
    #[pyo3(get, set)]
    pub constant_action_move_factor: f64,
    /// Number of moves to attempt at each temperature step.
    #[pyo3(get, set)]
    pub num_moves_per_step: usize,
}

#[pymethods]
impl SimulatedAnnealingSettings {
    #[new]
    #[pyo3(signature = (
        initial_temperature=40.0,
        cooling_rate=0.95,
        final_temperature=0.1,
        constant_action_move_factor=30.0,
        num_moves_per_step=2
    ))]
    /// Creates a new instance of SimulatedAnnealingSettings.
    ///
    /// Args:
    ///     initial_temperature (float): The starting temperature for the annealing process.
    ///     cooling_rate (float): The rate at which the temperature decreases.
    ///     final_temperature (float): The temperature at which the algorithm stops.
    ///     constant_action_move_factor (float): Influences much constant actions are moved in each simulated annealing step (higher means more movement).
    ///     num_moves_per_step (int): Number of moves to attempt at each temperature step.
    fn new(
        initial_temperature: f64,
        cooling_rate: f64,
        final_temperature: f64,
        constant_action_move_factor: f64,
        num_moves_per_step: usize,
    ) -> Self {
        Self {
            initial_temperature,
            cooling_rate,
            final_temperature,
            constant_action_move_factor,
            num_moves_per_step,
        }
    }
}

impl From<SimulatedAnnealingSettings> for RustSimulatedAnnealingSettings {
    fn from(settings: SimulatedAnnealingSettings) -> Self {
        Self {
            initial_temperature: settings.initial_temperature,
            cooling_rate: settings.cooling_rate,
            final_temperature: settings.final_temperature,
            constant_action_move_factor: settings.constant_action_move_factor,
            num_moves_per_step: settings.num_moves_per_step,
        }
    }
}

#[pyfunction]
/// Run simulated annealing with a given OptimizerContext.
/// Returns total cost in Euro and the resulting Schedule.
pub fn run_simulated_annealing(
    py: Python<'_>,
    context: &OptimizerContext,
    settings: SimulatedAnnealingSettings,
) -> PyResult<(Euro, Schedule)> {
    // 2. Release the GIL for the heavy computation
    println!(
        "Starting simulated annealing optimization. Num constant actions: {}, variable actions: {}, batteries: {}",
        context.get_constant_actions().len(),
        context.get_variable_actions().len(),
        context.get_batteries().len()
    );
    let rust_settings = settings.into();
    let (cost, rust_schedule) = py.detach(|| -> PyResult<(i64, RustSchedule)> {
        // This closure runs WITHOUT the GIL
        let rust_context = context.to_rust()?;

        Ok(
            electricity_price_optimizer::simulated_annealing::run_simulated_annealing(
                rust_context,
                rust_settings,
            ),
        )
    })?;
    Ok((
        Euro::from_nano_euro(cost as f64),
        Schedule::new(
            rust_schedule,
            context.get_past_constant_actions().clone(),
            context.get_start_time(),
        ),
    ))
}
