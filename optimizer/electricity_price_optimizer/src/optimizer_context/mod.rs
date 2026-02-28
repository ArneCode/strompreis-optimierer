//! # Optimizer Context Module
//!
//! This module defines the [`OptimizerContext`] struct, which serves as a central
//! container for all the data required to perform optimization in the energy
//! management system. It aggregates information about batteries, actions, and
//! electricity prognoses (price, generation, and consumption).
pub mod action;
pub mod battery;
pub mod prognoses;

use std::{rc::Rc, sync::Arc};

use crate::optimizer_context::{
    action::{
        constant::{AssignedConstantAction, ConstantAction},
        variable::VariableAction,
    },
    battery::Battery,
    prognoses::Prognoses,
};

/// Holds all data needed for optimization
/// Holds all data needed for optimization.
///
/// The `OptimizerContext` provides shared access to system components like
/// batteries, actions, and prognoses. The use of [`Arc`] ensures that cloned
/// instances share underlying data rather than duplicating it. This makes
/// it efficient to pass around as part of various optimization routines.

#[derive(Clone, Debug)]
pub struct OptimizerContext {
    /// Price of electricity at each timestep
    electricity_price: Arc<Prognoses<i64>>,
    /// Amount of electricity generated at each timestep
    generated_electricity: Arc<Prognoses<i64>>,
    /// Consumption that is not controllable by the system
    beyond_control_consumption: Prognoses<i64>,

    /// Batteries available in the system
    batteries: Vec<Arc<Battery>>,

    /// Constant actions that can be scheduled
    constant_actions: Vec<Arc<ConstantAction>>,
    /// Variable actions that can be scheduled
    variable_actions: Vec<Arc<VariableAction>>,

    /// The first timestep might not be a full timestep
    /// This parameter dictates what fraction of a full timestep the first timestep is
    first_timestep_fraction: f32,
}
impl OptimizerContext {
    ///
    /// # Arguments
    ///
    /// * `electricity_price` - Prognosis of electricity price over time.
    /// * `generated_electricity` - Prognosis of generated electricity (e.g., solar).
    /// * `beyond_control_consumption` - Prognosis of uncontrollable energy consumption.
    /// * `batteries` - List of batteries in the system.
    /// * `constant_actions` - Actions with fixed load and duration.
    /// * `variable_actions` - Actions with adjustable load or timing.
    ///
    /// # Returns
    ///
    /// A fully constructed [`OptimizerContext`] ready for use in optimization.
    pub fn new(
        electricity_price: Prognoses<i64>,
        generated_electricity: Prognoses<i64>,
        beyond_control_consumption: Prognoses<i64>,
        batteries: Vec<Arc<Battery>>,
        constant_actions: Vec<Arc<ConstantAction>>,
        variable_actions: Vec<Arc<VariableAction>>,
        first_timestep_fraction: f32,
    ) -> Self {
        Self {
            electricity_price: Arc::new(electricity_price),
            generated_electricity: Arc::new(generated_electricity),
            beyond_control_consumption,
            batteries: batteries,
            constant_actions,
            variable_actions,
            first_timestep_fraction,
        }
    }

    /// Returns a reference to the list of constant actions.
    pub fn get_constant_actions(&self) -> &Vec<Arc<ConstantAction>> {
        &self.constant_actions
    }
    /// Returns a reference to the list of variable actions.
    pub fn get_variable_actions(&self) -> &Vec<Arc<VariableAction>> {
        &self.variable_actions
    }
    /// Returns a reference to the list of batteries.
    pub fn get_batteries(&self) -> &Vec<Arc<Battery>> {
        &self.batteries
    }

    /// Adds the effect of a constant action to the uncontrollable consumption profile.
    ///
    /// This function updates [`beyond_control_consumption`] to reflect additional
    /// loads from scheduled constant actions.
    pub fn add_constant_action_to_consumption(&mut self, action: &AssignedConstantAction) {
        self.beyond_control_consumption.add_constant_action(action);
    }

    /// Returns a reference to the electricity price prognoses.
    pub fn get_electricity_price(&self) -> &Arc<Prognoses<i64>> {
        &self.electricity_price
    }

    /// Returns a reference to the generated electricity prognoses.
    pub fn get_generated_electricity(&self) -> &Arc<Prognoses<i64>> {
        &self.generated_electricity
    }

    /// Returns a reference to the beyond control consumption prognoses.
    pub fn get_beyond_control_consumption(&self) -> &Prognoses<i64> {
        &self.beyond_control_consumption
    }

    /// Returns the fraction of the first timestep.
    pub fn get_first_timestep_fraction(&self) -> f32 {
        self.first_timestep_fraction
    }
}
