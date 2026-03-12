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
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let proxy = StackProxy::new(10);
        assert_eq!(*proxy, 10);
    }

    #[test]
    fn test_deref_mut_modification() {
        let mut proxy = StackProxy::new(10);
        *proxy += 5;
        assert_eq!(*proxy, 15);
    }

    #[test]
    fn test_push_preserves_and_clones() {
        let mut proxy = StackProxy::new(100);
        proxy.push(); // Save state 100

        *proxy = 200; // Modify top
        assert_eq!(*proxy, 200);

        proxy.pop(); // Restore
        assert_eq!(*proxy, 100);
    }

    #[test]
    fn test_nested_stacks() {
        let mut proxy = StackProxy::new(String::from("A"));

        proxy.push();
        proxy.push_str("B"); // State is now "AB"

        proxy.push();
        proxy.push_str("C"); // State is now "ABC"

        assert_eq!(*proxy, "ABC");

        proxy.pop();
        assert_eq!(*proxy, "AB");

        proxy.pop();
        assert_eq!(*proxy, "A");
    }

    #[test]
    fn test_default_trait() {
        // Only works if the inner type implements Default
        let proxy: StackProxy<i32> = StackProxy::default();
        assert_eq!(*proxy, 0);
    }

    #[test]
    #[should_panic(expected = "Cannot pop the last state from the stack")]
    fn test_pop_panic_on_empty() {
        let mut proxy = StackProxy::new(1);
        proxy.pop(); // Should panic because length is 1
    }

    #[test]
    fn test_complex_struct_state() {
        #[derive(Clone, PartialEq, Debug)]
        struct State {
            score: f64,
            path: Vec<u32>,
        }

        let initial = State {
            score: 0.0,
            path: vec![1],
        };
        let mut proxy = StackProxy::new(initial.clone());

        proxy.push();
        proxy.score = 10.5;
        proxy.path.push(2);

        assert_ne!(*proxy, initial);

        proxy.pop();
        assert_eq!(*proxy, initial);
    }
}
