from datetime import datetime
import math
from ..interfaces import GeneratorInteractor

from electricity_price_optimizer_py import units
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from device_manager import IDeviceManager


class MockGeneratorInteractor(GeneratorInteractor):
    """Mock implementation of generator interactor for testing.

    This mock follows the same pattern as other mock interactors: it stores
    the device id, exposes an `id` attribute (used by InteractorService), and
    accepts a simulated power or updates from a simple solar model.
    """

    def __init__(
        self,
        id: "int"
    ):
        self._id = id
        self._max_power = None
        self._current_power = units.Watt(0)
        self._simulated_override = None  # if set, this value is used directly

    def get_current(self, device_manager: "IDeviceManager") -> "units.Watt":
        """Get the current power generation in W.

        Reads from simulated override if set; otherwise returns last computed
        _current_power. The generator model in the device service may be used
        by callers to set the interactor's max_power initially.
        """
        return self._current_power

    def set_simulated_power(self, power: "units.Watt", device_manager: "IDeviceManager" = None) -> None:
        """Set the simulated power output (for testing). Clamped to max_power."""
        # If max power is available, clamp; otherwise accept as-is
        if self._max_power is not None and self._max_power != units.Watt(0):
            # use numeric min via .value
            val = min(power.value, self._max_power.value)
            self._current_power = units.Watt(val)
        else:
            self._current_power = units.Watt(power)
        self._simulated_override = self._current_power

    def update(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """Update internal power estimate using a very simple solar model.

        If a simulated override was set via set_simulated_power, the override
        is kept. Otherwise the model computes an estimate based on the hour
        of day and a nominal weather factor. If this interactor was not
        configured with a max power, it will attempt to read the generator
        model via the provided device manager.
        """
        # Keep override if present
        if self._simulated_override is not None:
            self._current_power = self._simulated_override
            return

        hour = current_time.hour + current_time.minute / 60
        # Simple solar model: peak at noon, zero at night
        if 6 <= hour <= 20:
            solar_factor = math.sin(math.pi * (hour - 6) / 14)
            solar_factor = max(0, solar_factor)
        else:
            solar_factor = 0

        # nominal cloud/weather reduction (fixed simple factor)
        weather_factor = 1 - (0.4)  # 60% of clear-sky by default

        # If max power is not configured, try to read it from the device model
        max_p = 0
        if self._max_power is not None and self._max_power != units.Watt(0):
            max_p = self._max_power.value
        else:
            try:
                gen = device_manager.get_device_service().get_generator(self.id)
                if gen is not None and hasattr(gen, "max_power"):
                    gp = getattr(gen, "max_power")
                    try:
                        max_p = gp.value
                    except Exception:
                        max_p = float(gp)
            except Exception:
                max_p = 0

        self._current_power = units.Watt(max_p * solar_factor * weather_factor)

    @property
    def device_id(self) -> "int":
        return self._id
