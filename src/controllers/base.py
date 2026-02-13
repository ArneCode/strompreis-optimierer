from abc import ABC, abstractmethod
from typing import TYPE_CHECKING
from datetime import datetime

from electricity_price_optimizer_py.units import WattHour

if TYPE_CHECKING:
    from device_manager import IDeviceManager


from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
)


class DeviceController(ABC):
    """
    Abstract base class for device controllers.

    Each controller acts as a Facade for its device subsystem,
    hiding the complexity of device communication from the Orchestrator.
    """

    @property
    @abstractmethod
    def device_id(self) -> "int":
        """Get the ID of the controlled device."""
        pass

    @abstractmethod
    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """
        Inform the controller about the schedule to use.

        The controller stores this schedule and uses it when
        updateDevice() is called to determine the device behavior.

        Args:
            schedule: The optimized schedule from the optimizer
        """
        pass

    @abstractmethod
    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Add device information to the optimizer context.

        This adds all relevant information about the device that
        the optimizer needs to create an optimized schedule.

        Args:
            context: The optimizer context to add information to
            context_start_time: If provided, the datetime the optimizer considers as start
        """
        pass

    @abstractmethod
    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Update the physical device based on the current schedule.

        This method:
        1. Looks up the behavior for the device at the current time
        2. Instructs the device (via interactor) how to behave
        """
        pass


class GeneratorController(DeviceController):
    """Controller for generator devices (e.g., PV panels).

    Generators are passive: they don't receive commands but their
    prognoses/current output is added to the optimizer context.
    """

    @abstractmethod
    def get_prognoses(self, dm: "IDeviceManager", timestamps: list[datetime], end: datetime) -> list["WattHour"]:
        pass
