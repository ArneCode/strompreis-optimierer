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

    pub fn verify_energy_balance(
        &self,
        context: &crate::optimizer_context::OptimizerContext,
    ) -> Result<(), String> {
        use crate::time::{STEPS_PER_DAY, Time};

        for t in 0..STEPS_PER_DAY {
            let time = Time::from_timestep(t);

            // 1. Base: Uncontrollable loads - Solar generation
            let mut expected_grid = *context.get_beyond_control_consumption().get(time).unwrap()
                - *context.get_generated_electricity().get(time).unwrap();

            // 2. Add Constant Actions
            for action in self.constant_actions.values() {
                if time >= action.get_start_time() && time < action.get_end_time() {
                    expected_grid += action.get_consumption();
                }
            }

            // 3. Add Variable Actions
            for action in self.variable_actions.values() {
                if time >= action.get_start() && time < action.get_end() {
                    expected_grid += action.get_consumption(time);
                }
            }

            // 4. Add Battery Flow (Internal Change = Grid Exchange)
            for assigned_bat in self.batteries.values() {
                let bat_def = assigned_bat.get_battery();

                let current_level = *assigned_bat.get_charge_level(time).unwrap();
                let previous_level = if t == 0 {
                    bat_def.get_initial_level()
                } else {
                    *assigned_bat
                        .get_charge_level(Time::from_timestep(t - 1))
                        .unwrap()
                };

                // Positive delta = charging (drawing from grid)
                // Negative delta = discharging (feeding into home/grid)
                let delta = current_level - previous_level;
                expected_grid += delta;
            }

            // 5. Comparison
            let actual_grid = *self.network_consumption.get(time).unwrap();

            if actual_grid != expected_grid {
                return Err(format!(
                    "Energy mismatch at timestep {}: Expected {}, Got {}",
                    t, expected_grid, actual_grid
                ));
            }
        }
        Ok(())
    }
}
