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
            panic!(
                "Time {:?} is out of bounds for action starting at {:?} and ending at {:?}",
                time, self.action.start, self.action.end
            );
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
