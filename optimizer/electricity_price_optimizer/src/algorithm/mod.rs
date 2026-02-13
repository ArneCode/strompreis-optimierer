//! Algorithm collection
//!
//! This module groups algorithm implementations used by the crate. It exposes
//! flow-based optimizers and simulated annealing implementations under
//! `algorithm::flow` and `algorithm::simulated_annealing` respectively.

pub mod flow;
pub mod simulated_annealing;

// Re-exports for convenience (optional).
pub use simulated_annealing::run_simulated_annealing;
