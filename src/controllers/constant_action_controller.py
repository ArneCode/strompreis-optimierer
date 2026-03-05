from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING

from .base import DeviceController
# from interactors import ConstantActionInteractor  # removed: unused type-only import
from interactors.interfaces import ActionState
from interactors.interfaces import DeviceStatus

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    ConstantAction as OptimizerConstantAction,
)
from electricity_price_optimizer_py import units

if TYPE_CHECKING:
    from device_manager import IDeviceManager


class ConstantActionController(DeviceController):
    """
    Controller for a constant-action device (fixed duration + fixed consumption).

    Responsibilities:
        - Decide whether the action is currently controllable based on the device's
          runtime state (is_controllable()).
        - Provide the optimizer with an OptimizerConstantAction representing the action
          constraints when the action can still be scheduled (add_to_optimizer_context()).
        - If the action is not controllable (already running or otherwise locked),
          provide the optimizer with the already-assigned/past action so it can account
          for it (add_past_constant_action()).
        - Apply an assigned schedule by starting the action when current_time reaches
          the scheduled start time (update_device()).

    Key concept:
        A constant action is typically a one-shot operation (e.g. run a dishwasher cycle)
        that must start within a window [start_from, end_before) and then runs for a
        fixed duration with fixed power consumption.
    """

    def __init__(self, id: "int"):
        """
        Args:
            id: Device identifier for the constant-action device being controlled.
        """
        self._id = id
        self._schedule: "Optional[Schedule]" = None

    @property
    def device_id(self) -> "int":
        return self._id

    @property
    def assigned_start_time(self) -> "Optional[datetime]":
        """
        Scheduled start time for this device from the currently stored schedule.

        Returns:
            The scheduled start timestamp if a schedule exists and contains an
            assignment for this device; otherwise None.

        Notes:
            This reads from the schedule only. It does not query the interactor.
        """
        if self._schedule is None:
            return None
        assigned = self._schedule.get_constant_action(self._id)
        if assigned is None:
            return None
        # AssignedConstantAction from the Rust wrapper exposes accessors
        return assigned.get_start_time()

    def is_controllable(self, device_manager: "IDeviceManager") -> "bool":
        """
        Determine whether the action can be (re)scheduled/started by the controller.

        A device is considered controllable when its interactor reports a state where
        starting a new action is allowed.

        Args:
            device_manager: Used to obtain the ConstantActionInteractor.

        Returns:
            True if the device is in IDLE or COMPLETED state, otherwise False.
        """
        interactor = device_manager.get_interactor_service(
        ).get_constant_action_interactor(self._id)
        state = interactor.get_action_state(device_manager)
        return state in (ActionState.IDLE, ActionState.COMPLETED)

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """
        Store a schedule for later execution, if the device is controllable.

        Args:
            schedule: Schedule produced by the optimizer.
            device_manager: Used to check controllability.

        Side effects:
            Updates the internal stored schedule when controllable; otherwise keeps the
            previous schedule unchanged.
        """
        if self.is_controllable(device_manager):
            self._schedule = schedule

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Add this constant action to the optimizer context.

        If the device is controllable:
            Adds a schedulable OptimizerConstantAction with the allowed start window,
            duration, and consumption.

        If the device is not controllable:
            Adds the already-assigned constant action from the existing schedule (if any)
            as a past action so the optimizer can account for it.

        Args:
            context: OptimizerContext being built.
            current_time: Time used to clamp the earliest possible start (horizon start).
            device_manager: Used to read device constraints (start_from, end_before,
                duration, consumption) and to determine controllability.

        Notes:
            - The earliest start is clamped to max(action.start_from, current_time) so the
              optimizer does not schedule in the past.
            - If the scheduling window is invalid (missing end_before or start >= end),
              nothing is added.
        """
        device = device_manager.get_device_service().get_constant_action_device(self._id)
        if not device or not getattr(device, "actions", None):
            return
        action = device.actions[0]

        if self.is_controllable(device_manager):

            # Clamp to optimizer horizon start (typically current_time)
            start_from = max(action.start_from, current_time)
            end_before = action.end_before

            # If the window is impossible, don't add it (or handle differently)
            if end_before is None or start_from >= end_before:
                return

            context.add_constant_action(
                OptimizerConstantAction(
                    start_from=start_from,
                    end_before=end_before,
                    duration=action.duration,
                    consumption=action.consumption,
                    id=self._id,  # maybe needs to be action ID
                )
            )
        else:
            if self._schedule is None:
                return
            assigned = self._schedule.get_constant_action(self._id)
            if assigned is not None and assigned.get_end_time() > current_time:
                context.add_past_constant_action(assigned)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """
        Apply the stored schedule at the given time.

        If the interactor is currently IDLE and a schedule assignment exists whose
        start time is <= current_time, the controller starts the action.

        Args:
            current_time: Time used to decide whether to start the action.
            device_manager: Used to obtain the ConstantActionInteractor.

        Notes:
            This controller only triggers start. Stopping/completion is expected to be
            handled by the device/interactor implementation (e.g., by duration tracking).
        """
        interactor = device_manager.get_interactor_service(
        ).get_constant_action_interactor(self._id)
        state = interactor.get_action_state(device_manager)

        if state == ActionState.IDLE:
            assigned_start = self.assigned_start_time
            if assigned_start and current_time >= assigned_start:
                interactor.start_action(device_manager)

    def start_now(self, device_manager: "IDeviceManager") -> "None":
            """
            Immediately start the constant action via its interactor.
            
            This calls the interactor's `start_action` regardless of the stored
            schedule. The controller and optimizer behaviour should remain safe:
            - `use_schedule()` only stores schedules when the device is controllable,
                so calling `start_now()` won't be overwritten by a later `use_schedule()`
                unless the interactor reports the device is controllable again.
            - `update_device()` will not attempt to start an already-running action
                because it checks the interactor state.
            """
            interactor = device_manager.get_interactor_service().get_constant_action_interactor(self._id)
            interactor.start_action(device_manager)

    # ------------------------------------------------------------------
    # Getter helpers (delegating to the interactor / schedule)
    # These expose convenient, backend-facing information for API layers.
    # ------------------------------------------------------------------

    def get_current_power(self, device_manager: "IDeviceManager") -> "units.Watt":
        """
        Return current power consumption in Watts for this constant-action device
        by delegating to the interactor.
        """
        interactor = device_manager.get_interactor_service().get_constant_action_interactor(self._id)
        return interactor.get_current(device_manager)

    def get_action_state(self, device_manager: "IDeviceManager") -> "ActionState":
        """
        Return the interactor-reported action state (IDLE/RUNNING/COMPLETED).
        """
        interactor = device_manager.get_interactor_service().get_constant_action_interactor(self._id)
        return interactor.get_action_state(device_manager)

    def get_status(self, device_manager: "IDeviceManager") -> "DeviceStatus":
        """
        Map the interactor ActionState to a generic DeviceStatus enum.
        """
        state = self.get_action_state(device_manager)
        if state == ActionState.IDLE:
            return DeviceStatus.IDLE
        if state == ActionState.RUNNING:
            return DeviceStatus.RUNNING
        if state == ActionState.COMPLETED:
            return DeviceStatus.COMPLETED
        return DeviceStatus.UNKNOWN

    def get_status_str(self, device_manager: "IDeviceManager") -> str:
        return self.get_status(device_manager).value

    def get_assigned_end_time(self, device_manager: "IDeviceManager") -> "Optional[datetime]":
        """
        Return the scheduled end time for the assigned constant action (if any).
        """
        if self._schedule is None:
            return None
        assigned = self._schedule.get_constant_action(self._id)
        if assigned is None:
            return None
        return assigned.get_end_time()

    def get_assigned_consumption(self, device_manager: "IDeviceManager") -> "Optional[units.Watt]":
        """
        Return the scheduled consumption (W) for this device from the stored schedule,
        or None if no assignment exists.
        """
        if self._schedule is None:
            return None
        assigned = self._schedule.get_constant_action(self._id)
        if assigned is None:
            return None
        # Assigned constant action exposes get_consumption()
        try:
            return assigned.get_consumption()
        except Exception:
            return None

    def get_assigned_duration(self, device_manager: "IDeviceManager") -> "Optional[timedelta]":
        """
        Return the duration of the assigned action (end - start) if assigned,
        otherwise None.
        """
        start = self.assigned_start_time
        end = self.get_assigned_end_time(device_manager)
        if start is None or end is None:
            return None
        return end - start
