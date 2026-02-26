from typing import Tuple
from electricity_price_optimizer_py import OptimizerContext, Schedule, SimulatedAnnealingSettings, run_simulated_annealing
from electricity_price_optimizer_py.units import Euro
from services.interfaces import IOptimizerService


class OptimizerService(IOptimizerService):
    def __init__(self):
        pass

    def run_optimization(self, context: OptimizerContext, settings: SimulatedAnnealingSettings) -> Tuple["Euro", "Schedule"]:
        """Run the optimization algorithm with the given context and settings."""
        cost, schedule = run_simulated_annealing(context, settings)
        return cost, schedule
