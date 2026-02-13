from datetime import datetime
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt

from .base import DeviceController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    VariableAction as OptimizerVariableAction,
    AssignedVariableAction
)

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class VariableActionController(DeviceController):
    """
    Controller for variable-action devices (for example EV charging).

    Responsibilities:
        - Store an optimizer-produced Schedule (use_schedule()).
        - Expose the device's variable action constraints to the optimizer by adding an
          OptimizerVariableAction to an OptimizerContext (add_to_optimizer_context()).
        - Apply the assigned schedule by setting the device's current power draw through
          a VariableActionInteractor (update_device()).

    A variable action represents flexible power usage over a time window [start, end]
    with a total required energy (total_consumption) and an instantaneous power limit
    (max_consumption).
    """

    def __init__(self, id: "int"):
        """
        Args:
            id: Device identifier for the variable-action device being controlled.
        """
        self._id = id
        self._schedule: "Optional[Schedule]" = None

    @property
    def device_id(self) -> "int":
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """
        Store the schedule for later application.

        Args:
            schedule: Schedule produced by the optimizer.
            device_manager: Present for interface compatibility (not used here).
        """
        self._schedule = schedule

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Add this variable action to the optimizer context.

        Reads the device's action definition (start/end window, total_consumption, max_consumption)
        and adds an OptimizerVariableAction so the optimizer can schedule consumption.

        If the interactor reports that total_consumption has already been fully consumed,
        nothing is added.

        Args:
            context: OptimizerContext being built.
            current_time: Used to clamp the action start to the optimizer horizon start.
            device_manager: Used to access both the device definition (action window/limits)
                and runtime state (consumed energy via the interactor).

        Notes:
            If clamping start to current_time makes the window invalid (start >= end),
            the action is skipped.
        """

        device = device_manager.get_device_service().get_variable_action_device(self._id)
        if device is None or not device.actions:
            return
        action = device.actions[0]

        interactor = device_manager.get_interactor_service(
        ).get_variable_action_interactor(self._id)

        if interactor.get_total_consumed(device_manager) >= action.total_consumption:
            return  # already fully consumed, no need to add to context

        start = action.start
        end = action.end

        # Clamp start to the optimization horizon start (often "current_time")
        if start < current_time:
            start = current_time

        # If clamping makes the window invalid, skip or handle as unschedulable
        if start >= end:
            return  # or raise ValueError / mark not plannable

        optimizer_action = OptimizerVariableAction(
            start=start,
            end=end,
            total_consumption=action.total_consumption,
            max_consumption=action.max_consumption,
            id=self._id,  # maybe should be action ID instead of device ID
        )
        context.add_variable_action(optimizer_action)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Apply the stored schedule at the given time.

        If a schedule exists and contains an AssignedVariableAction for this device,
        the controller queries the scheduled consumption at current_time and forwards it
        to the VariableActionInteractor via set_current().

        Args:
            current_time: Timestamp used to sample the scheduled consumption.
            device_manager: Used to obtain the VariableActionInteractor.

        Notes:
            If current_time is outside the schedule range, the controller sets consumption
            to zero.
        """

        if self._schedule is None:
            return

        assigned = self._schedule.get_variable_action(self._id)
        interactor = device_manager.get_interactor_service(
        ).get_variable_action_interactor(self._id)

        if assigned is None:
            return

        try:
            # Get the consumption rate for the current time
            consumption = assigned.get_consumption(current_time)
            # Instruct the interactor to set this consumption
            interactor.set_current(consumption, device_manager)
        except:
            # Time is outside schedule range, stop consumption
            interactor.set_current(Watt(0), device_manager)
