use std::{hash::Hash, ops::Deref, rc::Rc, sync::Arc};

use crate::time::Time;

/// A constant action that consumes a fixed amount of energy over a specified duration within given time bounds.
#[derive(Clone, Debug)]
pub struct ConstantAction {
    /// The earliest time the action can start.
    pub start_from: Time,
    /// The latest time the action must end before.
    pub end_before: Time,
    /// The duration of the action.
    pub duration: Time,
    /// The fixed consumption amount of the action for every timestep.
    pub consumption: i64,
    id: u32,
}
impl ConstantAction {
    /// Creates a new ConstantAction.
    /// # Arguments
    /// * `start_from` - The earliest time the action can start.
    /// * `end_before` - The latest time the action must end before.
    /// * `duration` - The duration of the action.
    /// * `consumption` - The fixed consumption amount of the action for every timestep.
    /// * `id` - The unique identifier for the action.
    /// # Panics
    /// * Panics if the time bounds are invalid (i.e., if start_from + duration > end_before).
    /// # Returns
    /// * A new ConstantAction instance.
    pub fn new(
        start_from: Time,
        end_before: Time,
        duration: Time,
        consumption: i64,
        id: u32,
    ) -> Self {
        assert!(
            start_from + duration <= end_before,
            "Invalid time bounds for ConstantAction: start_from + duration must be <= end_before. Got start_from: {start_from:?}, duration: {duration:?}, end_before: {end_before:?}, current calculated end time: {:?}",
            start_from + duration
        );
        Self {
            start_from,
            end_before,
            duration,
            consumption,
            id,
        }
    }
    /// Returns the start_from time of the action.
    pub fn get_start_from(&self) -> Time {
        self.start_from
    }
    /// Returns the end_before time of the action.
    pub fn get_end_before(&self) -> Time {
        self.end_before
    }
    /// Returns the duration of the action.
    pub fn get_id(&self) -> u32 {
        self.id
    }

    /// Returns the consumption of the action.
    pub fn get_consumption(&self) -> i64 {
        self.consumption
    }

    pub fn with_start_time(self: Arc<Self>, start_time: Time) -> AssignedConstantAction {
        AssignedConstantAction::new(self, start_time)
    }
}

/// A constant action where the start time has been fixed / assigned.
#[derive(Clone, Debug)]
pub struct AssignedConstantAction {
    /// The constant action being assigned.
    action: Arc<ConstantAction>,
    /// The assigned start time of the action.
    start_time: Time,
}
impl AssignedConstantAction {
    /// Creates a new AssignedConstantAction.
    ///
    /// # Arguments
    /// * `action` - The constant action to be assigned.
    /// * `start_time` - The assigned start time of the action.
    /// # Panics
    /// * Panics if the start_time is out of bounds for the constant action.
    /// # Returns
    /// * A new AssignedConstantAction instance.
    pub fn new(action: Arc<ConstantAction>, start_time: Time) -> Self {
        assert!(
            start_time >= action.start_from && start_time + action.duration <= action.end_before,
            "Start time is out of bounds for the constant action"
        );
        Self { action, start_time }
    }

    /// Returns the start time of the assigned action.
    pub fn get_start_time(&self) -> Time {
        self.start_time
    }

    /// Returns a mutable reference to the start time of the assigned action.
    pub fn get_start_time_mut(&mut self) -> &mut Time {
        &mut self.start_time
    }

    /// Returns a reference to the underlying constant action.
    pub fn get_action(&self) -> &Arc<ConstantAction> {
        &self.action
    }

    /// Returns the end time of the assigned action.
    pub fn get_end_time(&self) -> Time {
        self.start_time + self.action.duration
    }
}

impl Deref for AssignedConstantAction {
    type Target = ConstantAction;

    fn deref(&self) -> &Self::Target {
        &self.action
    }
}

impl Hash for AssignedConstantAction {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.action.id.hash(state);
        self.start_time.to_timestep().hash(state);
    }
}

impl PartialEq for AssignedConstantAction {
    fn eq(&self, other: &Self) -> bool {
        self.action.id == other.action.id
            && self.start_time.to_timestep() == other.start_time.to_timestep()
    }
}

impl Eq for AssignedConstantAction {}
