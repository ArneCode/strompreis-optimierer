# Electricity Price Optimizer – Python Bindings

This crate provides Python bindings (via [PyO3](https://pyo3.rs)) for the
`electricity_price_optimizer` Rust library.  It is compiled into a native
Python module called **`electricity_price_optimizer_py`**.

## Purpose

The wrapper bridges the gap between the Python backend (Flask application) and
the Rust-based optimization engine.  It handles:

- **Unit conversions** – translating user-facing units (`Watt`, `WattHour`,
  `Euro`, `EuroPerWh`) into the internal milli-Wh / micro-euro integer
  representations the solver uses, and back again.
- **Time conversions** – mapping `datetime.datetime` (UTC) objects from Python
  to the optimizer's discrete `Time` (timestep-based) domain and vice-versa,
  including validation of timestep-boundary alignment.
- **Prognoses bridging** – `PrognosesProvider` accepts a Python callable
  `(current_dt, next_dt) -> T` and samples it once per timestep to build the
  internal `Prognoses<T>` arrays.
- **Context building** – `OptimizerContext` accumulates batteries, constant
  actions, variable actions, generated-electricity prognoses, and
  already-running ("past") actions from Python before handing them to the Rust
  solver.
- **Schedule exposure** – the `Schedule` returned by the optimizer is wrapped
  so that Python code can query assigned start/end times, per-timestep
  consumption, battery charge levels, and network consumption as `TimeSeries`
  objects.

## Module Structure

```
electricity_price_optimizer_py
├── units                 # Watt, WattHour, Euro, EuroPerWh
├── PrognosesProvider     # wraps a Python callable into Prognoses<T>
├── OptimizerContext      # builder: add actions / batteries / prognoses
├── Schedule              # result: query assigned actions & batteries
├── ConstantAction        # fixed-duration action definition
├── AssignedConstantAction
├── VariableAction        # flexible-load action definition
├── AssignedVariableAction
├── Battery               # battery definition
├── AssignedBattery       # battery schedule result
├── DataPoint             # (timestamp, value) pair
├── TimeSeries            # bounded list of DataPoints
└── run_simulated_annealing(context) -> (Euro, Schedule)
```

## Key Concepts

### Timesteps

The optimizer discretises the day into **5-minute timesteps**
(`MINUTES_PER_TIMESTEP = 5`).  All `datetime` values passed from Python must
sit on a timestep boundary (minute divisible by 5, seconds and nanoseconds
equal to zero) – with the sole exception of the `start_time`, which may fall
mid-timestep.  In that case a `first_timestep_fraction` is computed so the
solver scales capacities and rates for the partial first interval.

### Units & Internal Representation

| Python type   | Internal (i64)        | Conversion factor          |
|---------------|-----------------------|----------------------------|
| `Watt`        | milli-Wh per timestep | `W × (timestep minutes / 60) × 1000` |
| `WattHour`    | milli-Wh              | `Wh × 1000`               |
| `Euro`        | nano-euro             | `€ × 1 000 000 000`       |
| `EuroPerWh`   | micro-euro per Wh     | `€/Wh × 1 000 000`        |

All arithmetic operators are overloaded on the Python side so that
`Watt * timedelta → WattHour`, `WattHour * EuroPerWh → Euro`, etc.

### Workflow

1. **Create** an `OptimizerContext(time, electricity_price_provider)`.
2. **Add** devices: `add_battery(...)`, `add_constant_action(...)`,
   `add_variable_action(...)`, `add_generated_electricity_prognoses(...)`,
   `add_past_constant_action(...)`.
3. **Run** `cost, schedule = run_simulated_annealing(context)`.
   The GIL is released during the Rust computation.
4. **Query** the `Schedule`: `schedule.get_constant_action(id)`,
   `schedule.get_battery(id).get_charge_level_time_series()`, etc.

## Building

The crate is built with [maturin](https://www.maturin.rs/):

```bash
cd optimizer
maturin develop --release
```

This compiles the Rust code and installs the resulting
`electricity_price_optimizer_py` package into the active Python environment.

## Dependencies

- **Rust side**: `electricity_price_optimizer` (the core solver),
  `pyo3` (Python bindings), `chrono` (datetime handling).
- **Python side**: only the standard library and `datetime` from `chrono`
  (exposed automatically by PyO3).
