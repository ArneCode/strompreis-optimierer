use std::collections::HashMap;

use crate::optimizer_context::{
    action::{constant::AssignedConstantAction, variable::AssignedVariableAction},
    battery::AssignedBattery,
    prognoses::Prognoses,
};

/// Represents the final optimized schedule for the smart home.
///
/// A `Schedule` contains the assigned start times for all constant actions,
/// the determined consumption for variable actions, the charge/discharge plan
/// for batteries, and the resulting network consumption prognosis.
#[derive(Debug, Clone)]
pub struct Schedule {
    /// A map of constant actions with their assigned start times.
    pub constant_actions: HashMap<u32, AssignedConstantAction>,
    /// A map of variable actions with their assigned consumption levels.
    pub variable_actions: HashMap<u32, AssignedVariableAction>,
    /// A map of batteries with their planned charge levels over time.
    pub batteries: HashMap<u32, AssignedBattery>,
    /// The resulting prognosis of electricity consumption from the grid.
    pub network_consumption: Prognoses<i64>,
}

impl Schedule {
    /// Creates a new `Schedule`.
    pub fn new(
        constant_actions: HashMap<u32, AssignedConstantAction>,
        variable_actions: HashMap<u32, AssignedVariableAction>,
        batteries: HashMap<u32, AssignedBattery>,
        network_consumption: Prognoses<i64>,
    ) -> Self {
        Self {
            constant_actions,
            variable_actions,
            batteries,
            network_consumption,
        }
    }

    /// Sets the constant actions for the schedule.
    pub fn set_constant_actions(&mut self, actions: HashMap<u32, AssignedConstantAction>) {
        self.constant_actions = actions;
    }

    /// Retrieves a variable action from the schedule by its ID.
    pub fn get_variable_action(&self, id: u32) -> Option<&AssignedVariableAction> {
        self.variable_actions.get(&id)
    }

    /// Retrieves a constant action from the schedule by its ID.
    pub fn get_constant_action(&self, id: u32) -> Option<&AssignedConstantAction> {
        self.constant_actions.get(&id)
    }

    /// Retrieves a battery's state from the schedule by its ID.
    pub fn get_battery(&self, id: u32) -> Option<&AssignedBattery> {
        self.batteries.get(&id)
    }
}
