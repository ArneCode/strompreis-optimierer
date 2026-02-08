from datetime import datetime, timezone
from typing import Optional

from ..interfaces import ConstantActionInteractor, ActionState

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockConstantActionInteractor(ConstantActionInteractor):
    """Mock implementation of constant action interactor for testing."""

    def __init__(
        self,
        id: "int",
    ):
        self._id = id
        self._state = ActionState.IDLE
        self._start_time: "Optional[datetime]" = None

    def start_action(self, device_manager: "IDeviceManager") -> None:
        """Start the action."""
        if self._state == ActionState.IDLE:
            self._state = ActionState.RUNNING
            self._start_time = datetime.now(timezone.utc)

    def stop_action(self, device_manager: "IDeviceManager") -> None:
        """Stop the action."""
        self._state = ActionState.IDLE
        self._start_time = None

    def get_action_state(self, device_manager: "IDeviceManager") -> "ActionState":
        """Get the current state of the action."""
        return self._state

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power consumption in W."""
        if self._state == ActionState.RUNNING:
            action = device_manager.get_device_service(
            ).get_constant_action_device(self._id).actions[0]
            return action.consumption
        return units.Watt(0)

    def get_start_time(self, device_manager: "IDeviceManager") -> "datetime":
        """Get the action start time."""
        return self._start_time

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """Update action state based on current time."""
        if self._state == ActionState.RUNNING and self._start_time:
            action = device_manager.get_device_service(
            ).get_constant_action_device(self._id).actions[0]
            elapsed = (current_time - self._start_time)
            if elapsed >= action.duration:
                self._state = ActionState.COMPLETED

    @property
    def device_id(self) -> "int":
        return self._id
