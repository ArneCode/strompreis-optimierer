use std::{
    collections::HashMap,
    ops::{Deref, DerefMut},
};

use crate::{optimizer::flow_optimizer::flow::MinCostFlow, time::Time};

/// A wrapper around `MinCostFlow` to provide a more ergonomic API using `FlowNode` enums.
///
/// This struct manages the mapping between the high-level `FlowNode` representation
/// and the low-level integer node IDs used by the `MinCostFlow` implementation.
#[derive(Clone)]
pub struct FlowWrapper {
    pub inner: MinCostFlow,
    node_map: HashMap<FlowNode, usize>,
}

impl FlowWrapper {
    /// Creates a new `FlowWrapper` and initializes the source and sink nodes.
    pub fn new() -> Self {
        let inner = MinCostFlow::new();
        let node_map = HashMap::from([
            (FlowNode::Source, inner.get_source()),
            (FlowNode::Sink, inner.get_sink()),
        ]);
        Self { inner, node_map }
    }

    /// Gets the integer ID for a `FlowNode`, creating a new node if it doesn't exist.
    fn node(&mut self, key: FlowNode) -> usize {
        if let Some(&id) = self.node_map.get(&key) {
            id
        } else {
            let id = self.inner.new_node();
            self.node_map.insert(key, id);
            id
        }
    }

    /// Adds an edge between two `FlowNode`s with a given capacity and cost.
    pub fn add_edge(&mut self, u: FlowNode, v: FlowNode, cap: i64, cost: i64) -> usize {
        let u_id = self.node(u);
        let v_id = self.node(v);
        self.inner.add_edge(u_id, v_id, cap, cost)
    }

    /// Creates a new, unnamed node in the underlying flow graph.
    pub fn new_node(&mut self) -> usize {
        self.inner.new_node()
    }

    /// Runs the min-cost max-flow algorithm on the graph.
    pub fn mincostflow(&mut self) -> (i64, i64) {
        self.inner.mincostflow()
    }
}

impl Default for FlowWrapper {
    fn default() -> Self {
        Self::new()
    }
}

impl Deref for FlowWrapper {
    type Target = MinCostFlow;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl DerefMut for FlowWrapper {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

/// Represents a distinct node in the smart home flow network.
///
/// This enum provides a high-level, semantic representation for nodes, which the
/// `FlowWrapper` translates into integer IDs for the underlying solver.
#[derive(Debug, Hash, PartialEq, Eq, Clone)]
pub enum FlowNode {
    /// A node representing the main electrical line at a specific timestep.
    Wire(Time), // timestep
    /// A sink node for a specific variable action.
    Action(usize), // action id
    /// A node representing a battery's state at a specific timestep.
    Battery(usize, Time), // battery id, timestep
    /// The global source of all flow (energy).
    Source,
    /// The global sink for all flow (energy).
    Sink,
    /// The node representing the external electricity grid.
    Network,
    /// The node representing local electricity generation (e.g., solar).
    Generator,
}
