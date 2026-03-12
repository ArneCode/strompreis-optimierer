from datetime import datetime
from ..interfaces import ConsumerScheduledInteractor

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockConsumerScheduledInteractor(ConsumerScheduledInteractor):
    """
    Mock interactor for ConsumerScheduled devices.

    Uses the device's schedule to determine current power consumption based
    on time of day.
    """

    def __init__(self, id: "int"):
        self._id = id
        self._current_power = units.Watt(0)
        self._last_update: datetime | None = None

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power consumption in W."""
        return self._current_power

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """
        Update current power based on the device's scheduled consumption.

        Uses the ConsumerScheduled device's get_consumption() method which
        looks up the power value from the daily schedule.
        """
        device = device_manager.get_device_service().get_consumer_scheduled(self._id)
        if device is None:
            self._current_power = units.Watt(0)
            return

        self._current_power = device.get_consumption(current_time)
        self._last_update = current_time

    @property
    def device_id(self) -> "int":
        return self._id
