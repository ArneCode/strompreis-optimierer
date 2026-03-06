from datetime import datetime
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour

from external_api_services.api_services import api_services
from external_api_services.forecast_service.pv_configuration import get_pv_configuration
from .base import DeviceController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)
from interactors.interfaces import DeviceStatus

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

    @property
    def device_id(self) -> "int":
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """Store the schedule (generators typically don't act on it)."""
        self._schedule = schedule

    def _forecast_service(self, device_manager: "IDeviceManager"):
        generator = device_manager.get_device_service().get_generator_pv(self._id)
        pv_configuration = get_pv_configuration(generator)
        return api_services.forecast_manager.get_service(pv_configuration)

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """Add generator prognoses to the optimizer context."""
        service = self._forecast_service(device_manager)
        prognoses = PrognosesProvider(
            lambda t1, t2: WattHour(service.get_total_production(t1, t2))
        )
        context.add_generated_electricity_prognoses(prognoses)

    def get_prognoses(self, device_manager: "IDeviceManager", timestamps: list[datetime], end: datetime) -> list[WattHour]:
        service = self._forecast_service(device_manager)
        return service.get_prognoses(timestamps, end)

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

    # ------------------------------------------------------------------
    # Getter helpers (always accept device_manager)
    # ------------------------------------------------------------------

    def get_current_power(self, device_manager: "IDeviceManager") -> "Watt":
        """
        Return the current instantaneous generation in Watts by delegating
        to the GeneratorInteractor. Returns Watt(0) if no interactor is
        available.
        """
        interactor = device_manager.get_interactor_service().get_generator_interactor(self._id)
        if interactor is None:
            return Watt(0)
        return interactor.get_current(device_manager)

    def get_peak_power(self, device_manager: "IDeviceManager") -> "Watt":
        """
        Return the rated/peak power of the PV generator from the device model.
        """
        device = device_manager.get_device_service().get_generator_pv(self._id)
        if device is None:
            return Watt(0)
        return device.peak_power

    def get_status(self, device_manager: "IDeviceManager") -> "str":
        """
        Derived status for the generator: "producing" when current power > 0,
        otherwise "idle". Always accepts device_manager for consistency.
        """
        cur = self.get_current_power(device_manager)
        try:
            val = cur.get_value()
        except Exception:
            try:
                val = float(cur)
            except Exception:
                return "unknown"

        return DeviceStatus.PRODUCING if val > 0 else DeviceStatus.IDLE

    def get_status_str(self, device_manager: "IDeviceManager") -> str:
        return self.get_status(device_manager).value
