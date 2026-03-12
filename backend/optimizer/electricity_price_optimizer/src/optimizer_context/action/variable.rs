use std::{
    ops::{Deref, DerefMut},
    panic,
    rc::Rc,
    sync::Arc,
};

use crate::time::Time;

/// A variable action that consumes a total amount of energy within specified time bounds, with a maximum consumption limit per timestep.
#[derive(Debug, Clone)]
pub struct VariableAction {
    /// The earliest time the action can start.
    pub start: Time,
    /// The latest time the action must end.
    pub end: Time,
    /// The total consumption amount of the action.
    pub total_consumption: i64,
    /// The maximum consumption amount of the action for every timestep.
    pub max_consumption: i64,
    /// The unique identifier for the action.
    id: u32,
}

impl VariableAction {
    /// Creates a new VariableAction.
    ///
    /// # Arguments
    /// * `start` - The earliest time the action can start.
    /// * `end` - The latest time the action must end.
    /// * `total_consumption` - The total consumption amount of the action.
    /// * `max_consumption` - The maximum consumption amount of the action for every timestep.
    /// * `id` - The unique identifier for the action.
    /// # Panics
    /// * Panics if the time bounds are invalid (i.e., if start >= end).
    /// # Returns
    /// * A new VariableAction instance.
    pub fn new(
        start: Time,
        end: Time,
        total_consumption: i64,
        max_consumption: i64,
        id: u32,
    ) -> Self {
        assert!(
            start < end,
            "Invalid variable action time bounds: start must be less than end"
        );
        Self {
            start,
            end,
            total_consumption,
            max_consumption,
            id,
        }
    }
    /// Returns the start time of the action.
    pub fn get_start(&self) -> Time {
        self.start
    }
    /// Returns the end time of the action.
    pub fn get_end(&self) -> Time {
        self.end
    }
    /// Returns the unique identifier of the action.
    pub fn get_id(&self) -> u32 {
        self.id
    }
    /// Returns the total consumption of the action.
    pub fn get_total_consumption(&self) -> i64 {
        self.total_consumption
    }
    /// Returns the maximum consumption per timestep of the action.
    pub fn get_max_consumption(&self) -> i64 {
        self.max_consumption
    }
}

/// A variable action where the consumption per timestep has been fixed to specific values.
#[derive(Debug, Clone)]
pub struct AssignedVariableAction {
    /// The variable action being assigned.
    action: Arc<VariableAction>,
    /// The consumption values for each timestep of the action.
    consumption: Vec<i64>,
}

impl AssignedVariableAction {
    /// Creates a new AssignedVariableAction.
    ///
    /// # Arguments
    /// * `action` - The variable action being assigned.
    /// * `consumption` - The consumption values for each timestep of the action.
    /// # Panics
    /// * Panics if the length of the consumption vector does not match the duration of the action.
    pub fn new(action: Arc<VariableAction>, consumption: Vec<i64>) -> Self {
        assert_eq!(
            consumption.len() as u32,
            action.end.to_timestep() - action.start.to_timestep(),
            "Consumption list length does not match action duration"
        );
        Self {
            action,
            consumption,
        }
    }

    pub fn get_consumption(&self, time: Time) -> i64 {
        if time < self.action.start || time >= self.action.end {
            return 0;
        }
        let index = (time.to_timestep() - self.action.start.to_timestep()) as usize;
        self.consumption[index]
    }
}

impl Deref for AssignedVariableAction {
    type Target = VariableAction;

    fn deref(&self) -> &Self::Target {
        &self.action
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::time::Time;
    use std::sync::Arc;

    #[test]
    fn test_variable_action_creation() {
        let start = Time::new(8, 0);
        let end = Time::new(12, 0);
        let action = VariableAction::new(start, end, 5000, 1000, 42);

        assert_eq!(action.get_id(), 42);
        assert_eq!(action.get_total_consumption(), 5000);
        assert_eq!(action.get_max_consumption(), 1000);
    }

    #[test]
    #[should_panic(expected = "Invalid variable action time bounds")]
    fn test_variable_action_invalid_times() {
        // Start must be less than end
        let start = Time::new(10, 0);
        let end = Time::new(9, 0);
        VariableAction::new(start, end, 100, 10, 1);
    }

    #[test]
    fn test_assigned_variable_action_indexing() {
        // 8:00 to 8:15 with 5-minute timesteps = 3 slots
        let start = Time::new(8, 0);
        let end = Time::new(8, 15);
        let action = Arc::new(VariableAction::new(start, end, 30, 20, 1));

        // Custom consumption profile: 10W, 5W, 15W
        let consumption_profile = vec![10, 5, 15];
        let assigned = AssignedVariableAction::new(action, consumption_profile);

        // Check mapping:
        // 08:00 -> index 0
        assert_eq!(assigned.get_consumption(Time::new(8, 0)), 10);
        // 08:05 -> index 1
        assert_eq!(assigned.get_consumption(Time::new(8, 5)), 5);
        // 08:10 -> index 2
        assert_eq!(assigned.get_consumption(Time::new(8, 10)), 15);
    }

    #[test]
    #[should_panic(expected = "Consumption list length does not match action duration")]
    fn test_assigned_variable_mismatched_length() {
        let start = Time::new(8, 0);
        let end = Time::new(8, 15); // 3 timesteps
        let action = Arc::new(VariableAction::new(start, end, 30, 20, 1));

        // Provide only 2 values instead of 3
        let consumption_profile = vec![10, 10];
        AssignedVariableAction::new(action, consumption_profile);
    }

    #[test]
    fn test_deref_to_base_action() {
        let action = Arc::new(VariableAction::new(
            Time::new(0, 0),
            Time::new(1, 0),
            100,
            20,
            7,
        ));
        let assigned = AssignedVariableAction::new(action, vec![5; 12]);

        // Should access VariableAction fields through the proxy
        assert_eq!(assigned.max_consumption, 20);
        assert_eq!(assigned.get_id(), 7);
    }
}
