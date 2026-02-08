from datetime import datetime, timezone
from ..interfaces import BatteryInteractor

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockBatteryInteractor(BatteryInteractor):
    """Mock implementation of battery interactor for testing."""

    def __init__(
        self,
        id: "int",
    ):
        self._id = id
        self._charge = units.WattHour(0)
        self._current = units.Watt(0)
        self._last_update = datetime.now(timezone.utc)

    def set_current(self, current: "units.Watt", device_manager: "IDeviceManager") -> None:
        """Set the charge/discharge current in W."""
        battery = device_manager.get_device_service().get_battery(self._id)

        if current > units.Watt(0):  # Charging: clamp to max_charge_rate
            self._current = min(battery.max_charge_rate, current)
        else:            # Discharging: clamp to max_discharge_rate (negative)
            self._current = max(-battery.max_discharge_rate, current)

    def get_charge(self, device_manager: "IDeviceManager") -> "units.WattHour":
        """Get the current charge level in Wh."""
        return self._charge

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current charge/discharge rate in W."""
        return self._current

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        elapsed = (current_time - self._last_update)
        """Update the battery state based on elapsed time."""
        # Use numeric comparison for unit wrapper
        cur_val = self._current.get_value()
        if abs(cur_val) < 1e-12:
            return

        # Multiply Watt by timedelta -> WattHour (units wrapper implements this)
        # can multiply with efficiency factor here if desired
        energy_change = self._current * elapsed

        battery = device_manager.get_device_service().get_battery(self._id)

        # Update charge level with clamping
        self._charge = max(units.WattHour(0),
                           min(battery.capacity, self._charge + energy_change)
                           )
        self._last_update = current_time

    @property
    def device_id(self) -> "int":
        return self._id
