//! Provides a stack-based proxy for managing state that can be easily saved and restored.

use std::ops::{Deref, DerefMut};

/// A proxy that manages a stack of states of type `T`.
///
/// This allows for stateful objects to be modified, with the ability to `push` (save)
/// the current state and `pop` (restore) the previous state. It's useful for
/// algorithms that explore different states, like simulated annealing.
///
/// It provides `Deref` and `DerefMut` to the top element of the stack, so it can be
/// used like a direct reference to `T`.
pub struct StackProxy<T: Clone> {
    stack: Vec<T>,
}

impl<T: Clone> StackProxy<T> {
    /// Creates a new `StackProxy` with an initial state.
    pub fn new(initial: T) -> Self {
        Self {
            stack: vec![initial],
        }
    }
    /// Pushes a clone of the current top state onto the stack, saving it.
    pub fn push(&mut self) {
        let top = self.stack.last().unwrap().clone();
        self.stack.push(top);
    }
    /// Pops the top state from the stack, restoring the previous state.
    ///
    /// # Panics
    /// Panics if trying to pop the last remaining state from the stack.
    pub fn pop(&mut self) {
        if self.stack.len() > 1 {
            self.stack.pop();
        } else {
            panic!("Cannot pop the last state from the stack");
        }
    }
}

impl<T: Clone> Deref for StackProxy<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        self.stack.last().unwrap()
    }
}

impl<T: Clone> DerefMut for StackProxy<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.stack.last_mut().unwrap()
    }
}

impl<T: Clone> Default for StackProxy<T>
where
    T: Default,
{
    /// Creates a default `StackProxy` with the default value of `T` as the initial state.
    fn default() -> Self {
        Self::new(T::default())
    }
}
