from datetime import datetime, timezone
from ..interfaces import VariableActionInteractor

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockVariableActionInteractor(VariableActionInteractor):
    """Mock implementation of variable action interactor for testing."""

    def __init__(
        self,
        id: "int",
    ):
        self._id = id
        self._current = units.Watt(0)
        self._total_consumed = units.WattHour(0)
        self._last_update = datetime.now(timezone.utc)

    def set_current(self, current: "units.Watt", device_manager: "IDeviceManager") -> None:
        """Set the power consumption in W."""
        # Clamp to valid range
        # Use numeric values for clamping because unit objects don't support
        # Python's built-in min/max reliably across wrapper types.
        action = device_manager.get_device_service(
        ).get_variable_action_device(self._id).actions[0]
        self._current = min(max(current, units.Watt(0)),
                            action.max_consumption)

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power consumption in W."""
        return self._current

    def get_total_consumed(self, device_manager: "IDeviceManager") -> "units.WattHour":
        """Get total energy consumed so far in Wh."""
        return self._total_consumed

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """Update the consumption state based on elapsed time."""
        elapsed = (current_time - self._last_update)
        # Only update if current is non-zero
        if self._current != units.Watt(0):
            energy_change = self._current * elapsed
            self._total_consumed += energy_change
        self._last_update = current_time

    @property
    def device_id(self) -> "int":
        return self._id
