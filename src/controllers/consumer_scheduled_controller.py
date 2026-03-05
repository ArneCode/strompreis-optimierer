from datetime import datetime
from typing import TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour

from devices import ConsumerScheduled
if TYPE_CHECKING:
    from device_manager import IDeviceManager

from .base import DeviceController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)
from interactors.interfaces import DeviceStatus


class ConsumerScheduledController(DeviceController):
    """Controller for scheduled consumer devices.

    Scheduled consumers are passive: they don't receive commands but their
    prognoses/current consumption is added to the optimizer context.
    """

    def __init__(self, id: "int"):
        self._id = id

    @property
    def device_id(self):
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager"):
        pass

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager"):
        consumer = device_manager.get_device_service().get_consumer_scheduled(self._id)
        if consumer is None:
            raise ValueError(f"Consumer with id {self._id} not found")

        prognoses = PrognosesProvider(
            lambda t1, t2: consumer.get_consumption_between(t1, t2))

        context.add_constant_consumption_prognoses(prognoses)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager"):
        pass

    def get_prognoses(self, dm: "IDeviceManager", timestamps: list[datetime], end: datetime) -> list["WattHour"]:
        consumer = dm.get_device_service().get_consumer_scheduled(self._id)
        if consumer is None:
            raise ValueError(f"Consumer with id {self._id} not found")

        prognoses: list[WattHour] = []
        all_timestamps = timestamps + [end]
        for i in range(len(all_timestamps) - 1):
            start_interval = all_timestamps[i]
            end_interval = all_timestamps[i + 1]
            consumption = consumer.get_consumption_between(
                start_interval, end_interval)
            prognoses.append(consumption)

        return prognoses

    # ------------------------------------------------------------------
    # Getter helpers
    # ------------------------------------------------------------------

    def get_current_power(self, current_time: "datetime", device_manager: "IDeviceManager") -> "Watt":
        """
        Return the current instantaneous consumption in Watts using the
        consumer device model (scheduled profile).
        """
        device = device_manager.get_device_service().get_consumer_scheduled(self._id)
        if device is None:
            return Watt(0)
        return device.get_consumption(current_time)

    def get_peak_power(self, device_manager: "IDeviceManager") -> "Watt":
        """
        Return the peak power from the stored daily schedule (max of values).
        """
        device = device_manager.get_device_service().get_consumer_scheduled(self._id)
        if device is None:
            return Watt(0)
        try:
            vals = list(device.schedule.values())
            if not vals:
                return Watt(0)
            return Watt(max(vals))
        except Exception:
            return Watt(0)

    def get_status(self, current_time: "datetime", device_manager: "IDeviceManager") -> "DeviceStatus":
        """
        Derived status for the scheduled consumer: "consuming" when current
        power > 0, otherwise "idle".
        """
        cur = self.get_current_power(current_time, device_manager)
        try:
            val = cur.get_value()
        except Exception:
            try:
                val = float(cur)
            except Exception:
                return DeviceStatus.UNKNOWN

        return DeviceStatus.RUNNING if val > 0 else DeviceStatus.IDLE

    def get_status_str(self, current_time: "datetime", device_manager: "IDeviceManager") -> str:
        return self.get_status(current_time, device_manager).value
