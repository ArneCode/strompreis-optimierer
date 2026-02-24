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
