//! # Core Flow Algorithm
//!
//! This module contains the implementation of the min-cost max-flow algorithm (`MCMF`)
//! and a `wrapper` that provides a more ergonomic, high-level API for building the flow graph.
pub mod MCMF;
pub mod wrapper;
pub use MCMF::MinCostFlow;
pub use wrapper::FlowWrapper;
