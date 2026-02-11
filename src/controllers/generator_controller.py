from datetime import datetime
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour

from .base import DeviceController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class GeneratorPvController(DeviceController):
    """Controller for generator devices (e.g., PV panels).

    Generators are passive: they don't receive commands but their
    prognoses/current output is added to the optimizer context.
    """

    def __init__(self, id: "int"):
        self._id = id
        self._schedule: "Optional[Schedule]" = None
        self.forecast_service = ...

    @property
    def device_id(self) -> "int":
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """Store the schedule (generators typically don't act on it)."""
        self._schedule = schedule

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """Add generator prognoses to the optimizer context."""
        device = device_manager.get_device_service().get_generator_pv(
            self._id)
        prognoses = PrognosesProvider(
            # Mock prognosis: constant 5W generation; replace with real data access
            lambda t1, t2: WattHour(5)
        )
        context.add_generated_electricity_prognoses(prognoses)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """Optional periodic update; for generators we generally don't actuate devices."""
        # Could poll interactor to advance simulated state if it exposes update()
        interactor = device_manager.get_interactor_service().get_generator_interactor(self._id)
        if interactor is None:
            return
        # Some mock interactors implement update(current_time, device_manager)
        try:
            interactor.update(current_time, device_manager)
        except Exception:
            # Not all interactors implement update; ignore quietly
            pass
