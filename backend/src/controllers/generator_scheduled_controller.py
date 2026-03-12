from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour
from noise import pnoise1

from devices import GeneratorScheduled
if TYPE_CHECKING:
    from device_manager import IDeviceManager

from .base import DeviceController, GeneratorController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)
from interactors.interfaces import DeviceStatus


class GeneratorScheduledController(GeneratorController):
    """Controller for generator devices (e.g., PV panels).

    Generators are passive: they don't receive commands but their
    prognoses/current output is added to the optimizer context.
    """

    def __init__(self, id: "int"):
        self._id = id

    @property
    def device_id(self):
        return self._id

    def use_schedule(self, schedule, device_manager):
        pass

    def add_to_optimizer_context(self, context: OptimizerContext, current_time: datetime, device_manager: "IDeviceManager"):
        generator = device_manager.get_device_service().get_generator_scheduled(self._id)
        if generator is None:
            raise ValueError(f"Generator with id {self._id} not found")

        prognoses = PrognosesProvider(
            lambda t1, t2: generator.get_generation_between(t1, t2))

        context.add_generated_electricity_prognoses(prognoses)

    def update_device(self, current_time, device_manager):
        pass

    def get_prognoses(self, dm: "IDeviceManager", timestamps: list[datetime], end: datetime) -> list["WattHour"]:
        generator = dm.get_device_service().get_generator_scheduled(self._id)
        if generator is None:
            raise ValueError(f"Generator with id {self._id} not found")

        prognoses: list[WattHour] = []
        all_timestamps = timestamps + [end]
        for i in range(len(all_timestamps) - 1):
            start_interval = all_timestamps[i]
            end_interval = all_timestamps[i+1]
            generation = generator.get_generation_between(
                start_interval, end_interval)
            prognoses.append(generation)

        return prognoses

    # ------------------------------------------------------------------
    # Getter helpers (always accept device_manager)
    # ------------------------------------------------------------------

    def get_current_power(self, device_manager: "IDeviceManager") -> "Watt":
        """
        Return the current instantaneous generation in Watts using the
        generator device model (scheduled profile). The caller must pass
        the desired evaluation time as `current_time`. Returns Watt(0) if
        the device is not found.
        """
        interactor = device_manager.get_interactor_service().get_generator_interactor(self._id)
        if interactor is None:
            return Watt(0)
        return interactor.get_current(device_manager)

    def get_peak_power(self, device_manager: "IDeviceManager") -> "Watt":
        """
        Return the peak power from the stored daily schedule (max of values).
        """
        device = device_manager.get_device_service().get_generator_scheduled(self._id)
        if device is None:
            return Watt(0)
        try:
            vals = list(device.schedule.values())
            if not vals:
                return Watt(0)
            return Watt(max(vals))
        except Exception:
            return Watt(0)

    def get_status(self, device_manager: "IDeviceManager") -> "str":
        """
        Derived status for the scheduled generator: "producing" when current
        power > 0, otherwise "idle". Caller must provide `current_time`.
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
