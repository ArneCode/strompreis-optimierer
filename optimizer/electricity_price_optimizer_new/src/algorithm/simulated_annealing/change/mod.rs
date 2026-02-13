//! Defines the `Change` trait and its implementations.
//!
//! In the context of simulated annealing, a "change" or "move" is an operation
//! that transforms one state into a neighboring state. This module provides the
//! generic `Change` trait and specific implementations like `RandomMoveChange`
//! and `MultiChange`.

pub mod multi_change;
mod random_helpers;
mod random_move;
use crate::algorithm::simulated_annealing::state::State;

/// A trait representing a reversible change to a `State`.
///
/// Implementors of this trait define a specific transformation that can be
/// applied to a state and subsequently undone.
pub trait Change {
    /// Applies the change to the given state.
    fn apply(&self, state: &mut State);
    /// Undoes the change on the given state, reverting it to its previous condition.
    fn undo(&self, state: &mut State);
}
