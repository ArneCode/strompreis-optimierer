from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from device_manager import IDeviceManager

from .base import DeviceController
from interactors import BatteryInteractor

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    Battery as OptimizerBattery
)


class BatteryController(DeviceController):
    """
    Controller for a battery device.

    Responsibilities:
        - Stores a Schedule assigned by the optimizer (use_schedule()).
        - Exposes the battery to the optimizer by adding an OptimizerBattery to an
          OptimizerContext (add_to_optimizer_context()).
        - Applies the schedule to the real/simulated battery through a BatteryInteractor
          (update_device()).

    This controller intentionally separates:
        - Optimizer domain objects (OptimizerBattery, OptimizerContext, Schedule)
        - Device management / IO (device_manager + BatteryInteractor)
    """

    def __init__(
        self,
        id: "int",
    ):
        """
        Args:
            id: Device identifier of the battery being controlled.
        """
        self._id = id
        self._schedule: "Optional[Schedule]" = None

    @property
    def device_id(self) -> "int":
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> None:
        """
        Store a schedule for later application.

        Args:
            schedule: Schedule produced by the optimizer.
            device_manager: Present for interface compatibility (not used here).
        """
        self._schedule = schedule

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """
        Add this battery to the optimizer context.

        Reads the current battery charge from the BatteryInteractor and uses it as the
        initial_charge for the optimizer model. This keeps the optimizer's model aligned
        with the actual device state at planning time.

        Args:
            context: OptimizerContext to which the battery model will be added.
            current_time: Timestamp for when the context is built (currently unused).
            device_manager: Used to access the battery definition (capacity, rates) and
                current device state (charge via interactor).

        Side effects:
            Adds an OptimizerBattery instance to context.
        """

        # Update initial level from actual device state
        battery_interactor = device_manager.get_interactor_service(
        ).get_battery_interactor(self._id)
        battery = device_manager.get_device_service().get_battery(self._id)

        current_charge = battery_interactor.get_charge(device_manager)

        optimizer_battery = OptimizerBattery(
            capacity=battery.capacity,
            max_charge_rate=battery.max_charge_rate,
            max_discharge_rate=battery.max_discharge_rate,
            initial_charge=current_charge,
            id=self._id,
        )
        context.add_battery(optimizer_battery)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> None:
        """
        Update the battery based on the current schedule.

        Looks up the charge rate for the current time from the schedule
        and instructs the battery to charge/discharge at that rate.
        """
        if self._schedule is None:
            return

        # `Schedule` wrapper exposes `get_battery(id)` which returns an AssignedBattery
        assigned = self._schedule.get_battery(self._id)
        if assigned is None:
            return

        try:
            # Get the charge speed (W) for the current time from the AssignedBattery
            charge_rate = assigned.get_charge_speed(current_time)
            # Instruct the battery interactor to set this charge rate (expects units.Watt)
            interactor = device_manager.get_interactor_service().get_battery_interactor(self._id)
            interactor.set_current(charge_rate, device_manager)
        except ValueError:
            return
