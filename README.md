# Electricity Price Optimizer

## Project Description
The Electricity Price Optimizer is a web-based platform designed for smart-home households to manage energy consumption intelligently. The system's primary goal is to maximize self-consumption and minimize electricity costs by automatically creating 24-hour schedules for controllable devices. It operates in real-time, continuously matching predicted values with actual measurement data and adjusting plans as needed. Currently smart home devices are simulated, but the architecture allows for easy integration of real devices in the future.

## Key Features
- **Device Management:** Add, edit, and delete various energy devices, including producers (PV systems), consumers (washing machines, EVs), and storage units (batteries).
- **Smart Planning:** Automatically schedules time-flexible actions—like a laundry cycle—to ensure they finish by a deadline at the lowest possible cost.
- **Generation Forecasts:** Provides specific forecasts for solar energy production based on system data like orientation and area.
- **Dynamic Optimization:** Integrates real-time electricity prices and weather data to calculate the most cost-effective energy usage.
- **Visualization:** Clear graphical displays for both the 24-hour schedules and the generation forecasts.
- **Plan Export:** Export the optimized schedule as a PDF or CSV file.

## Device and Action Types

### Producers (Erzeuger)
Devices that generate electricity, e.g. a PV system. The application forecasts their output over the next 24 hours based on location, panel orientation, tilt angle, and rated power, combined with weather data from Open-Meteo.

### Storage (Speicher)
Devices that store and release electricity, e.g. a battery. Configured with a capacity, initial charge level, maximum charge rate, and maximum discharge rate. The optimizer decides when to charge and discharge the battery to minimize overall costs.

### Consumers: Constant Actions vs. Variable Actions

Controllable consumer devices are modelled through **actions**, and the system supports two fundamentally different action types:

#### Constant Actions (Konstante Aktionen)
A constant action has a **fixed duration and a fixed power draw** — for example, a washing machine cycle that always runs for 90 minutes at 2 kW. The optimizer is free to choose *when* the action starts, but must guarantee it finishes before a user-defined deadline. The action runs as a single uninterrupted block.

> **Example:** "Run the washing machine for 90 minutes, finishing by 16:30."
> The optimizer might schedule it to start at 11:00 when solar production is high and grid prices are low.

Constant actions are the main degree of freedom explored by the **Simulated Annealing** algorithm, which shifts their start times to find the lowest-cost combination.

#### Variable Actions (Variable Aktionen)
A variable action has a **fixed total energy requirement but a flexible consumption profile** — the optimizer decides how to distribute the load across the available time window. A maximum power limit per time step can be set. This models devices like an EV charger, where the total energy needed is known but charging can be spread freely across several hours.

> **Example:** "Charge the EV with 30 kWh total, with a maximum of 11 kW per hour, finishing by 07:00."
> The optimizer might charge heavily during the cheapest overnight hours and slow down during expensive periods.

Variable actions are handled by the **Min-Cost-Max-Flow** inner search, which optimally distributes their consumption across time steps given the fixed schedule of constant actions.

#### Comparison

| | Constant Action | Variable Action |
|---|---|---|
| **Example device** | Washing machine, dishwasher | EV charger |
| **Power profile** | Fixed (runs at constant draw) | Flexible (spread across time window) |
| **What is defined** | Duration + power draw + deadline | Total energy + max power + deadline |
| **Optimized by** | Simulated Annealing (start time) | Min-Cost-Max-Flow (load distribution) |

## How the Optimizer Works

The optimizer is written in **Rust** and communicates with the Python backend via **PyO3**. It takes an `OptimizerContext` as input — containing electricity price forecasts, PV generation forecasts, and the configured devices and actions — and returns a `Schedule` describing the optimal behavior of every device for the next 24 hours.

The optimizer combines two algorithms: **Simulated Annealing** as the outer search, and **Min-Cost-Max-Flow** as an inner local search.

### Simulated Annealing
Simulated Annealing is a probabilistic metaheuristic that searches for a global optimum by exploring neighboring states and occasionally accepting worse solutions to avoid getting stuck in local optima. The probability of accepting a worse state decreases over time as the system "cools down".

The optimized state consists of the start times of all constant actions. In each iteration, a random `Change` is applied — for example shifting one action to a new time within its allowed window. The acceptance decision follows the **Metropolis criterion**: a state that increases cost by ΔE is accepted with probability:

$$P = e^{-\Delta E \, / \, T}$$

where T is the current temperature. If the new state is rejected, the change is undone via `change.undo()`. The best state found across all iterations is kept and used to generate the final schedule.
```
S       ← InitialState(context)
S_best  ← S
T       ← T_start

while T > T_end:
    change ← RandomChange()
    change.apply(S)
    RunLocalSearch(S)        // Min-Cost-Max-Flow
    ΔE ← Cost(S) − Cost(S_prev)
    if ΔE < 0 or random(0,1) < e^(−ΔE/T):
        if Cost(S) < Cost(S_best):
            S_best ← Copy(S)
    else:
        change.undo(S)
    T ← T × CoolingRate

return GenerateSchedule(S_best)
```

### Min-Cost-Max-Flow (Local Search)
After each mutation, a **Min-Cost-Max-Flow** algorithm is run as a local search to determine the optimal behavior of batteries and variable-load devices (e.g. EV charging) given the fixed constant action start times. The energy system is modelled as a directed flow graph where nodes represent time steps, energy sources, consumers, and storage, and edges carry capacity and cost constraints. The algorithm finds the cost-minimal way to route energy through the network at each time step, deciding for example whether surplus solar energy should be stored in a battery, consumed by an EV, or fed back to the grid.

This combination means Simulated Annealing only needs to search over the discrete space of constant action start times, while Min-Cost-Max-Flow efficiently handles all continuous energy distribution decisions within each evaluated state.


### External Services
| Service | Purpose |
|---|---|
| [forecast.solar](https://forecast.solar/) | PV generation forecasts based on system parameters |
| [Awattar](https://www.awattar.de/) | Day-ahead electricity market prices |
| Google Maps JavaScript API | Location selection for PV system placement |

### Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Python + FastAPI |
| Backend ORM | SQLAlchemy |
| Optimizer | Rust |
| Python–Rust bridge | PyO3 |
| Database | SQLite |
| Containerization | Docker |

## Deployment Instructions
The following must be installed:
- Git
- Docker (incl. Docker Compose v2 or newer)

Verify the installation:
```bash
docker --version
docker compose version
```

### Cloning the Project
```bash
git clone https://github.com/ArneCode/strompreis-optimierer.git
cd strompreis-optimierer
```

### Starting the Application
Navigate to the backend folder:
```bash
cd backend
```

Then start the application with one of the two options:

**(1) Start in foreground**
```bash
docker compose up --build
```

**(2) Start in background**
```bash
docker compose up -d --build
```

The application is then accessible at:
```
http://localhost
```

To stop the application, press `CTRL + C` (option 1) or run (option 2):
```bash
docker compose down
```

## Usage Guide

### Managing Devices
Navigate to **Mein Haushalt → Geräte Manager** to add, edit, or remove devices. Three device types are supported:
- **Erzeuger (Producer):** e.g. a PV system – requires orientation, tilt angle, location, and rated power.
- **Verbraucher (Consumer):** e.g. a washing machine – requires rated power, energy per cycle, and a time window within which the action must complete.
- **Speicher (Storage):** e.g. a battery – requires capacity, initial charge level, and maximum charge/discharge rates.

### Generating a Schedule
Navigate to **Mein Plan → Übersicht** and click **"Ablaufplan erstellen"**. The system will gather device data, fetch current electricity prices and weather forecasts, run the optimizer, and display the resulting 24-hour schedule. The plan can be manually refreshed at any time or will update automatically when input data changes significantly.

### Viewing Forecasts and Prices
- **Mein Plan → Prognosen:** Shows expected PV generation for the next 12 or 24 hours.
- **Mein Plan → Preis Manager:** Shows hourly electricity prices for the next 12 or 24 hours.

### Resetting the Application
Navigate to **Einstellungen** and use the **"Haushalt zurücksetzen"** option to delete all devices, schedules, and preferences and restore the application to its default state.

## Project Context
This project was developed as part of the **Praxis der Softwareentwicklung (PSE)** course in Winter Semester 2025/26 at the **Karlsruhe Institute of Technology (KIT)**, supervised by Philip Ochs and Niklas Seng at the TVA Institute (Prof. Dr. Ina Schaefer).