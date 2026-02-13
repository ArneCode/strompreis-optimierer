//! An implementation of the min-cost max-flow algorithm using SPFA (Shortest Path Faster Algorithm).
//!
//! This code is adapted for the project's needs and provides the core solver
//! for the flow-based optimization.

use std::{
    cmp::Reverse,
    collections::{BinaryHeap, VecDeque},
    io::{self, Read, Write},
};

const INF: i64 = 1_i64 << 60;

#[derive(Clone)]
struct Edge {
    to: usize,
    f: i64,
    cost: i64,
}

/// A solver for the min-cost max-flow problem on a directed graph.
#[derive(Clone)]
pub struct MinCostFlow {
    n: usize,
    edges: Vec<Edge>,
    adj: Vec<Vec<usize>>,
    pref: Vec<usize>,
    con: Vec<usize>,
    dist: Vec<i64>,
    pi: Vec<i64>,
    s: usize,
    t: usize,
    maxflow: i64,
    mincost: i64,
}

impl MinCostFlow {
    /// Creates a new `MinCostFlow` instance with a source and a sink node.
    pub fn new() -> Self {
        Self {
            n: 2,
            edges: vec![],
            adj: vec![vec![]; 2],
            pref: vec![],
            con: vec![],
            dist: vec![],
            pi: vec![],
            s: 0,
            t: 1,
            maxflow: 0,
            mincost: 0,
        }
    }

    /// Returns the ID of the source node.
    pub fn get_source(&self) -> usize {
        self.s
    }

    /// Returns the ID of the sink node.
    pub fn get_sink(&self) -> usize {
        self.t
    }

    /// Returns the final flow value for a given edge ID after the algorithm has run.
    pub fn get_flow(&self, edge_id: usize) -> i64 {
        self.edges[edge_id ^ 1].f
    }

    /// Adds a new node to the graph and returns its ID.
    pub fn new_node(&mut self) -> usize {
        self.adj.push(vec![]);
        self.n += 1;
        self.n - 1
    }

    /// Adds a directed edge from node `u` to `v` with capacity `cap` and cost `cost`.
    /// Returns the ID of the created edge.
    pub fn add_edge(&mut self, u: usize, v: usize, cap: i64, cost: i64) -> usize {
        self.adj[u].push(self.edges.len());
        self.edges.push(Edge {
            to: v,
            f: cap,
            cost,
        });
        self.adj[v].push(self.edges.len());
        self.edges.push(Edge {
            to: u,
            f: 0,
            cost: -cost,
        });
        return self.edges.len() - 2;
    }

    fn spfa_with_cycle_cancel(&mut self) -> bool {
        let n = self.adj.len();
        self.pref = vec![usize::MAX; n];
        self.dist = vec![INF; n];
        let mut inq = vec![false; n];
        let mut cnt = vec![0usize; n];
        let mut q = VecDeque::new();

        self.dist[self.s] = 0;
        self.pref[self.s] = self.s;
        q.push_back(self.s);
        inq[self.s] = true;

        while let Some(u) = q.pop_front() {
            inq[u] = false;
            for &id in &self.adj[u] {
                let e = &self.edges[id];
                if e.f > 0 && self.dist[e.to] > self.dist[u] + e.cost {
                    self.dist[e.to] = self.dist[u] + e.cost;
                    self.pref[e.to] = u;
                    self.con[e.to] = id;
                    cnt[e.to] += 1;

                    // Negative cycle detected - cancel it!
                    if cnt[e.to] >= n {
                        self.cancel_negative_cycle(e.to);
                        // Reset and restart SPFA
                        return self.spfa_with_cycle_cancel();
                    }

                    if !inq[e.to] {
                        inq[e.to] = true;
                        q.push_back(e.to);
                    }
                }
            }
        }
        self.pref[self.t] != usize::MAX
    }

    fn cancel_negative_cycle(&mut self, start: usize) {
        // Find the cycle by walking back through predecessors
        let n = self.adj.len();
        let mut visited = vec![false; n];
        let mut u = start;

        // Get to a node definitely in the cycle
        for _ in 0..n {
            u = self.pref[u];
        }

        // Find min capacity around the cycle and collect edges
        let cycle_start = u;
        let mut min_cap = INF;
        let mut cycle_edges = vec![];

        loop {
            let id = self.con[u];
            cycle_edges.push(id);
            min_cap = min_cap.min(self.edges[id].f);
            u = self.pref[u];
            if u == cycle_start {
                break;
            }
        }

        // Push flow around cycle (reduces cost, doesn't change max flow)
        let mut cycle_cost = 0i64;
        for &id in &cycle_edges {
            cycle_cost += self.edges[id].cost;
            self.edges[id].f -= min_cap;
            self.edges[id ^ 1].f += min_cap;
        }

        // Update mincost (cycle_cost is negative, so this reduces total cost)
        self.mincost += cycle_cost * min_cap;
    }

    fn dijkstra(&mut self) -> bool {
        let n = self.adj.len();
        // reset predecessor, distance
        self.pref = vec![usize::MAX; n];
        self.dist = vec![INF; n];

        // min‐heap of (dist, node)
        let mut heap = BinaryHeap::new();

        // start at source
        self.dist[self.s] = 0;
        self.pref[self.s] = self.s;
        heap.push(Reverse((0, self.s)));

        while let Some(Reverse((d, u))) = heap.pop() {
            // stale entry?
            if d != self.dist[u] {
                continue;
            }
            // relax all residual edges out of u
            for &id in &self.adj[u] {
                let e = &self.edges[id];
                let v = e.to;
                if e.f > 0 && self.pi[u] != INF && self.pi[v] != INF {
                    let nd = d + (e.cost - self.pi[v] + self.pi[u]);
                    if nd < self.dist[v] {
                        self.dist[v] = nd;
                        self.pref[v] = u;
                        self.con[v] = id;
                        heap.push(Reverse((nd, v)));
                    }
                }
            }
        }

        if self.pref[self.t] == usize::MAX {
            return false;
        }

        for i in 0..self.dist.len() {
            self.dist[i] -= self.pi[self.s] - self.pi[i];
        }

        true
    }

    fn spfa(&mut self) -> bool {
        let n = self.adj.len();
        self.pref = vec![usize::MAX; n];
        self.dist = vec![INF; n];
        let mut inq = vec![false; n];
        let mut q = VecDeque::new();

        self.dist[self.s] = 0;
        self.pref[self.s] = self.s;
        q.push_back(self.s);
        inq[self.s] = true;

        while let Some(u) = q.pop_front() {
            inq[u] = false;
            for &id in &self.adj[u] {
                let e = &self.edges[id];
                if e.f > 0 && self.dist[e.to] > self.dist[u] + e.cost {
                    self.dist[e.to] = self.dist[u] + e.cost;
                    self.pref[e.to] = u;
                    self.con[e.to] = id;
                    if !inq[e.to] {
                        inq[e.to] = true;
                        q.push_back(e.to);
                    }
                }
            }
        }
        self.pref[self.t] != usize::MAX
    }

    fn extend(&mut self) {
        let mut w = INF;
        let mut u = self.t;
        while self.pref[u] != u {
            let id = self.con[u];
            w = w.min(self.edges[id].f);
            u = self.pref[u];
        }

        self.maxflow += w;
        self.mincost += self.dist[self.t] * w;

        let mut u = self.t;
        while self.pref[u] != u {
            let id = self.con[u];
            self.edges[id].f -= w;
            self.edges[id ^ 1].f += w;
            u = self.pref[u];
        }

        for i in 0..self.pi.len() {
            if self.dist[i] < INF {
                self.pi[i] += self.dist[i];
            }
        }
    }

    /// Runs the min-cost max-flow algorithm and returns the total cost and total flow.
    ///
    /// This initializes the potentials and repeatedly finds augmenting paths using SPFA
    /// until no more paths can be found.
    pub fn mincostflow(&mut self) -> (i64, i64) {
        let n = self.adj.len();
        self.con = vec![0; n];
        self.pi = vec![0; n];
        self.maxflow = 0;
        self.mincost = 0;
        return self.update_flow();
    }

    /// Updates the flow calculation. Can be called after modifying the graph.
    pub fn update_flow(&mut self) -> (i64, i64) {
        // println!("Updating flow...");
        let n = self.adj.len();
        if self.con.len() < n {
            self.con.resize(n, 0);
        }
        if self.pi.len() < n {
            self.pi.resize(n, 0);
        }

        while self.spfa() {
            self.extend();
        }
        // println!(
        //     "Flow updated: cost = {}, flow = {}",
        //     self.mincost, self.maxflow
        // );
        return (self.mincost, self.maxflow);
    }
}
