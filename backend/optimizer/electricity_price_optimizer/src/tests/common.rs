use crate::optimizer_context::{
    OptimizerContext, action::constant::ConstantAction, action::variable::VariableAction,
    battery::Battery, prognoses::Prognoses,
};
use crate::simulated_annealing::SimulatedAnnealingSettings;
use crate::time::{STEPS_PER_DAY, Time};
use proptest::prelude::*;
use std::i64::MAX;
use std::sync::Arc;

const MA: i64 = 1_000_000_000;
const MAX_BATTERY_CAPACITY: i64 = 1_000_000_000; // 1 trillion, adjust as needed
const MAX_CONSUMPTION: i64 = 1_000_000_000; // 1 billion, adjust as needed
const MAX_PRICE: i64 = 10_000; // Max price per unit, adjust as needed
const MAX_GENERATION: i64 = 1_000_000_000; // Max generation per timestep, adjust as needed
const MAX_BEYOND_CONTROL: i64 = 1_000_000_000; // Max beyond control consumption per timestep, adjust as needed

// --- Strategy for Time and Arrays ---
fn arb_prognosis(max_val: i64) -> impl Strategy<Value = Prognoses<i64>> {
    // Generates a vector of exactly STEPS_PER_DAY size

    prop::collection::vec(0..max_val, STEPS_PER_DAY as usize).prop_map(|v| {
        let mut data = [0i64; STEPS_PER_DAY as usize];

        data.copy_from_slice(&v);

        Prognoses::new(data)
    })
}
fn arb_battery_data() -> impl Strategy<Value = (i64, i64, i64, i64, f32)> {
    (1..MAX_BATTERY_CAPACITY).prop_flat_map(|cap| {
        (
            Just(cap),
            0..=cap,            // initial_level <= capacity
            1..MAX_CONSUMPTION, // charge rate
            1..MAX_CONSUMPTION, // output rate
            Just(1.0f32),       // efficiency
        )
    })
}

fn arb_constant_action_data() -> impl Strategy<Value = (Time, Time, Time, i64)> {
    (0..STEPS_PER_DAY - 1)
        .prop_flat_map(|start_step| {
            let max_duration = STEPS_PER_DAY - start_step;
            (
                Just(Time::from_timestep(start_step)),
                Just(Time::from_timestep(STEPS_PER_DAY)),
                1..max_duration,    // duration
                0..MAX_CONSUMPTION, // consumption
            )
                .prop_map(|(s, e, d_step, c)| (s, e, Time::from_timestep(d_step), c))
        })
        .prop_map(|(s, e, d, c)| (s, e, d, c))
}

// fn arb_constant_action(id: u32) -> impl Strategy<Value = Arc<ConstantAction>> {
//     let max_step = STEPS_PER_DAY;
//     (0..max_step - 1)
//         .prop_flat_map(move |start_step| {
//             let max_duration = max_step - start_step;
//             (
//                 Just(start_step),
//                 1..max_duration,     // duration must fit in the day
//                 0..1_000_000_000i64, // consumption
//             )
//         })
//         .prop_map(move |(start_s, dur_s, cons)| {
//             let start = Time::from_timestep(start_s);
//             let duration = Time::from_timestep(dur_s);
//             // We set end_before to exactly when it must finish or later
//             let end = Time::from_timestep(STEPS_PER_DAY);
//             Arc::new(ConstantAction::new(start, end, duration, cons, id))
//         })
// }

// fn arb_variable_action(id: u32) -> impl Strategy<Value = Arc<VariableAction>> {
//     let max_step = STEPS_PER_DAY;

//     // 1. Pick a start time
//     (0..max_step - 1)
//         .prop_flat_map(move |start_step| {
//             // 2. Pick a max consumption per timestep (up to 1e6 for realism)
//             (1..1_000_000i64)
//                 .prop_flat_map(move |max_cons| {
//                     // 3. Pick a window width (at least 1 step)
//                     let remaining_steps = max_step - start_step;
//                     (1..remaining_steps, Just(max_cons))
//                 })
//                 .prop_flat_map(move |(width, max_cons)| {
//                     // 4. Calculate max possible total consumption for this window
//                     let max_possible_total = max_cons * (width as i64);
//                     (
//                         Just(start_step),
//                         Just(start_step + width),
//                         1..=max_possible_total, // total_consumption
//                         Just(max_cons),
//                         Just(id),
//                     )
//                 })
//         })
//         .prop_map(|(s_step, e_step, total, max_per_step, id)| {
//             Arc::new(VariableAction::new(
//                 Time::from_timestep(s_step),
//                 Time::from_timestep(e_step),
//                 total,
//                 max_per_step,
//                 id,
//             ))
//         })
// }
fn arb_variable_action_data() -> impl Strategy<Value = (Time, Time, i64, i64)> {
    let max_step = STEPS_PER_DAY;
    (0..max_step - 1)
        .prop_flat_map(move |start_step| {
            (1..MAX_CONSUMPTION).prop_flat_map(move |max_cons| {
                let remaining_steps = max_step - start_step;
                (Just(start_step), 1..remaining_steps, Just(max_cons))
            })
        })
        .prop_flat_map(|(s_step, width, max_cons)| {
            let max_possible_total = max_cons * (width as i64);
            (
                Just(Time::from_timestep(s_step)),
                Just(Time::from_timestep(s_step + width)),
                1..=max_possible_total, // total_consumption
                Just(max_cons),
            )
        })
}

// --- Individual Parameterized Strategy (For your own unit tests) ---
pub fn arb_variable_action(id: u32) -> impl Strategy<Value = Arc<VariableAction>> {
    arb_variable_action_data()
        .prop_map(move |(s, e, t, m)| Arc::new(VariableAction::new(s, e, t, m, id)))
}

// Do the same for Battery and ConstantAction...
pub fn arb_battery(id: u32) -> impl Strategy<Value = Arc<Battery>> {
    arb_battery_data().prop_map(move |(cap, init, c_rate, o_rate, eff)| {
        Arc::new(Battery::new(cap, init, c_rate, o_rate, eff, id))
    })
}

pub fn arb_constant_action(id: u32) -> impl Strategy<Value = Arc<ConstantAction>> {
    arb_constant_action_data()
        .prop_map(move |(s, e, d, c)| Arc::new(ConstantAction::new(s, e, d, c, id)))
}
// --- The Main Context Strategy ---

// pub fn arb_optimizer_context() -> impl Strategy<Value = OptimizerContext> {
//     (
//         arb_prognosis(10_000),                                  // Price
//         arb_prognosis(1_000_000_000),                           // Generation (1e9)
//         arb_prognosis(1_000_000_000),                           // Beyond control (1e9)
//         prop::collection::vec(arb_battery(1), 0..3),            // 0-3 batteries
//         prop::collection::vec(arb_constant_action(10), 1..=10), // 1-10 constant
//         prop::collection::vec(arb_variable_action(20), 0..5),   // 0-5 variable
//         0.0..1.0f32,                                            // first_timestep_fraction
//     )
//         .prop_map(|(p, g, c, bats, consts, vars, frac)| {
//             OptimizerContext::new(p, g, c, bats, consts, vars, frac)
//         })
// }
pub fn arb_optimizer_context() -> impl Strategy<Value = OptimizerContext> {
    (
        arb_prognosis(MAX_PRICE),
        arb_prognosis(MAX_GENERATION),
        arb_prognosis(MAX_BEYOND_CONTROL),
        prop::collection::vec(arb_battery_data(), 0..3),
        prop::collection::vec(arb_constant_action_data(), 1..=10),
        prop::collection::vec(arb_variable_action_data(), 1..5),
        0.0..1.0f32,
    )
        .prop_map(|(price, gen_elec, beyond, b_list, c_list, v_list, frac)| {
            // Assign IDs using offsets to prevent any cross-type overlap
            let batteries = b_list
                .into_iter()
                .enumerate()
                .map(|(i, d)| Arc::new(Battery::new(d.0, d.1, d.2, d.3, d.4, i as u32)))
                .collect();

            let constant_actions = c_list
                .into_iter()
                .enumerate()
                .map(|(i, d)| Arc::new(ConstantAction::new(d.0, d.1, d.2, d.3, 100 + i as u32)))
                .collect();

            let variable_actions = v_list
                .into_iter()
                .enumerate()
                .map(|(i, d)| Arc::new(VariableAction::new(d.0, d.1, d.2, d.3, 200 + i as u32)))
                .collect();

            OptimizerContext::new(
                price,
                gen_elec,
                beyond,
                batteries,
                constant_actions,
                variable_actions,
                frac,
            )
        })
}
pub fn arb_sa_settings() -> impl Strategy<Value = SimulatedAnnealingSettings> {
    (
        10.0..40.0f64, // initial_temp
        0.5..0.99f64,  // cooling_rate
        0.01..1.0f64,  // final_temp
        1.0..100.0f64, // move_factor
        1..20usize,    // moves_per_step
    )
        .prop_map(
            |(init, cool, final_t, factor, moves)| SimulatedAnnealingSettings {
                initial_temperature: init,
                cooling_rate: cool,
                final_temperature: final_t,
                constant_action_move_factor: factor,
                num_moves_per_step: moves,
            },
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    proptest! {
        #[test]
        fn test_context_id_uniqueness(context in arb_optimizer_context()) {
            let mut ids = std::collections::HashSet::new();

            // Collect all IDs from all components
            let mut all_ids = Vec::new();
            all_ids.extend(context.get_batteries().iter().map(|b| b.get_id()));
            all_ids.extend(context.get_constant_actions().iter().map(|c| c.get_id()));
            all_ids.extend(context.get_variable_actions().iter().map(|v| v.get_id()));

            let count = all_ids.len();
            for id in all_ids {
                ids.insert(id);
            }

            // If the set size equals the vector size, all IDs were unique
            assert_eq!(ids.len(), count, "Duplicate ID found in OptimizerContext!");
        }
        #[test]
        fn test_id_uniqueness(context in arb_optimizer_context()) {
            let mut ids = std::collections::HashSet::new();

            for b in context.get_batteries() { assert!(ids.insert(b.get_id())); }
            for c in context.get_constant_actions() { assert!(ids.insert(c.get_id())); }
            for v in context.get_variable_actions() { assert!(ids.insert(v.get_id())); }
        }
    }
}
