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
