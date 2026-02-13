from datetime import datetime, timezone
from ..interfaces import BatteryInteractor

from electricity_price_optimizer_py import units
from typing import Optional, TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockBatteryInteractor(BatteryInteractor):
    """
    Test double for BatteryInteractor.

    Tracks an internal battery charge (Wh) and a current charge/discharge power (W).
    Charge is updated over time in update(current_time, ...) by integrating power over
    the elapsed time since the previous update.

    Time source:
        This mock does not call datetime.now(). It uses the current_time provided to
        update() so tests/simulations can control time consistently.
    """

    def __init__(
        self,
        id: "int",
    ):
        self._id = id
        self._charge = units.WattHour(0)
        self._current = units.Watt(0)

        # Initialized on first update() call to avoid mixing in wall-clock time.
        self._last_update: Optional[datetime] = None

    def set_current(self, current: "units.Watt", device_manager: "IDeviceManager") -> None:
        """
        Set the battery power (W).

        Positive values mean charging, negative values mean discharging.
        The requested power is clamped to the battery's configured max rates.

        Args:
            current: Desired charge/discharge power in watts.
            device_manager: Used to fetch battery limits (max charge/discharge rates).
        """
        battery = device_manager.get_device_service().get_battery(self._id)

        if current.get_value() > 0:  # Charging: clamp to max_charge_rate
            self._current = min(battery.max_charge_rate, current)
        else:            # Discharging: clamp to max_discharge_rate (negative)
            self._current = max(-battery.max_discharge_rate, current)

    def get_charge(self, device_manager: "IDeviceManager") -> "units.WattHour":
        """
        Returns:
            Current stored energy in watt-hours.
        """
        return self._charge

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """
        Returns:
            Current charge/discharge power in watts (positive charge, negative discharge).
        """
        return self._current

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """
        Update internal charge based on elapsed time.

        The charge delta is computed as:
            energy_change = current_power * elapsed_time

        Charge is clamped to:
            0 Wh <= charge <= capacity

        Args:
            current_time: Simulation/global time used for integration.
            device_manager: Used to read battery capacity for clamping.
        """
        # First call: establish a baseline timestamp, do not integrate yet.
        if self._last_update is None:
            self._last_update = current_time
            return

        elapsed = (current_time - self._last_update)
        # Use numeric comparison for unit wrapper
        cur_val = self._current.get_value()
        if abs(cur_val) < 1e-12:
            self._last_update = current_time
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
