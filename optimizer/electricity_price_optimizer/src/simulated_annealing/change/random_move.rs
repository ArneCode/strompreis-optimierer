use crate::{
    simulated_annealing::{
        change::{Change, random_helpers::sample_centered_int},
        state::State,
    },
    time::Time,
};
use rand::{Rng, seq::IndexedRandom};

pub struct RandomMoveChange {
    action_id: u32,
    old_time: Time,
    new_time: Time,
}
impl Change for RandomMoveChange {
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
    fn undo(&self, state: &mut State) {
        let new_action = state.remove_constant_action(self.action_id).unwrap();
        let old_action = new_action
            .get_action()
            .clone()
            .with_start_time(self.old_time);
        state.add_constant_action(old_action);

        println!(
            "Reverted action {} from {:?} to {:?}",
            self.action_id, self.new_time, self.old_time
        );
    }
}

impl RandomMoveChange {
    pub fn new_random<R: Rng>(rng: &mut R, state: &State, sigma: f64) -> Self {
        // let constant_actions = state.get_constant_actions();
        // let action_index = rng.random_range(0..constant_actions.len());
        // let action = &constant_actions[action_index];
        // let action_ref = action.get_action();
        // let old_time = action.get_start_time().get_minutes() as u32;
        // let start_bound = action_ref.get_start_from().get_minutes() as u32;
        // let end_bound =
        //     (action_ref.get_end_before().get_minutes() - action_ref.duration.get_minutes()) as u32;
        // let mut new_time = old_time;
        // while new_time == old_time {
        //     new_time = sample_centered_int(start_bound, end_bound, old_time, sigma, rng);
        // }
        // Self {
        //     action_index,
        //     old_time: Time::new(0, old_time),
        //     new_time: Time::new(0, new_time),
        // }
        // new version
        let constant_action_ids = state.get_constant_action_ids();
        let action_id = constant_action_ids
            .choose(rng)
            .expect("No constant actions available")
            .clone();
        let action = state.get_constant_action(action_id);
        let old_time = action.get_start_time().get_minutes() as u32;
        let start_bound = action.get_start_from().get_minutes() as u32;
        let end_bound = (action.get_end_before().get_minutes()
            - action.get_action().duration.get_minutes()) as u32;

        let mut new_time = old_time;
        while new_time == old_time {
            new_time = sample_centered_int(start_bound, end_bound, old_time, sigma, rng);
        }
        Self {
            action_id,
            old_time: Time::new(0, old_time),
            new_time: Time::new(0, new_time),
        }
    }
}
