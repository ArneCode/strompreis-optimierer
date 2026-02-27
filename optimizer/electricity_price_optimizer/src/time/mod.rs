//! # Time Module
//!
//! This module provides representations and utilities for handling time within the optimizer.
//! It defines the `Time` struct, which abstracts time into discrete steps, and constants
//! that govern the resolution of these steps (e.g., `MINUTES_PER_TIMESTEP`).

use std::{
    fmt::Debug,
    ops::{Add, Range, Sub},
};

pub const MINUTES_PER_TIMESTEP: u32 = 5;

const MINUTES_PER_DAY: u32 = 60 * 24;
pub const STEPS_PER_DAY: u32 = MINUTES_PER_DAY / MINUTES_PER_TIMESTEP;

/// Represents a specific time of day in minutes.
/// Provides methods for conversion between time and timesteps.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Time {
    /// Total minutes since the current time.
    pub(crate) minutes: u32,
}

impl Time {
    /// Creates a new Time instance from hours and minutes.
    ///
    /// # Arguments
    /// * `hours` - The hour component of the time.
    /// * `minutes` - The minute component of the time.
    /// # Returns
    /// * A new Time instance.
    pub fn new(hours: u32, minutes: u32) -> Self {
        Self {
            minutes: hours * 60 + minutes,
        }
    }

    /// Converts the Time instance to a timestep.
    pub fn to_timestep(&self) -> u32 {
        self.minutes / MINUTES_PER_TIMESTEP
    }

    /// Creates a Time instance from a given timestep.
    pub fn from_timestep(timestep: u32) -> Self {
        Self {
            minutes: timestep * MINUTES_PER_TIMESTEP,
        }
    }

    /// Returns the total minutes since the current time.
    pub fn get_minutes(&self) -> u32 {
        self.minutes
    }

    pub fn get_next_timestep(&self) -> Time {
        Time {
            minutes: self.minutes + MINUTES_PER_TIMESTEP,
        }
    }

    pub fn get_day_end() -> Time {
        Time {
            minutes: MINUTES_PER_DAY,
        }
    }
}

impl Add<Time> for Time {
    type Output = Time;

    fn add(self, other: Time) -> Time {
        Time {
            minutes: self.minutes + other.minutes,
        }
    }
}

impl Sub<Time> for Time {
    type Output = Time;

    fn sub(self, other: Time) -> Time {
        Time {
            minutes: self.minutes - other.minutes,
        }
    }
}

/// A trait for iterating over a range of `Time` in discrete steps.
pub trait TimeIterator {
    /// The type of the iterator.
    type T: Iterator<Item = Time>;
    /// Returns an iterator that yields `Time` instances for each step in the range.
    fn iter_steps(&self) -> Self::T;
}
impl TimeIterator for Range<Time> {
    type T = std::iter::Map<std::ops::Range<u32>, fn(u32) -> Time>;
    fn iter_steps(&self) -> Self::T {
        let start_timestep = self.start.to_timestep();
        let end_timestep = self.end.to_timestep();
        (start_timestep..end_timestep).map(Time::from_timestep)
    }
}

impl Debug for Time {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let hours = self.minutes / 60;
        let minutes = self.minutes % 60;
        write!(f, "{:02}:{:02}", hours, minutes)
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_creation() {
        let t = Time::new(2, 30);
        assert_eq!(t.get_minutes(), 150);
        assert_eq!(format!("{:?}", t), "02:30");
    }

    #[test]
    fn test_timestep_logic_is_consistent_with_constant() {
        let hour_in_minutes = 60;
        let t = Time::new(1, 0);

        // Instead of hardcoding "12", we calculate what it should be
        let expected_steps = hour_in_minutes / MINUTES_PER_TIMESTEP;
        assert_eq!(
            t.to_timestep(),
            expected_steps,
            "to_timestep failed for 1 hour with MINUTES_PER_TIMESTEP={}",
            MINUTES_PER_TIMESTEP
        );
    }

    #[test]
    fn test_from_timestep_is_lossless() {
        let arbitrary_step = 42;
        let t = Time::from_timestep(arbitrary_step);

        // Round trip should always work regardless of the constant
        assert_eq!(t.to_timestep(), arbitrary_step);
        assert_eq!(t.get_minutes(), arbitrary_step * MINUTES_PER_TIMESTEP);
    }

    #[test]
    fn test_day_segmentation() {
        let total_steps = Time::get_day_end().to_timestep();

        // This ensures STEPS_PER_DAY constant stays in sync with the method
        assert_eq!(total_steps, STEPS_PER_DAY);

        // Ensure total minutes in a day is always 1440
        assert_eq!(Time::get_day_end().get_minutes(), 24 * 60);
    }

    #[test]
    fn test_range_iteration_coverage() {
        let start_step = 10;
        let end_step = 20;
        let start_time = Time::from_timestep(start_step);
        let end_time = Time::from_timestep(end_step);

        let range = start_time..end_time;
        let steps: Vec<Time> = range.iter_steps().collect();

        // The number of steps should always be (end - start)
        assert_eq!(steps.len() as u32, end_step - start_step);

        // Each step should be exactly MINUTES_PER_TIMESTEP apart
        if steps.len() > 1 {
            assert_eq!(
                steps[1].get_minutes() - steps[0].get_minutes(),
                MINUTES_PER_TIMESTEP
            );
        }
    }
    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_get_next_timestep_is_exactly_one_step_away() {
            let t1 = Time::new(1, 0);
            let t2 = t1.get_next_timestep();

            // Invariant: The difference must always equal the constant
            assert_eq!(t2.minutes - t1.minutes, MINUTES_PER_TIMESTEP);

            // Invariant: The timestep index must increment by exactly 1
            assert_eq!(t2.to_timestep(), t1.to_timestep() + 1);
        }

        #[test]
        fn test_add_time() {
            let t1 = Time::new(1, 10);
            let t2 = Time::new(2, 20);
            let result = t1 + t2;

            // Invariant: minutes should be additive
            assert_eq!(result.get_minutes(), t1.get_minutes() + t2.get_minutes());

            // Test with zero
            let zero = Time::new(0, 0);
            assert_eq!((t1 + zero).get_minutes(), t1.get_minutes());
        }

        #[test]
        fn test_sub_time() {
            let t1 = Time::new(5, 0);
            let t2 = Time::new(2, 30);
            let result = t1 - t2;

            // Invariant: minutes should be subtractive
            assert_eq!(result.get_minutes(), t1.get_minutes() - t2.get_minutes());
        }

        #[test]
        #[should_panic]
        fn test_sub_underflow() {
            // Since minutes is u32, subtracting a larger time from a smaller
            // one will panic in debug mode (standard Rust behavior for Sub).
            let t1 = Time::new(1, 0);
            let t2 = Time::new(2, 0);
            let _ = t1 - t2;
        }

        #[test]
        fn test_arithmetic_timestep_consistency() {
            // This ensures that adding two times results in the expected timestep sum
            // (Only works cleanly if both times are perfectly aligned to steps)
            let t1 = Time::from_timestep(10);
            let t2 = Time::from_timestep(5);
            let result = t1 + t2;

            assert_eq!(result.to_timestep(), 15);
        }
    }
}
