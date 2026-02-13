//! # Electricity Price Optimizer
//!
//! This library provides tools for optimizing electricity consumption in a smart home
//! environment. It uses techniques like simulated annealing to schedule controllable
//! devices (actions) and manage battery storage to minimize electricity costs based on
//! price prognoses.
//!
//! ## Key Modules
//!
//! - `optimizer_context`: Defines the data structures for the optimization problem,
//!   including prognoses, actions, and batteries.
//! - `optimizer`: Implements a flow-based optimization model (min-cost max-flow)
//!   to determine the optimal usage of variable actions and batteries.
//! - `simulated_annealing`: Contains the implementation of the simulated annealing
//!   optimization algorithm for scheduling constant actions.
//! - `schedule`: Defines the `Schedule` struct, which represents the final optimized
//!   plan for electricity usage.
//! - `time`: Provides time-related utilities for handling timesteps.

use crate::{optimizer_context::OptimizerContext, schedule::Schedule};

mod helper;
pub mod optimizer;
pub mod optimizer_context;
pub mod schedule;
pub mod simulated_annealing;
pub mod time;
