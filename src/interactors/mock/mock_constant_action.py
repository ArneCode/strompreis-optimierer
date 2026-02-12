from datetime import datetime, timezone
from typing import Optional

from ..interfaces import ConstantActionInteractor, ActionState

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockConstantActionInteractor(ConstantActionInteractor):
    """
    Test double for ConstantActionInteractor.

    Models a “constant action” as a simple state machine:
      IDLE -> RUNNING -> COMPLETED

    While RUNNING, get_current() returns the configured constant consumption
    (from the device's first constant action: actions[0]). Otherwise it returns 0 W.

    Notes / assumptions:
      - Completion is determined in update() by comparing elapsed time to the
        action's configured duration.
      - device_manager is accepted to match the production interface and to
        fetch consumption and duration from the device definition.
    """
    def __init__(
        self,
        id: "int",
    ):
        """
        Args:
            id: Device identifier used to look up the corresponding variable-action device.
        """
        self._id = id
        self._state = ActionState.IDLE
        self._start_time: "Optional[datetime]" = None

    def start_action(self, device_manager: "IDeviceManager") -> None:
        """
        Start the action if currently IDLE.

        Side effects:
            - Sets state to RUNNING

        Args:
            device_manager: Present for interface compatibility (not used directly here).
        """
        if self._state == ActionState.IDLE:
            self._state = ActionState.RUNNING
            self._start_time = datetime.now(timezone.utc)

    def stop_action(self, device_manager: "IDeviceManager") -> None:
        """
        Stop the action and reset to IDLE.

        Side effects:
            - Sets state to IDLE
            - Clears _start_time

        Args:
            device_manager: Present for interface compatibility.
        """
        self._state = ActionState.IDLE
        self._start_time = None

    def get_action_state(self, device_manager: "IDeviceManager") -> "ActionState":
        """
        Returns:
            Current ActionState (IDLE, RUNNING, or COMPLETED).
        """
        return self._state

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """
        Get the current power draw.

        Returns:
            - If RUNNING: the configured constant consumption in watts.
            - Otherwise: 0 W.

        Args:
            device_manager: Used to look up the action's configured consumption.
        """
        if self._state == ActionState.RUNNING:
            action = device_manager.get_device_service(
            ).get_constant_action_device(self._id).actions[0]
            return action.consumption
        return units.Watt(0)

    def get_start_time(self, device_manager: "IDeviceManager") -> "datetime":
        """
        Returns:
            The timestamp when the action was started, or None if not running.
        """
        return self._start_time

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """
        Advance state based on elapsed time.

        If the action is RUNNING and the elapsed time since _start_time is greater
        than or equal to the configured action duration, the state becomes COMPLETED.

        Side effects:
            May change _state from RUNNING to COMPLETED.

        Args:
            current_time: Timestamp used to compute elapsed time.
            device_manager: Used to retrieve the action duration.
        """
        if self._state == ActionState.RUNNING:
            if self._start_time is None:
                self._start_time = current_time  # <-- start time comes from global time

            action = device_manager.get_device_service(
            ).get_constant_action_device(self._id).actions[0]
            elapsed = (current_time - self._start_time)
            if elapsed >= action.duration:
                self._state = ActionState.COMPLETED

    @property
    def device_id(self) -> "int":
        return self._id
