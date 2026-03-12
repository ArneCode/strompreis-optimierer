//! Implements the simulated annealing optimization algorithm.
//!
//! This module contains the core logic for the simulated annealing optimizer,
//! including the representation of the state, the changes that can be applied to it,
//! and the main optimization loop.

use std::time::Instant;

use rand::Rng;

use crate::{
    algorithm::simulated_annealing::{
        change::{Change, multi_change::MultiChange},
        state::State,
    },
    optimizer_context::action::constant,
};
use crate::{
    optimizer_context::OptimizerContext,
    schedule::{self, Schedule},
};

/// Settings for the simulated annealing algorithm.
#[derive(Debug, Clone)]
pub struct SimulatedAnnealingSettings {
    pub initial_temperature: f64,
    pub cooling_rate: f64,
    pub final_temperature: f64,
    pub constant_action_move_factor: f64,
    pub num_moves_per_step: usize,
}

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
///     simulated_annealing::{run_simulated_annealing,SimulatedAnnealingSettings},
///     time::{Time, STEPS_PER_DAY},
/// };
///
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
/// let settings = SimulatedAnnealingSettings {
///     initial_temperature: 100.0,
///     cooling_rate: 0.95,
///     final_temperature: 1.0,
///     constant_action_move_factor: 0.1,
///     num_moves_per_step: 10,
/// };
/// let (cost, schedule) = run_simulated_annealing(context, settings);
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
pub fn run_simulated_annealing(
    context: OptimizerContext,
    settings: SimulatedAnnealingSettings,
) -> (i64, Schedule) {
    let mut rng = rand::rng();

    let has_constant_actions = !context.get_constant_actions().is_empty();
    if !has_constant_actions {
        // no constant actions so no simulated annealing needed, one flow run is enough
        println!(
            "No constant actions found, skipping simulated annealing and returning optimal schedule."
        );
    }
    let mut state = State::new_random(context, &mut rng);
    let mut temperature: f64 = settings.initial_temperature;

    let mut old_cost = state.get_cost();
    let mut n_iterations = 0;
    let mut min_cost = old_cost;

    // timer
    let start = Instant::now();
    while temperature > settings.final_temperature && has_constant_actions {
        n_iterations += 1;
        if (n_iterations % 10 == 0) && n_iterations > 0 {
            let elapsed = start.elapsed();
            println!(
                "Iteration: {n_iterations}, Temperature: {temperature:.4}, Cost: {old_cost}, Elapsed: {elapsed:.2?}"
            );
        }
        // Determine random_move_sigma based on temperature
        let random_move_sigma = settings.constant_action_move_factor * temperature.sqrt();
        let change = MultiChange::new_random(
            &mut rng,
            &state,
            random_move_sigma,
            settings.num_moves_per_step,
        );
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
        temperature *= settings.cooling_rate; // Cool down
        // println!("temperature: {temperature}, cost: {old_cost}");
    }

    println!("Total iterations: {n_iterations}, min cost: {min_cost}");
    let schedule = state.get_schedule();
    (old_cost, schedule)

    // somehow also get the final schedule out of the state
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::common::*;
    use proptest::prelude::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(3))]
        #[test]
        fn test_sa_output_validity(
            context in arb_optimizer_context(),
            settings in arb_sa_settings()
        ) {
            static COUNTER: AtomicUsize = AtomicUsize::new(0);
            let test_id = COUNTER.fetch_add(1, Ordering::SeqCst);
            println!("Running SA validity test #{test_id} with settings: {:?}", settings);

            // Capture context info for validation before moving it
            let expected_constant_ids: Vec<u32> = context.get_constant_actions().iter().map(|a| a.get_id()).collect();
            let expected_variable_ids: Vec<u32> = context.get_variable_actions().iter().map(|a| a.get_id()).collect();
            let expected_battery_ids: Vec<u32> = context.get_batteries().iter().map(|a| a.get_id()).collect();

            let (_cost, schedule) = run_simulated_annealing(context.clone(), settings);

            // --- 1. COMPLETENESS CHECKS ---
            for id in expected_constant_ids {
                assert!(schedule.constant_actions.contains_key(&id), "Constant action {} missing from schedule", id);
            }
            for id in expected_variable_ids {
                assert!(schedule.variable_actions.contains_key(&id), "Variable action {} missing from schedule", id);
            }
            // Note: Check if your SA currently populates batteries; if not, skip this
            for id in expected_battery_ids {
                assert!(schedule.batteries.contains_key(&id), "Battery {} missing from schedule", id);
            }

            // --- 2. CONSTANT ACTION TEMPORAL VALIDITY ---
            for (_, action) in schedule.constant_actions.iter() {
                let start = action.get_start_time();
                let end = action.get_end_time();

                assert!(start >= action.get_start_from(), "Action started too early");
                assert!(end <= action.get_end_before(), "Action ended too late");
            }

            // --- 3. VARIABLE ACTION ENERGY BALANCE ---
            for (_, assigned_var) in schedule.variable_actions.iter() {
                let mut total_scheduled_energy = 0i64;

                // Iterate through every step in the day
                for t in 0..crate::time::STEPS_PER_DAY {
                    let time = crate::time::Time::from_timestep(t);
                    // We only check within the action's window
                    if time >= assigned_var.get_start() && time < assigned_var.get_end() {
                        let step_cons = assigned_var.get_consumption(time);
                        assert!(step_cons <= assigned_var.get_max_consumption(), "Exceeded max consumption at {:?}", time);
                        total_scheduled_energy += step_cons;
                    }
                }

                // Critical check: Total energy must match exactly
                assert_eq!(total_scheduled_energy, assigned_var.get_total_consumption(),
                    "Variable action energy sum mismatch for ID {}", assigned_var.get_id());
            }

            // --- 4. NETWORK CONSUMPTION INTEGRITY ---
            // Verify that the cost reported matches the grid prognosis manually
            // Grid = (BeyondControl + Actions - Generation +/- Battery)
            // This validates your SmartHomeFlow logic indirectly.
            // if let Err(e) = schedule.verify_energy_balance(&context) {
            //     panic!("Fuzzy test failed physical balance: {}", e);
            // }
        }
    }
}
