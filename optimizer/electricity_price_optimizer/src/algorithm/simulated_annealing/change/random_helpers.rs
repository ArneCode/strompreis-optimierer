//! Provides helper functions for generating random values for the simulated annealing changes.
// --- Required Crates ---
use rand::Rng;

// The statrs crate provides the necessary mathematical functions
// for the Normal distribution's Cumulative Distribution Function (CDF)
// and Inverse CDF (Quantile function).
use statrs::distribution::{ContinuousCDF, Normal};

/// Samples a random value from a Normal distribution centered at `c`,
/// with a spread defined by `sigma`, and truncated (censored) to the range [`a`, `b`].
///
/// This method uses Inverse Transform Sampling (Censored Normal Distribution)
/// and avoids the inefficient rejection sampling loop.
///
/// # Arguments
/// * `a`: The minimum value (lower bound).
/// * `b`: The maximum value (upper bound).
/// * `c`: The mean/center of the underlying Normal distribution.
/// * `sigma`: The standard deviation (controls the spread).
/// * `rng`: A mutable reference to the random number generator.
///
/// # Panics
/// Panics if sigma <= 0.0 or if a >= b.
pub fn sample_centered<R: Rng>(a: f64, b: f64, c: f64, sigma: f64, rng: &mut R) -> f64 {
    // 1. Define the Normal distribution object from the statrs crate
    let normal =
        Normal::new(c, sigma).expect("Invalid parameters: sigma must be greater than 0.0.");

    // 2. Calculate the cumulative probabilities at the boundaries
    // This finds the total probability mass between negative infinity and 'a', and 'b'.
    let p_start = normal.cdf(a);
    let p_end = normal.cdf(b);

    // 4. Sample a value U from this restricted uniform range
    let u_new: f64 = rng.random_range(p_start..=p_end);

    // 5. Use the Inverse CDF (Quantile function) to transform U back to the value space
    // This is the sample from the truncated Normal distribution.
    normal.inverse_cdf(u_new)
}

/// Samples a random integer value from a Normal distribution centered at `c`,
/// with a spread defined by `sigma`, and truncated (censored) to the integer range [`a`, `b`].
pub fn sample_centered_int<R: Rng, T: Into<f64> + TryFrom<i64>>(
    a: T,
    b: T,
    c: T,
    sigma: f64,
    rng: &mut R,
) -> T {
    let sample = sample_centered(a.into(), b.into(), c.into(), sigma, rng);
    (sample.round() as i64).try_into().unwrap_or_else(|_| {
        panic!("Failed to convert sampled value to target integer type. Sample: {sample}")
    })
}
