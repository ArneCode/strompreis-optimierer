//! Python bindings for electricity_price_optimizer.
//!
//! This module exposes:
//! - Units (Euro, EuroPerWh, Watt, WattHour) with conversion helpers
//! - Time conversions between chrono DateTime<Utc> and optimizer Time
//! - PrognosesProvider for passing Python closures to Rust
//! - Actions (constant and variable), batteries, optimizer context, and schedules
//!
//! Conventions:
//! - Timestep length: MINUTES_PER_TIMESTEP minutes
//! - Prices: micro-euro per Wh internally (i64)
//! - Power/energy: milli-Wh and milli-Wh per timestep (i64) internally
//! - DateTime values must lie on timestep boundaries (minute % MINUTES_PER_TIMESTEP == 0; seconds/nanoseconds == 0)
mod action;
mod battery;
mod optimizer_context;
mod prognoses;
mod schedule;
pub(crate) mod time_utils;
mod timeseries;
mod units;

use pyo3::{
    Bound, PyResult, Python, pyfunction, pymodule,
    types::{PyModule, PyModuleMethods},
    wrap_pyfunction,
};

use electricity_price_optimizer::schedule::Schedule as RustSchedule;

use crate::action::{
    AssignedConstantAction, AssignedVariableAction, ConstantAction, VariableAction,
};
use crate::battery::{AssignedBattery, Battery};
use crate::optimizer_context::OptimizerContext;
use crate::prognoses::PrognosesProvider;
use crate::schedule::Schedule;
use crate::timeseries::{DataPoint, TimeSeries};
use crate::units::{Euro, register_units_submodule};

#[pyfunction]
/// Run simulated annealing with a given OptimizerContext.
/// Returns total cost in Euro and the resulting Schedule.
fn run_simulated_annealing(
    py: Python<'_>,
    context: &OptimizerContext,
) -> PyResult<(Euro, Schedule)> {
    // 2. Release the GIL for the heavy computation
    println!(
        "Starting simulated annealing optimization. Num constant actions: {}, variable actions: {}, batteries: {}",
        context.get_constant_actions().len(),
        context.get_variable_actions().len(),
        context.get_batteries().len()
    );
    let (cost, rust_schedule) = py.detach(|| -> PyResult<(i64, RustSchedule)> {
        // This closure runs WITHOUT the GIL
        let rust_context = context.to_rust()?;

        Ok(electricity_price_optimizer::simulated_annealing::run_simulated_annealing(rust_context))
    })?;
    Ok((
        Euro::from_nano_euro(cost as f64),
        Schedule::new(rust_schedule, context.get_start_time()),
    ))
}

#[pymodule]
/// Python module initializer. Registers units, classes, and functions.
fn electricity_price_optimizer_py(m: &Bound<'_, PyModule>) -> PyResult<()> {
    // Register units submodule
    register_units_submodule(m)?;
    // Register classes
    m.add_class::<PrognosesProvider>()?;
    m.add_class::<ConstantAction>()?;
    m.add_class::<AssignedConstantAction>()?;
    m.add_class::<VariableAction>()?;
    m.add_class::<AssignedVariableAction>()?;
    m.add_class::<Battery>()?;
    m.add_class::<AssignedBattery>()?;
    m.add_class::<OptimizerContext>()?;
    m.add_class::<Schedule>()?;
    m.add_class::<DataPoint>()?;
    m.add_class::<TimeSeries>()?;

    // Register functions
    m.add_function(wrap_pyfunction!(run_simulated_annealing, m)?)?;

    Ok(())
}
