from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour
from noise import pnoise1

from device import GeneratorRandom
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
        start_ts = start.timestamp()
        end_ts = end.timestamp()

        # pnoise1 returns a value between -1 and 1. We scale it to be between 0 and 1.
        # The 'base' parameter is used as a seed for the noise function.
        # The timestamp is divided by a factor to control the "frequency" of the noise.
        noise_start = (pnoise1(start_ts / 3600.0, base=generator.seed) + 1) / 2
        noise_end = (pnoise1(end_ts / 3600.0, base=generator.seed) + 1) / 2

        # Scale by the generator's max power
        gen_start = noise_start * generator.peak_power
        gen_end = noise_end * generator.peak_power

        # Average generation over the interval
        avg_generation = (gen_start + gen_end) / 2

        result = Watt(avg_generation) * timedelta(seconds=(end_ts - start_ts))
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

        return prognoses
