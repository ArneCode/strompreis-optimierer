from abc import ABC, abstractmethod
from enum import Enum

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class ActionState(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"


class DeviceStatus(Enum):
    """Generic device status enum used by controllers for frontend-facing state.

    Values cover common device states across batteries, generators and actions.
    Controllers should return this enum from their status getters. Callers that
    need a string can use .value.
    """
    UNKNOWN = "unknown"
    IDLE = "idle"
    CHARGING = "charging"
    DISCHARGING = "discharging"
    PRODUCING = "producing"
    RUNNING = "running"
    COMPLETED = "completed"


class BatteryInteractor(ABC):
    """Interface for battery device communication."""

    @abstractmethod
    def set_current(self, current: "units.Watt", device_manager: "IDeviceManager") -> None:
        """Set the charge/discharge current in W (positive = charging)."""
        pass

    @abstractmethod
    def get_charge(self, device_manager: "IDeviceManager") -> "units.WattHour":
        """Get the current charge level in Wh."""
        pass

    @abstractmethod
    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current charge/discharge rate in W."""
        pass

    @property
    @abstractmethod
    def device_id(self) -> "int":
        """Get the ID of the associated device."""
        pass


class GeneratorInteractor(ABC):
    """Interface for generator device communication."""

    @abstractmethod
    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power generation in W."""
        pass

    @property
    @abstractmethod
    def device_id(self) -> "int":
        """Get the ID of the associated device."""
        pass


class ConstantActionInteractor(ABC):
    """Interface for constant action device communication."""

    @abstractmethod
    def start_action(self, device_manager: "IDeviceManager") -> None:
        """Start the action."""
        pass

    @abstractmethod
    def stop_action(self, device_manager: "IDeviceManager") -> None:
        """Stop the action (if possible)."""
        pass

    @abstractmethod
    def get_action_state(self, device_manager: "IDeviceManager") -> "ActionState":
        """Get the current state of the action."""
        pass

    @abstractmethod
    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power consumption in W."""
        pass

    @property
    @abstractmethod
    def device_id(self) -> "int":
        """Get the ID of the associated device."""
        pass


class VariableActionInteractor(ABC):
    """Interface for variable action device communication."""

    @abstractmethod
    def set_current(self, current: "units.Watt", device_manager: "IDeviceManager") -> None:
        """Set the power consumption in W."""
        pass

    @abstractmethod
    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power consumption in W."""
        pass

    @abstractmethod
    def get_total_consumed(self, device_manager: "IDeviceManager") -> "units.WattHour":
        """Get total energy consumed so far in Wh."""
        pass

    @property
    @abstractmethod
    def device_id(self) -> "int":
        """Get the ID of the associated device."""
        pass
