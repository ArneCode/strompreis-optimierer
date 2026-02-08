from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Tuple
from electricity_price_optimizer_py import Schedule, OptimizerContext, PrognosesProvider, run_simulated_annealing
from electricity_price_optimizer_py.units import Euro, EuroPerWh
from datetime import datetime, timezone
from concurrent.futures import Future, ThreadPoolExecutor


from services.interfaces import IOrchestratorService

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class OrchestratorService(IOrchestratorService):
    _schedule: "Schedule | None"
    currently_running: bool = False
    executor: "ThreadPoolExecutor"

    def __init__(self):
        self._schedule = None
        self.executor = ThreadPoolExecutor(max_workers=2)

    def get_schedule(self) -> "Schedule":
        """Get the current schedule."""
        if self._schedule is None:
            raise ValueError("Schedule has not been generated yet.")
        return self._schedule

    def _process_result(self, fut: "Future[Tuple[Euro, Schedule]]"):
        try:
            cost, schedule = fut.result()
            print(f"Optimization completed with total cost: {cost}")
            from api.scopes import device_manager_scope
            with device_manager_scope() as dm:
                self._schedule = schedule
                for controller in dm.get_controller_service().get_all_controllers():
                    controller.use_schedule(schedule, dm)
        finally:
            self.currently_running = False

    def run_optimization(self, device_manager: "IDeviceManager") -> "None":
        """Run the optimization algorithm."""
        if self.currently_running:
            raise RuntimeError("Optimization is already running.")
        self.currently_running = True

        now = datetime.now(timezone.utc)

        # Create a simple context with mock price data for demonstration
        price_provider = PrognosesProvider(
            lambda t1, t2: EuroPerWh(0.20)  # Mock constant price of 0.20 €/Wh
        )
        context = OptimizerContext(
            time=now,
            electricity_price=price_provider
        )

        # Add devices and actions from the device manager to the context
        for controller in device_manager.get_controller_service().get_all_controllers():
            controller.add_to_optimizer_context(context, now, device_manager)

        print("Starting optimization...")
        future = self.executor.submit(run_simulated_annealing, context)
        print("Optimization task submitted...")
        future.add_done_callback(self._process_result)
        print("Optimization callback registered...")
