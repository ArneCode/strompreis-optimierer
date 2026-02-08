use std::{rc::Rc, sync::Arc};

use crate::{optimizer_context::prognoses::Prognoses, time::Time};

/// A struct representing a battery with various attributes.
#[derive(Debug, Clone)]
pub struct Battery {
    /// The maximum capacity of the battery.
    capacity: i64,
    /// The initial charge level of the battery.
    initial_level: i64,
    /// The maximum rate at which the battery can be charged.
    maximum_charge_rate: i64,
    /// The maximum rate at which the battery can output energy.
    maximum_output_rate: i64,
    efficiency: f32,
    /// Unique identifier for the battery. Used to distinguish between multiple batteries.
    id: u32,
}

impl Battery {
    /// Creates a new Battery instance with the specified attributes.
    ///
    /// # Arguments
    /// * `capacity` - The maximum capacity of the battery.
    /// * `initial_level` - The initial charge level of the battery.
    /// * `maximum_charge_rate` - The maximum rate at which the battery can be charged.
    /// * `maximum_output_rate` - The maximum rate at which the battery can output energy.
    /// * `efficiency` - The efficiency of the battery.
    /// * `id` - Unique identifier for the battery.
    /// # Panics
    /// * Panics if the initial_level exceeds the capacity.
    /// # Returns
    ///
    /// A new Battery instance.
    pub fn new(
        capacity: i64,
        initial_level: i64,
        maximum_charge_rate: i64,
        maximum_output_rate: i64,
        efficiency: f32,
        id: u32,
    ) -> Self {
        assert!(
            initial_level <= capacity,
            "Initial battery level cannot exceed capacity"
        );
        Self {
            capacity,
            initial_level,
            maximum_charge_rate,
            maximum_output_rate,
            efficiency,
            id,
        }
    }
    /// Returns the unique identifier of the battery.
    pub fn get_id(&self) -> u32 {
        self.id
    }
    /// Returns the maximum charge rate of the battery.
    pub fn get_max_charge(&self) -> i64 {
        return self.maximum_charge_rate;
    }
    /// Returns the maximum output rate of the battery.
    pub fn get_max_output(&self) -> i64 {
        return self.maximum_output_rate;
    }
    /// Returns the capacity of the battery.
    pub fn get_capacity(&self) -> i64 {
        return self.capacity;
    }
    /// Returns the initial charge level of the battery.
    pub fn get_initial_level(&self) -> i64 {
        return self.initial_level;
    }
}

#[derive(Clone, Debug)]
pub struct AssignedBattery {
    battery: Arc<Battery>,
    charge_level: Prognoses<i64>,
}

impl AssignedBattery {
    pub fn new(battery: Arc<Battery>, charge_level: Prognoses<i64>) -> Self {
        Self {
            battery,
            charge_level,
        }
    }

    pub fn get_battery(&self) -> &Arc<Battery> {
        &self.battery
    }

    pub fn get_charge_level(&self, time: Time) -> Option<&i64> {
        self.charge_level.get(time)
    }
}
