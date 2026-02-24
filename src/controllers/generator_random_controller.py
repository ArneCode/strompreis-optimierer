from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour
from noise import pnoise1

from devices import GeneratorRandom
from interactors.interfaces import DeviceStatus
if TYPE_CHECKING:
    from device_manager import IDeviceManager

from .base import DeviceController, GeneratorController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)


class GeneratorRandomController(GeneratorController):
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

    def _get_generation(self, generator: GeneratorRandom, start: datetime, end: datetime) -> WattHour:
        # Compute random generation for the interval [start, end] using the generator's random generator.
        # uses noise function with generator's seed and the timestamps to produce a deterministic random generation value for the interval.
        # For simplicity, we can just take the average of the generation at the start and end timestamps.
        gen_start = generator.get_generation(start)
        gen_end = generator.get_generation(end)

        # Average generation over the interval
        avg_generation = (gen_start.get_value() + gen_end.get_value()) / 2

        duration_seconds = (end - start).total_seconds()
        result = Watt(avg_generation) * timedelta(seconds=duration_seconds)
        return result

    def add_to_optimizer_context(self, context: OptimizerContext, current_time: datetime, device_manager: "IDeviceManager"):
        generator = device_manager.get_device_service().get_generator_random(self._id)
        if generator is None:
            raise ValueError(f"Generator with id {self._id} not found")

        prognoses = PrognosesProvider(
            lambda t1, t2: self._get_generation(generator, t1, t2))
        context.add_generated_electricity_prognoses(prognoses)

    def update_device(self, current_time, device_manager):
        pass

    def get_prognoses(self, dm: "IDeviceManager", timestamps: list[datetime], end: datetime) -> list[WattHour]:
        generator = dm.get_device_service().get_generator_random(self._id)
        if generator is None:
            raise ValueError(f"Generator with id {self._id} not found")

        prognoses: list[WattHour] = []
        all_timestamps = timestamps + [end]
        for i in range(len(all_timestamps) - 1):
            start_interval = all_timestamps[i]
            end_interval = all_timestamps[i+1]
            generation = self._get_generation(
                generator, start_interval, end_interval)
            prognoses.append(generation)

        print(
            f"GeneratorRandomController {self._id} prognoses: {[g.get_value() for g in prognoses]} Wh")
        return prognoses

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
        Return the rated/peak power of the random generator from the device model.
        """
        device = device_manager.get_device_service().get_generator_random(self._id)
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
