use std::collections::HashSet;
use std::rc::Rc;
use std::sync::Arc;
use std::{collections::HashMap, hash::Hash};

use std::time::Instant;

use crate::helper::stack_proxy::StackProxy;
use crate::optimizer::flow_optimizer::flow::FlowWrapper;
use crate::optimizer::flow_optimizer::flow::wrapper::FlowNode;
use crate::optimizer_context::action::constant::{self, AssignedConstantAction, ConstantAction};
use crate::optimizer_context::action::variable::{AssignedVariableAction, VariableAction};
use crate::optimizer_context::battery::{AssignedBattery, Battery};
use crate::optimizer_context::prognoses::Prognoses;
use crate::schedule::Schedule;
use crate::time::{STEPS_PER_DAY, Time, TimeIterator};

mod flow_optimizer;

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
            Prognoses::from_closure(|t| edge_flows.get(&t).expect("Missing edge flow").clone());
        AssignedBattery::new(self.battery.clone(), charge_level)
    }
}

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
            .map(|t| edge_flows.get(&t).expect("Missing edge flow").clone())
            .collect();
        AssignedVariableAction::new(self.variable_action.clone(), consumption)
    }
}

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
            flow as i64
        })
    }
}

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

pub trait Blueprint<F, T> {
    fn construct(&self, from: &F) -> T;
}
pub struct SmartHomeFlowBuilder {
    flow: FlowWrapper,
    blueprint: SmartHomeBlueprint,
    first_timestep_fraction: f32,
}
impl SmartHomeFlowBuilder {
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
            // flow.add_edge(
            //     FlowNode::Network,
            //     FlowNode::Wire(Time::from_timestep(i)),
            //     i64::MAX,
            //     price,
            // );
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

    pub fn add_batteries(mut self, batteries: &Vec<Arc<Battery>>) -> Self {
        for battery in batteries {
            self = self.add_battery(battery);
        }
        self
    }
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
    pub fn add_actions(mut self, variable_actions: &Vec<Arc<VariableAction>>) -> Self {
        for action in variable_actions {
            self = self.add_action(action);
        }
        self
    }
    pub fn build(mut self) -> SmartHomeFlow {
        // self.flow.mincostflow();
        SmartHomeFlow::new(self.flow, self.blueprint)
    }
}
pub struct SmartHomeFlow {
    flow: StackProxy<FlowWrapper>,

    constant_actions: HashMap<u32, AssignedConstantAction>,

    calc_result: Option<i64>,

    blueprint: SmartHomeBlueprint,
}

// WARNING: wire has ID = 0, make sure no node uses this ID!
impl SmartHomeFlow {
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
    pub fn add_constant_consumption(&mut self, constant_action: AssignedConstantAction) {
        self.constant_actions
            .insert(constant_action.get_id(), constant_action);
        self.calc_result = None;
    }

    pub fn remove_constant_consumption(&mut self, id: u32) -> Option<AssignedConstantAction> {
        self.calc_result = None;
        self.constant_actions.remove(&id)
    }

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
        // println!("start flow");
        let (flow_cost, flow_value) = self.flow.mincostflow();
        self.calc_result = Some(flow_cost);
        // println!("Total flow: {}, Total cost: {}", flow_value, flow_cost);
        let inner_duration = inner_start.elapsed();
        // println!("Flow setup took: {:?}", inner_duration);
        let duration = start.elapsed();
        // println!("Flow calculation took: {:?}", duration);
    }
    pub fn get_cost(&mut self) -> i64 {
        if self.calc_result.is_none() {
            self.calc_flow();
        }
        self.calc_result.unwrap()
    }
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
