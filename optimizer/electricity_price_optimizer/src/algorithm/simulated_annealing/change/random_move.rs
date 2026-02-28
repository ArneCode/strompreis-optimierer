use crate::{
    algorithm::simulated_annealing::{
        change::{Change, random_helpers::sample_centered_int},
        state::State,
    },
    time::Time,
};
use rand::{Rng, seq::IndexedRandom};

/// Represents a change where a constant action's start time is moved.
///
/// This struct holds the necessary information to apply and undo a move
/// of a single `ConstantAction` to a new, random start time.
pub struct RandomMoveChange {
    action_id: u32,
    old_time: Time,
    new_time: Time,
}
impl Change for RandomMoveChange {
    /// Applies the move to the given state.
    ///
    /// This removes the action with the old start time and adds it back
    /// with the new start time.
    fn apply(&self, state: &mut State) {
        let old_action = state.remove_constant_action(self.action_id).unwrap();
        let new_action = old_action
            .get_action()
            .clone()
            .with_start_time(self.new_time);
        state.add_constant_action(new_action);

        // println!(
        //     "Moved action {} from {:?} to {:?}",
        //     self.action_id, self.old_time, self.new_time
        // );
    }
    /// Undoes the move on the given state.
    ///
    /// This reverts the action to its original start time.
    fn undo(&self, state: &mut State) {
        let new_action = state.remove_constant_action(self.action_id).unwrap();
        let old_action = new_action
            .get_action()
            .clone()
            .with_start_time(self.old_time);
        state.add_constant_action(old_action);

        // println!(
        //     "Reverted action {} from {:?} to {:?}",
        //     self.action_id, self.new_time, self.old_time
        // );
    }
}

impl RandomMoveChange {
    /// Creates a new `RandomMoveChange` for a randomly selected constant action.
    ///
    /// A constant action is chosen at random from the state. A new start time is
    /// then sampled from a normal distribution centered around the old start time,
    /// ensuring the new time is within the action's allowed bounds.
    ///
    /// # Arguments
    /// * `rng` - A random number generator.
    /// * `state` - The current state to select an action from.
    /// * `sigma` - The standard deviation for the normal distribution used to sample the new time.
    pub fn new_random<R: Rng>(rng: &mut R, state: &State, sigma: f64) -> Self {
        let constant_action_ids = state.get_constant_action_ids();
        let action_id = constant_action_ids
            .choose(rng)
            .expect("No constant actions available")
            .clone();

        let action = state.get_constant_action(action_id);

        // Work entirely in Timestep units
        let old_step = action.get_start_time().to_timestep();
        let start_bound = action.get_start_from().to_timestep();

        // Calculate the last possible valid timestep for start
        // Duration is converted to total timesteps
        let duration_steps = action.get_action().duration.to_timestep();
        let end_bound = action
            .get_end_before()
            .to_timestep()
            .saturating_sub(duration_steps);

        let mut new_step = old_step;
        let mut attempts = 0;

        // Try sampling based on Sigma first
        while new_step == old_step && attempts < 3 {
            new_step = sample_centered_int(
                start_bound as u32,
                end_bound as u32,
                old_step as u32,
                sigma,
                rng,
            );
            attempts += 1;
        }

        // FALLBACK: If we failed 3 times (sigma is too low), force a +/- 1 step move
        if new_step == old_step {
            let can_move_up = old_step < end_bound;
            let can_move_down = old_step > start_bound;

            new_step = match (can_move_up, can_move_down) {
                (true, true) => {
                    if rng.random_bool(0.5) {
                        old_step + 1
                    } else {
                        old_step - 1
                    }
                }
                (true, false) => old_step + 1,
                (false, true) => old_step - 1,
                (false, false) => old_step, // Action is locked (window == duration)
            };
        }

        Self {
            action_id,
            old_time: Time::from_timestep(old_step),
            new_time: Time::from_timestep(new_step),
        }
    }
}
