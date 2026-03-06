"""Orchestrator service for running the optimization process.

This service coordinates the creation of the optimization context, invokes the
core optimization algorithm in a separate thread, and applies the resulting
schedule to the device controllers upon completion.
"""
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Tuple
from electricity_price_optimizer_py import Schedule, OptimizerContext, PrognosesProvider
from electricity_price_optimizer_py.units import Euro, EuroPerWh
from datetime import datetime, timezone, timedelta
from concurrent.futures import Future, ThreadPoolExecutor
from enum import Enum

from external_api_services.api_services import api_services
from services.interfaces import IOptimizerService, IOrchestratorService, ISettingsService

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class OrchestratorService(IOrchestratorService):
    _schedule: "Schedule | None"
    _cost: "Euro | None"
    _currently_running: bool = False
    executor: "ThreadPoolExecutor"
    _last_calculated_at: "datetime | None"
    _last_optimization_duration: "timedelta | None"
    _optimization_start_time: "datetime | None"

    def __init__(self):
        self._schedule = None
        self._cost = None
        self.executor = ThreadPoolExecutor(max_workers=1)
        self._last_calculated_at = None
        self._last_optimization_duration = None
        self._optimization_start_time = None

    @property
    def has_schedule(self) -> bool:
        """Check if a schedule has been generated."""
        return self._schedule is not None

    @property
    def currently_running(self) -> bool:
        """Check if optimization is currently running."""
        return self._currently_running

    @property
    def last_calculated_at(self) -> "datetime | None":
        """Get the time the last schedule was calculated."""
        return self._last_calculated_at

    @property
    def last_optimization_duration(self) -> "timedelta | None":
        """Get the duration of the last optimization."""
        return self._last_optimization_duration

    def get_schedule(self) -> "Schedule":
        """Get the current schedule."""
        if self._schedule is None:
            raise ValueError("Schedule has not been generated yet.")
        return self._schedule

    def get_cost(self) -> "Euro":
        """Get the cost of the current schedule."""
        if self._cost is None:
            raise ValueError("Cost has not been calculated yet.")
        return self._cost

    def stop_optimization(self) -> None:
        """Stop the currently running optimization."""
        if not self._currently_running:
            print("Optimization is not running.")
            return

        print("Stopping optimization...")
        # Shutdown the executor. The cancel_futures=True will attempt to cancel
        # running futures, but it cannot interrupt a running task that does not
        # support cooperative cancellation. It will prevent queued tasks from running.
        self.executor.shutdown(wait=False, cancel_futures=True)

        # Recreate the executor for future optimizations
        self.executor = ThreadPoolExecutor(max_workers=1)
        self._currently_running = False
        self._optimization_start_time = None
        print("Optimization stopped.")

    def _process_result(self, fut: "Future[Tuple[Euro, Schedule]]"):
        try:
            cost, schedule = fut.result()
            print(f"Optimization completed with total cost: {cost}")
            from api.scopes import device_manager_scope
            with device_manager_scope() as dm:
                self._schedule = schedule
                self._cost = cost
                self._last_calculated_at = datetime.now(timezone.utc)
                if self._optimization_start_time:
                    self._last_optimization_duration = self._last_calculated_at - \
                        self._optimization_start_time
                    print(
                        f"Optimization duration: {self._last_optimization_duration.total_seconds():.3f}s")
                for controller in dm.get_controller_service().get_all_controllers():
                    controller.use_schedule(schedule, dm)
        finally:
            self._currently_running = False
            self._optimization_start_time = None

    def run_optimization(self, device_manager: "IDeviceManager", settings_service: ISettingsService, optimizer_service: IOptimizerService) -> "None":
        """Run the optimization algorithm."""
        if self._currently_running:
            raise RuntimeError("Optimization is already running.")

        now = datetime.now(timezone.utc)
        self._optimization_start_time = now

        # Create a simple context with mock price data for demonstration
        price_provider = PrognosesProvider(
            # lambda t1, t2: EuroPerWh()  # Mock constant price of 0.20 €/Wh
            lambda t1, t2: EuroPerWh(
                api_services.price_service.get_average_price(t1, t2))
        )
        context = OptimizerContext(
            time=now,
            electricity_price=price_provider
        )

        # Add devices and actions from the device manager to the context
        for controller in device_manager.get_controller_service().get_all_controllers():
            controller.add_to_optimizer_context(context, now, device_manager)

        print("Starting optimization...")
        settings = settings_service.get_optimizer_settings()
        future = self.executor.submit(
            optimizer_service.run_optimization, context, settings)
        self._currently_running = True

        print("Optimization task submitted...")
        future.add_done_callback(self._process_result)
        print("Optimization callback registered...")
