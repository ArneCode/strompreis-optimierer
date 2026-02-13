//! Implements the simulated annealing optimization algorithm.
//!
//! This module contains the core logic for the simulated annealing optimizer,
//! including the representation of the state, the changes that can be applied to it,
//! and the main optimization loop.

use rand::Rng;

use crate::{
    optimizer_context::OptimizerContext,
    schedule::{self, Schedule},
    simulated_annealing::{
        change::{Change, multi_change::MultiChange},
        state::State,
    },
};

mod change;
pub mod state;
/// Runs the simulated annealing algorithm to optimize electricity usage and costs.
///
/// This function takes an `OptimizerContext` containing the necessary data such as
/// electricity price prognoses, generated electricity prognoses, beyond-control
/// consumption prognoses, battery configurations, and actions (both constant and variable).
/// It applies the simulated annealing optimization technique to find a near-optimal
/// solution for electricity usage scheduling.
///
/// # Parameters
/// - `context`: An `OptimizerContext` instance containing all the required data for optimization.
///
/// # Returns
/// A tuple containing the final cost and the optimized `Schedule`.
///
/// # Example
/// ```
/// use std::sync::Arc;
/// use electricity_price_optimizer::{
///     optimizer_context::{
///         OptimizerContext,
///         prognoses::Prognoses,
///         battery::Battery,
///         action::{
///             constant::ConstantAction,
///             variable::VariableAction,
///         },
///     },
///     simulated_annealing::run_simulated_annealing,
///     time::{Time, STEPS_PER_DAY},
/// };
///
/// let electricity_price_data = [10; STEPS_PER_DAY as usize];
/// let generated_electricity_data = [100; STEPS_PER_DAY as usize];
/// let beyond_control_consumption_data = [20; STEPS_PER_DAY as usize];
/// let batteries = vec![Arc::new(Battery::new(1000, 10, 10, 7, 1.0, 1))];
/// let constant_actions = vec![Arc::new(ConstantAction::new(
///     Time::new(0, 0),
///     Time::new(2, 0),
///     Time::new(1, 0),
///     300,
///     2,
/// ))];
/// let variable_actions = vec![Arc::new(VariableAction::new(
///     Time::new(1, 15),
///     Time::new(10, 0),
///     300,
///     100,
///     3,
/// ))];
///
/// let context = OptimizerContext::new(
///     Prognoses::new(electricity_price_data),
///     Prognoses::new(generated_electricity_data),
///     Prognoses::new(beyond_control_consumption_data),
///     batteries,
///     constant_actions,
///     variable_actions,
///     1.0,
/// );
/// let (cost, schedule) = run_simulated_annealing(context);
/// println!("Optimization result cost: {}", cost);
/// ```
///
/// # Notes
/// - Ensure that the `OptimizerContext` is properly initialized with valid data.
/// - The algorithm may not guarantee the absolute optimal solution but aims to find
///   a good approximation within a reasonable time frame.
///
/// # Panics
/// This function may panic if the `OptimizerContext` contains invalid or inconsistent data.
pub fn run_simulated_annealing(context: OptimizerContext) -> (i64, Schedule) {
    let mut rng = rand::rng();

    let mut state = State::new_random(context, &mut rng);
    let mut temperature: f64 = 40.0;

    let mut old_cost = state.get_cost();
    let mut n_iterations = 0;
    let mut min_cost = old_cost;
    while temperature > 0.1 {
        n_iterations += 1;
        // Determine random_move_sigma based on temperature
        let random_move_sigma = 30.0 * temperature.sqrt();
        let change = MultiChange::new_random(&mut rng, &state, random_move_sigma, 2);
        change.apply(&mut state);
        // Evaluate the new state and decide whether to accept or reject the change
        let new_cost = state.get_cost();
        let cost_diff = new_cost - old_cost;
        if cost_diff < 0 {
            // Accept the change
            old_cost = new_cost;
        } else {
            let acceptance_probability = (-cost_diff as f64 / temperature).exp();
            if rng.random_range(0.0..1.0) < acceptance_probability {
                // Accept the change
                old_cost = new_cost;
            } else {
                // Reject the change
                change.undo(&mut state);
            }
        }
        if old_cost < min_cost {
            min_cost = old_cost;
        }
        temperature *= 0.9; // Cool down
        // println!("temperature: {temperature}, cost: {old_cost}");
    }

    println!("Total iterations: {n_iterations}, min cost: {min_cost}");
    let schedule = state.get_schedule();
    (old_cost, schedule)

    // somehow also get the final schedule out of the state
}
