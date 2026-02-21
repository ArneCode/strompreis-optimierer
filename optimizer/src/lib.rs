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
mod simulated_annealing;
pub(crate) mod time_utils;
mod timeseries;
mod units;

use pyo3::{
    Bound, PyResult, pymodule,
    types::{PyModule, PyModuleMethods},
    wrap_pyfunction,
};

use crate::action::{
    AssignedConstantAction, AssignedVariableAction, ConstantAction, VariableAction,
};
use crate::battery::{AssignedBattery, Battery};
use crate::optimizer_context::OptimizerContext;
use crate::prognoses::PrognosesProvider;
use crate::schedule::Schedule;
use crate::simulated_annealing::{SimulatedAnnealingSettings, run_simulated_annealing};
use crate::timeseries::{DataPoint, TimeSeries};
use crate::units::register_units_submodule;

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
    m.add_class::<SimulatedAnnealingSettings>()?;

    // Register functions
    m.add_function(wrap_pyfunction!(run_simulated_annealing, m)?)?;

    Ok(())
}
