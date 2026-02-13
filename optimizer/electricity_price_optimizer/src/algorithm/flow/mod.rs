//! # Flow-based Optimizer
//!
//! This module implements the core logic for optimizing electricity usage using a
//! min-cost max-flow algorithm. It models the smart home's energy system as a flow
//! network where nodes represent components (like batteries, actions, grid) at
//! different points in time, and edges represent the flow of energy between them.
//!
//! The process involves:
//! 1.  **Building the Network**: `SmartHomeFlowBuilder` constructs a `FlowWrapper` graph
//!     based on the `OptimizerContext`. It creates nodes for each timestep and component
//!     and adds edges with capacities (max power) and costs (electricity price).
//! 2.  **Solving the Flow**: `SmartHomeFlow` takes the graph and solves the min-cost
//!     max-flow problem to find the cheapest way to satisfy all energy demands.
//! 3.  **Constructing the Schedule**: The `Blueprint` pattern is used to translate the
//!     resulting low-level flows in the graph back into a high-level, understandable
//!     `Schedule`. Each `...Blueprint` struct knows which edges in the graph correspond
//!     to its component and how to interpret the flow through them.

use std::collections::HashSet;
use std::rc::Rc;
use std::sync::Arc;
use std::{collections::HashMap, hash::Hash};

use std::time::Instant;

use crate::utils::stack_proxy::StackProxy;
use crate::algorithm::flow::flow_optimizer::flow::FlowWrapper;
use crate::algorithm::flow::flow_optimizer::flow::wrapper::FlowNode;
use crate::optimizer_context::action::constant::{self, AssignedConstantAction, ConstantAction};
use crate::optimizer_context::action::variable::{AssignedVariableAction, VariableAction};
use crate::optimizer_context::battery::{AssignedBattery, Battery};
use crate::optimizer_context::prognoses::Prognoses;
use crate::schedule::Schedule;
use crate::time::{STEPS_PER_DAY, Time, TimeIterator};

mod flow_optimizer;

/// A blueprint for constructing an `AssignedBattery` from a solved flow network.
pub struct BatteryBlueprint {
    battery: Arc<Battery>,
    relevant_edges: HashMap<Time, usize>,
}

impl BatteryBlueprint {
    pub fn new(battery: Arc<Battery>) -> Self {
        Self {
            battery,
            relevant_edges: HashMap::new(),
        }
    }

    pub fn set_relevant_edge(&mut self, time: Time, edge_id: usize) {
        self.relevant_edges.insert(time, edge_id);
    }
}

impl Blueprint<FlowWrapper, AssignedBattery> for BatteryBlueprint {
    fn construct(&self, from: &FlowWrapper) -> AssignedBattery {
        let mut edge_flows: HashMap<Time, i64> = HashMap::new();
        for (time, edge_id) in &self.relevant_edges {
            let flow = from.get_flow(*edge_id);
            edge_flows.insert(*time, flow);
        }
        edge_flows.insert(Time::from_timestep(0), self.battery.get_initial_level());
        let charge_level =
            Prognoses::from_closure(|t| *edge_flows.get(&t).expect("Missing edge flow"));
        AssignedBattery::new(self.battery.clone(), charge_level)
    }
}

/// A blueprint for constructing an `AssignedVariableAction` from a solved flow network.
pub struct VariableActionBlueprint {
    variable_action: Arc<VariableAction>,
    relevant_edges: HashMap<Time, usize>,
}

impl VariableActionBlueprint {
    pub fn new(variable_action: Arc<VariableAction>) -> Self {
        Self {
            variable_action,
            relevant_edges: HashMap::new(),
        }
    }

    pub fn set_relevant_edge(&mut self, time: Time, edge_id: usize) {
        self.relevant_edges.insert(time, edge_id);
    }
}

impl Blueprint<FlowWrapper, AssignedVariableAction> for VariableActionBlueprint {
    fn construct(&self, from: &FlowWrapper) -> AssignedVariableAction {
        let mut edge_flows: HashMap<Time, i64> = HashMap::new();
        for (time, edge_id) in &self.relevant_edges {
            let flow = from.get_flow(*edge_id);
            edge_flows.insert(*time, flow);
        }
        let start_time = self.variable_action.get_start();
        let end_time = self.variable_action.get_end();
        let consumption = (start_time..end_time)
            .iter_steps()
            .map(|t| *edge_flows.get(&t).expect("Missing edge flow"))
            .collect();
        AssignedVariableAction::new(self.variable_action.clone(), consumption)
    }
}

/// A blueprint for constructing the network consumption `Prognoses` from a solved flow network.
pub struct NetworkConsumptionBlueprint {
    relevant_edges: HashMap<Time, usize>,
}

impl NetworkConsumptionBlueprint {
    pub fn new() -> Self {
        Self {
            relevant_edges: HashMap::new(),
        }
    }

    pub fn set_relevant_edge(&mut self, time: Time, edge_id: usize) {
        self.relevant_edges.insert(time, edge_id);
    }
}

impl Blueprint<FlowWrapper, Prognoses<i64>> for NetworkConsumptionBlueprint {
    fn construct(&self, from: &FlowWrapper) -> Prognoses<i64> {
        Prognoses::from_closure(|t| {
            let edge_id = self
                .relevant_edges
                .get(&t)
                .expect("Missing relevant edge for network consumption");
            let flow = from.get_flow(*edge_id);
            flow
        })
    }
}

/// A container for all blueprints needed to construct a complete `Schedule`.
pub struct SmartHomeBlueprint {
    battery_blueprints: Vec<BatteryBlueprint>,
    variable_action_blueprints: Vec<VariableActionBlueprint>,
    network_consumption_blueprint: NetworkConsumptionBlueprint,
}

impl SmartHomeBlueprint {
    pub fn new(network_consumption_blueprint: NetworkConsumptionBlueprint) -> Self {
        Self {
            battery_blueprints: Vec::new(),
            variable_action_blueprints: Vec::new(),
            network_consumption_blueprint,
        }
    }
    pub fn add_battery_blueprint(&mut self, battery_blueprint: BatteryBlueprint) {
        self.battery_blueprints.push(battery_blueprint);
    }
    pub fn add_variable_action_blueprint(
        &mut self,
        variable_action_blueprint: VariableActionBlueprint,
    ) {
        self.variable_action_blueprints
            .push(variable_action_blueprint);
    }
}

impl Blueprint<FlowWrapper, Schedule> for SmartHomeBlueprint {
    fn construct(&self, from: &FlowWrapper) -> Schedule {
        let batteries: HashMap<u32, AssignedBattery> = self
            .battery_blueprints
            .iter()
            .map(|bp| bp.construct(from))
            .map(|ab| (ab.get_battery().get_id(), ab))
            .collect();
        let variable_actions: HashMap<u32, AssignedVariableAction> = self
            .variable_action_blueprints
            .iter()
            .map(|bp| bp.construct(from))
            .map(|ava| (ava.get_id(), ava))
            .collect();
        let network_consumption = self.network_consumption_blueprint.construct(from);
        Schedule::new(
            HashMap::new(),
            variable_actions,
            batteries,
            network_consumption,
        )
    }
}

/// A generic trait for constructing a high-level object `T` from a low-level source `F`.
///
/// In this context, it's used to build `Schedule` components from the `FlowWrapper` result.
pub trait Blueprint<F, T> {
    /// Constructs the object `T` from the source `F`.
    fn construct(&self, from: &F) -> T;
}

/// A builder for creating a `SmartHomeFlow` instance.
///
/// This builder sets up the entire flow network graph, adding nodes and edges
/// for generation, grid consumption, batteries, and variable actions based on
/// the provided prognoses and device configurations.
pub struct SmartHomeFlowBuilder {
    flow: FlowWrapper,
    blueprint: SmartHomeBlueprint,
    first_timestep_fraction: f32,
}
impl SmartHomeFlowBuilder {
    /// Creates a new `SmartHomeFlowBuilder` and initializes the basic network structure.
    ///
    /// This includes the source, sink, generator, and network nodes, as well as the
    /// main "wire" nodes for each timestep.
    pub fn new(
        generate_prog: &Prognoses<i64>,
        price_prog: &Prognoses<i64>,
        consume_prog: &Prognoses<i64>,
        first_timestep_fraction: f32,
    ) -> Self {
        let mut flow = FlowWrapper::new();
        let mut consumption_blueprint = NetworkConsumptionBlueprint::new();

        flow.add_edge(FlowNode::Source, FlowNode::Generator, i64::MAX, 0);
        flow.add_edge(FlowNode::Source, FlowNode::Network, i64::MAX, 0);

        for i in 0..STEPS_PER_DAY {
            // Edge from GENERATOR to wire for generation
            let gen_amount = *generate_prog.get(Time::from_timestep(i)).unwrap_or(&0) as i64;
            if gen_amount > 0 {
                flow.add_edge(
                    FlowNode::Generator,
                    FlowNode::Wire(Time::from_timestep(i)),
                    gen_amount,
                    0,
                );
            }

            // Edge from NETWORK to wire with cost based on price
            let price = *price_prog.get(Time::from_timestep(i)).unwrap_or(&0) as i64;
            let edge_id = flow.add_edge(
                FlowNode::Network,
                FlowNode::Wire(Time::from_timestep(i)),
                i64::MAX,
                price,
            );
            consumption_blueprint.set_relevant_edge(Time::from_timestep(i), edge_id);

            // Edge from wire to SINK for consumption
            let cons_amount = *consume_prog.get(Time::from_timestep(i)).unwrap_or(&0) as i64;
            if cons_amount > 0 {
                flow.add_edge(
                    FlowNode::Wire(Time::from_timestep(i)),
                    FlowNode::Sink,
                    cons_amount,
                    0,
                );
            }
        }

        let blueprint = SmartHomeBlueprint::new(consumption_blueprint);

        Self {
            flow,
            blueprint,
            first_timestep_fraction,
        }
    }

    /// Adds a battery to the flow network.
    pub fn add_battery(mut self, battery: &Arc<Battery>) -> Self {
        let id = battery.get_id();
        let mut battery_blueprint = BatteryBlueprint::new(battery.clone());

        // Initialize battery
        let initial_level = battery.get_initial_level() as i64;
        self.flow.add_edge(
            FlowNode::Source,
            FlowNode::Battery(id as usize, Time::from_timestep(0)),
            initial_level,
            0,
        );

        // Wire to Batteries
        for t in 0..STEPS_PER_DAY {
            let max_charge = if t == 0 {
                (battery.get_max_charge() as f32 * self.first_timestep_fraction).round() as i64
            } else {
                battery.get_max_charge()
            } as i64;

            // Wire to battery
            self.flow.add_edge(
                FlowNode::Wire(Time::from_timestep(t)),
                FlowNode::Battery(id as usize, Time::from_timestep(t)),
                max_charge,
                0,
            );

            let max_output = if t == 0 {
                (battery.get_max_output() as f32 * self.first_timestep_fraction).round() as i64
            } else {
                battery.get_max_output()
            } as i64;

            // Battery to wire
            self.flow.add_edge(
                FlowNode::Battery(id as usize, Time::from_timestep(t)),
                FlowNode::Wire(Time::from_timestep(t)),
                max_output,
                0,
            );
        }

        // Battery persistence
        for t in 0..STEPS_PER_DAY {
            let edge_id = self.flow.add_edge(
                FlowNode::Battery(id as usize, Time::from_timestep(t)),
                FlowNode::Battery(id as usize, Time::from_timestep(t + 1)),
                battery.get_capacity() as i64,
                0,
            );
            battery_blueprint.set_relevant_edge(Time::from_timestep(t + 1), edge_id);
        }
        self.blueprint.add_battery_blueprint(battery_blueprint);
        self
    }

    /// Adds multiple batteries to the flow network.
    pub fn add_batteries(mut self, batteries: &Vec<Arc<Battery>>) -> Self {
        for battery in batteries {
            self = self.add_battery(battery);
        }
        self
    }
    /// Adds a variable action to the flow network.
    pub fn add_action(mut self, action: &Arc<VariableAction>) -> Self {
        let mut variable_action_blueprint = VariableActionBlueprint::new(action.clone());
        for t in (action.get_start()..action.get_end()).iter_steps() {
            let max_consumption = if t.to_timestep() == 0 {
                (action.get_max_consumption() as f32 * self.first_timestep_fraction).round() as i64
            } else {
                action.get_max_consumption()
            } as i64;
            // Wire to action
            let edge_id = self.flow.add_edge(
                FlowNode::Wire(t),
                FlowNode::Action(action.get_id() as usize),
                max_consumption,
                0,
            );
            variable_action_blueprint.set_relevant_edge(t, edge_id);
        }

        // Action to Sink
        self.flow.add_edge(
            FlowNode::Action(action.get_id() as usize),
            FlowNode::Sink,
            action.get_total_consumption() as i64,
            0,
        );

        self.blueprint
            .add_variable_action_blueprint(variable_action_blueprint);
        self
    }
    /// Adds multiple variable actions to the flow network.
    pub fn add_actions(mut self, variable_actions: &Vec<Arc<VariableAction>>) -> Self {
        for action in variable_actions {
            self = self.add_action(action);
        }
        self
    }
    /// Builds the final `SmartHomeFlow` instance.
    pub fn build(mut self) -> SmartHomeFlow {
        // self.flow.mincostflow();
        SmartHomeFlow::new(self.flow, self.blueprint)
    }
}
/// Represents the smart home as a solvable flow network.
///
/// This struct holds the flow graph, the blueprint for schedule construction,
/// and the state of constant actions. It provides methods to add/remove
/// constant consumption, calculate the optimal flow, and retrieve the total cost
/// and the final `Schedule`.
pub struct SmartHomeFlow {
    flow: StackProxy<FlowWrapper>,

    constant_actions: HashMap<u32, AssignedConstantAction>,

    calc_result: Option<i64>,

    blueprint: SmartHomeBlueprint,
}

// WARNING: wire has ID = 0, make sure no node uses this ID!
impl SmartHomeFlow {
    /// Creates a new `SmartHomeFlow`.
    pub fn new(flow: FlowWrapper, blueprint: SmartHomeBlueprint) -> Self {
        let mut flow: StackProxy<FlowWrapper> = StackProxy::new(flow);
        flow.push();
        SmartHomeFlow {
            flow,
            constant_actions: HashMap::new(),
            calc_result: None,
            blueprint,
        }
    }

    // Both functions work in progress:
    /// Adds a fixed consumption from a `ConstantAction` to the model.
    /// This invalidates the current cost calculation.
    pub fn add_constant_consumption(&mut self, constant_action: AssignedConstantAction) {
        self.constant_actions
            .insert(constant_action.get_id(), constant_action);
        self.calc_result = None;
    }

    /// Removes a fixed consumption by its action ID.
    /// This invalidates the current cost calculation.
    pub fn remove_constant_consumption(&mut self, id: u32) -> Option<AssignedConstantAction> {
        self.calc_result = None;
        self.constant_actions.remove(&id)
    }

    /// Internal function to solve the min-cost max-flow problem.
    ///
    /// It first applies the current constant action consumptions to the graph
    /// before running the solver. The result is cached.
    fn calc_flow(&mut self) {
        let start = Instant::now();
        self.flow.pop();
        self.flow.push();

        let inner_start = Instant::now();
        for (_, constant_action) in &self.constant_actions {
            let start = constant_action.get_start_time().to_timestep() as usize;
            let end = constant_action.get_end_time().to_timestep() as usize;
            for t in start..end {
                // Wire to sink
                self.flow.add_edge(
                    FlowNode::Wire(Time::from_timestep(t as u32)),
                    FlowNode::Sink,
                    constant_action.get_consumption() as i64,
                    1,
                );
            }
        }
        let (flow_cost, flow_value) = self.flow.mincostflow();
        self.calc_result = Some(flow_cost);
        let inner_duration = inner_start.elapsed();
        let duration = start.elapsed();
    }
    /// Returns the total cost of the optimal schedule.
    ///
    /// If the cost has not been calculated yet, this triggers `calc_flow`.
    pub fn get_cost(&mut self) -> i64 {
        if self.calc_result.is_none() {
            self.calc_flow();
        }
        self.calc_result.unwrap()
    }
    /// Returns the full, optimal `Schedule`.
    ///
    /// If the schedule has not been calculated yet, this triggers `calc_flow`.
    pub fn get_schedule(&mut self) -> Schedule {
        if self.calc_result.is_none() {
            self.calc_flow();
        }
        self.blueprint.construct(&self.flow)
    }
}

/*
let builder = SmartHomeFlowBuilder::new(
    generate_prog,
    price_prog,
    consume_prog,
)
.add_battery(battery1)
.add_battery(battery2)
.add_variable_action(variable_action1);
let smart_home_flow = builder.build();
*/
