use std::collections::{HashMap, HashSet};

use crate::{
    algorithm::flow::{SmartHomeFlow, SmartHomeFlowBuilder},
    optimizer_context::{
        OptimizerContext,
        action::{
            constant::{self, AssignedConstantAction},
            variable::VariableAction,
        },
    },
    schedule::Schedule,
    time::Time,
};

/// Represents a state in the simulated annealing algorithm.
///
/// A `State` encapsulates a specific configuration of the smart home schedule,
/// including the start times of constant actions and the resulting electricity flow.
pub struct State {
    constant_actions: HashMap<u32, AssignedConstantAction>,
    constant_action_ids: Vec<u32>,

    smart_home_flow: SmartHomeFlow,
}

impl State {
    /// Creates a new `State` with a random initial configuration.
    ///
    /// The start times for constant actions are chosen randomly within their allowed bounds.
    pub fn new_random<R: rand::Rng>(context: OptimizerContext, rng: &mut R) -> Self {
        let constant_actions: HashMap<u32, AssignedConstantAction> = context
            .get_constant_actions()
            .iter()
            .map(|action| {
                let start_bound = action.get_start_from().to_timestep();
                let end_bound =
                    action.get_end_before().to_timestep() - action.duration.to_timestep();
                let random_start_step = rng.random_range(start_bound..=end_bound);
                (
                    action.get_id(),
                    AssignedConstantAction::new(
                        action.clone(),
                        Time::from_timestep(random_start_step),
                    ),
                )
            })
            .collect();
        let mut smart_home_flow = SmartHomeFlowBuilder::new(
            context.get_generated_electricity(),
            context.get_electricity_price(),
            context.get_beyond_control_consumption(),
            context.get_first_timestep_fraction(),
        )
        .add_batteries(context.get_batteries())
        .add_actions(context.get_variable_actions())
        .build();

        for (_, action) in constant_actions.iter() {
            smart_home_flow.add_constant_consumption(action.clone());
        }

        let constant_action_ids = constant_actions.keys().cloned().collect();

        Self {
            constant_actions,
            constant_action_ids,
            smart_home_flow,
        }
    }
    /// Adds a constant action to the state.
    ///
    /// This updates both the internal list of constant actions and the smart home flow.
    pub fn add_constant_action(&mut self, action: AssignedConstantAction) {
        self.smart_home_flow
            .add_constant_consumption(action.clone());
        self.constant_actions.insert(action.get_id(), action);
    }
    /// Removes a constant action from the state by its ID.
    ///
    /// This updates both the internal list of constant actions and the smart home flow.
    /// Returns the removed action if it existed.
    pub fn remove_constant_action(&mut self, action_id: u32) -> Option<AssignedConstantAction> {
        self.constant_actions.remove(&action_id);
        self.smart_home_flow.remove_constant_consumption(action_id)
    }

    /// Gets a reference to a constant action by its ID.
    ///
    /// # Panics
    /// Panics if the action ID is not found.
    pub fn get_constant_action(&self, action_id: u32) -> &AssignedConstantAction {
        self.constant_actions.get(&action_id).unwrap()
    }

    /// Gets a reference to the vector of constant action IDs.
    pub fn get_constant_action_ids(&self) -> &Vec<u32> {
        &self.constant_action_ids
    }

    /// Calculates and returns the total cost of the current state.
    pub fn get_cost(&mut self) -> i64 {
        self.smart_home_flow.get_cost()
    }

    /// Generates a `Schedule` from the current state.
    pub fn get_schedule(&mut self) -> Schedule {
        let mut schedule = self.smart_home_flow.get_schedule();
        schedule.set_constant_actions(self.constant_actions.clone());
        schedule
    }
    // pub fn to_fixed_context(&self) -> OptimizerContext {
    //     let mut new_context = self.context.clone();
    //     for action in &self.constant_actions {
    //         new_context.add_constant_action_to_consumption(action);
    //     }
    //     new_context
    // }
}
