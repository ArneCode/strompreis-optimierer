//! # Flow Optimizer Submodule
//!
//! This module provides the building blocks for the min-cost max-flow algorithm,
//! separating the core flow logic from the smart home model representation.
pub mod flow;

use crate::algorithm::flow::flow_optimizer::flow::FlowWrapper;
