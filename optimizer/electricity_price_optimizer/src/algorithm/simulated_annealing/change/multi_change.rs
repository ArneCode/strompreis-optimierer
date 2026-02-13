//! Defines `MultiChange`, a mechanism for bundling multiple `Change`s into a single operation.
use crate::algorithm::simulated_annealing::{
    change::{Change, random_move::RandomMoveChange},
    state::State,
};

/// Represents a collection of multiple `Change` operations.
///
/// This allows for applying and undoing a sequence of changes as a single atomic unit.
pub struct MultiChange {
    changes: Vec<Box<dyn Change>>,
}

impl Change for MultiChange {
    /// Applies all contained changes to the state in order.
    fn apply(&self, state: &mut State) {
        for change in &self.changes {
            change.apply(state);
        }
    }

    /// Undoes all contained changes on the state in reverse order.
    fn undo(&self, state: &mut State) {
        for change in self.changes.iter().rev() {
            change.undo(state);
        }
    }
}

impl MultiChange {
    /// Creates a new `MultiChange` containing a specified number of random `RandomMoveChange`s.
    ///
    /// # Arguments
    /// * `rng` - A random number generator.
    /// * `state` - The current state, used to generate valid random moves.
    /// * `random_move_sigma` - The standard deviation for the random moves.
    /// * `num_changes` - The number of random moves to include in this `MultiChange`.
    pub fn new_random<R: rand::Rng>(
        rng: &mut R,
        state: &State,
        random_move_sigma: f64,
        num_changes: usize,
    ) -> Self {
        let mut changes: Vec<Box<dyn Change>> = Vec::new();
        for _ in 0..num_changes {
            let change = RandomMoveChange::new_random(rng, state, random_move_sigma);
            changes.push(Box::new(change));
        }
        Self { changes }
    }
}
