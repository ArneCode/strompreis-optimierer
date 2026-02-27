//! Defines constant actions, which have a fixed consumption and duration.

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
#[cfg(test)]
mod tests {
    use super::*;
    use crate::time::Time;
    use std::sync::Arc;

    #[test]
    fn test_constant_action_creation() {
        let start = Time::new(1, 0);
        let duration = Time::new(2, 0);
        let end_limit = Time::new(5, 0);

        let action = ConstantAction::new(start, end_limit, duration, 1000, 1);

        assert_eq!(action.get_start_from().get_minutes(), 60);
        assert_eq!(action.get_end_before().get_minutes(), 300);
        assert_eq!(action.get_consumption(), 1000);
        assert_eq!(action.get_id(), 1);
    }

    #[test]
    #[should_panic(expected = "Invalid time bounds")]
    fn test_constant_action_invalid_bounds() {
        // Duration (4h) + Start (2h) = 6h, which is > limit (5h)
        let start = Time::new(2, 0);
        let duration = Time::new(4, 0);
        let end_limit = Time::new(5, 0);

        let _ = ConstantAction::new(start, end_limit, duration, 100, 1);
    }

    #[test]
    fn test_assignment_valid() {
        let action = Arc::new(ConstantAction::new(
            Time::new(1, 0),
            Time::new(5, 0),
            Time::new(2, 0),
            500,
            10,
        ));

        // Start at 1:00 (exact boundary)
        let assigned_start = action.clone().with_start_time(Time::new(1, 0));
        assert_eq!(assigned_start.get_end_time().get_minutes(), 180); // 1h + 2h = 3h

        // Start at 3:00 (exact boundary: 3h + 2h = 5h)
        let assigned_end = action.clone().with_start_time(Time::new(3, 0));
        assert_eq!(assigned_end.get_end_time().get_minutes(), 300);
    }

    #[test]
    #[should_panic(expected = "Start time is out of bounds")]
    fn test_assignment_too_early() {
        let action = Arc::new(ConstantAction::new(
            Time::new(2, 0),
            Time::new(6, 0),
            Time::new(1, 0),
            500,
            1,
        ));

        // Action starts at 2:00, trying to assign at 1:00
        let _ = action.with_start_time(Time::new(1, 0));
    }

    #[test]
    #[should_panic(expected = "Start time is out of bounds")]
    fn test_assignment_too_late() {
        let action = Arc::new(ConstantAction::new(
            Time::new(2, 0),
            Time::new(6, 0),
            Time::new(2, 0),
            500,
            1,
        ));

        // Action must end by 6:00. Duration is 2h.
        // Latest start is 4:00. Trying 4:05 (assuming 5min steps).
        let _ = action.with_start_time(Time::new(4, 5));
    }

    #[test]
    fn test_deref_behavior() {
        let action = Arc::new(ConstantAction::new(
            Time::new(0, 0),
            Time::new(10, 0),
            Time::new(1, 0),
            750,
            99,
        ));

        let assigned = action.with_start_time(Time::new(2, 0));

        // We should be able to access ConstantAction fields directly via Deref
        assert_eq!(assigned.consumption, 750);
        assert_eq!(assigned.get_id(), 99);
    }

    #[test]
    fn test_equality_and_hash() {
        use std::collections::HashSet;

        let action = Arc::new(ConstantAction::new(
            Time::new(0, 0),
            Time::new(10, 0),
            Time::new(1, 0),
            100,
            1,
        ));

        let a1 = action.clone().with_start_time(Time::new(1, 0));
        let a2 = action.clone().with_start_time(Time::new(1, 0));
        let a3 = action.clone().with_start_time(Time::new(2, 0));

        // a1 and a2 are same ID and same start time
        assert_eq!(a1, a2);
        // a1 and a3 have same ID but different start time
        assert_ne!(a1, a3);

        let mut set = HashSet::new();
        set.insert(a1);
        assert!(set.contains(&a2));
        assert!(!set.contains(&a3));
    }
}
