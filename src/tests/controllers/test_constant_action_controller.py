from datetime import datetime, timedelta, timezone
from unittest.mock import create_autospec, Mock
import pytest

from device_manager import IDeviceManager
from devices import ConstantActionDevice, ConstantAction
from electricity_price_optimizer_py.units import Watt
from electricity_price_optimizer_py import Schedule, OptimizerContext
from controllers import ConstantActionController
from interactors.interfaces import ConstantActionInteractor, ActionState, DeviceStatus
from services.device_service import IDeviceService
from services.interactor_service import IInteractorService
from services.controller_service import IControllerService


@pytest.fixture
def constant_action():
    """Fixture for a test constant action."""
    action = Mock(spec=ConstantAction)
    action.start_from = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    action.end_before = datetime(2026, 1, 1, 18, 0, 0, tzinfo=timezone.utc)
    action.duration = timedelta(hours=2)
    action.consumption = Watt(1000)
    return action


@pytest.fixture
def constant_action_device(constant_action):
    """Fixture for a test constant action device."""
    device = Mock(spec=ConstantActionDevice)
    device.id = 1
    device.name = "Test Dishwasher"
    device.actions = [constant_action]
    return device


@pytest.fixture
def constant_action_interactor():
    """Fixture for mocked ConstantActionInteractor."""
    interactor = create_autospec(ConstantActionInteractor, instance=True)
    interactor.get_action_state.return_value = ActionState.IDLE
    interactor.get_current.return_value = Watt(0)
    return interactor


@pytest.fixture
def device_manager(constant_action_device, constant_action_interactor):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_constant_action_device.return_value = constant_action_device
    dm.get_interactor_service().get_constant_action_interactor.return_value = constant_action_interactor
    return dm


class TestConstantActionController:
    """Tests for ConstantActionController."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_device_id_property(self):
        controller = ConstantActionController(id=42)

        assert controller.device_id == 42

    def test_initial_schedule_is_none(self):
        controller = ConstantActionController(id=1)

        assert controller._schedule is None

    def test_assigned_start_time_is_none_without_schedule(self):
        controller = ConstantActionController(id=1)

        assert controller.assigned_start_time is None

    # ─────────────────────────────────────────────
    # is_controllable
    # ─────────────────────────────────────────────
    def test_is_controllable_true_when_idle(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.IDLE

        assert controller.is_controllable(device_manager) is True

    def test_is_controllable_true_when_completed(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.COMPLETED

        assert controller.is_controllable(device_manager) is True

    def test_is_controllable_false_when_running(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING

        assert controller.is_controllable(device_manager) is False

    # ─────────────────────────────────────────────
    # use_schedule
    # ─────────────────────────────────────────────
    def test_use_schedule_stores_schedule_when_controllable(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        mock_schedule = create_autospec(Schedule, instance=True)

        controller.use_schedule(mock_schedule, device_manager)

        assert controller._schedule is mock_schedule

    def test_use_schedule_ignores_schedule_when_not_controllable(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING
        mock_schedule = create_autospec(Schedule, instance=True)

        controller.use_schedule(mock_schedule, device_manager)

        assert controller._schedule is None

    def test_use_schedule_keeps_old_schedule_when_not_controllable(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        old_schedule = create_autospec(Schedule, instance=True)
        new_schedule = create_autospec(Schedule, instance=True)

        # First, set a schedule while IDLE
        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(old_schedule, device_manager)

        # Then try to update while RUNNING
        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING
        controller.use_schedule(new_schedule, device_manager)

        assert controller._schedule is old_schedule

    # ─────────────────────────────────────────────
    # assigned_start_time
    # ─────────────────────────────────────────────
    def test_assigned_start_time_returns_time_from_schedule(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        expected_time = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_start_time.return_value = expected_time

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        assert controller.assigned_start_time == expected_time

    def test_assigned_start_time_returns_none_when_no_assignment(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = None

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        assert controller.assigned_start_time is None

    # ─────────────────────────────────────────────
    # get_current_power (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_current_power_delegates_to_interactor(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_current.return_value = Watt(1000)

        result = controller.get_current_power(device_manager)

        assert result.get_value() == 1000
        constant_action_interactor.get_current.assert_called_once_with(device_manager)

    # ─────────────────────────────────────────────
    # get_action_state (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_action_state_delegates_to_interactor(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING

        result = controller.get_action_state(device_manager)

        assert result == ActionState.RUNNING

    # ─────────────────────────────────────────────
    # get_status
    # ─────────────────────────────────────────────
    def test_get_status_returns_idle(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.IDLE

        assert controller.get_status(device_manager) == DeviceStatus.IDLE

    def test_get_status_returns_running(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING

        assert controller.get_status(device_manager) == DeviceStatus.RUNNING

    def test_get_status_returns_completed(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        constant_action_interactor.get_action_state.return_value = ActionState.COMPLETED

        assert controller.get_status(device_manager) == DeviceStatus.COMPLETED

    # ─────────────────────────────────────────────
    # update_device
    # ─────────────────────────────────────────────
    def test_update_device_starts_action_when_time_reached(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        scheduled_start = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)
        current_time = datetime(2026, 1, 1, 14, 30, 0, tzinfo=timezone.utc)  # After scheduled

        mock_assigned = Mock()
        mock_assigned.get_start_time.return_value = scheduled_start

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        constant_action_interactor.start_action.assert_called_once_with(device_manager)

    def test_update_device_does_not_start_before_scheduled_time(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        scheduled_start = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)
        current_time = datetime(2026, 1, 1, 13, 0, 0, tzinfo=timezone.utc)  # Before scheduled

        mock_assigned = Mock()
        mock_assigned.get_start_time.return_value = scheduled_start

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        constant_action_interactor.start_action.assert_not_called()

    def test_update_device_does_not_start_when_already_running(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        scheduled_start = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)
        current_time = datetime(2026, 1, 1, 14, 30, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_start_time.return_value = scheduled_start

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        # Set IDLE first to store schedule, then RUNNING
        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        constant_action_interactor.get_action_state.return_value = ActionState.RUNNING
        controller.update_device(current_time, device_manager)

        constant_action_interactor.start_action.assert_not_called()

    def test_update_device_does_nothing_without_schedule(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        current_time = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.update_device(current_time, device_manager)

        constant_action_interactor.start_action.assert_not_called()

    # ─────────────────────────────────────────────
    # get_assigned_end_time
    # ─────────────────────────────────────────────
    def test_get_assigned_end_time_returns_time_from_schedule(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        expected_end = datetime(2026, 1, 1, 16, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_end_time.return_value = expected_end

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        assert controller.get_assigned_end_time(device_manager) == expected_end

    def test_get_assigned_end_time_returns_none_without_schedule(self, device_manager):
        controller = ConstantActionController(id=1)

        assert controller.get_assigned_end_time(device_manager) is None

    # ─────────────────────────────────────────────
    # get_assigned_consumption
    # ─────────────────────────────────────────────
    def test_get_assigned_consumption_returns_value_from_schedule(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)

        mock_assigned = Mock()
        mock_assigned.get_consumption.return_value = Watt(1500)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        result = controller.get_assigned_consumption(device_manager)

        assert result.get_value() == 1500

    def test_get_assigned_consumption_returns_none_without_schedule(self, device_manager):
        controller = ConstantActionController(id=1)

        assert controller.get_assigned_consumption(device_manager) is None

    # ─────────────────────────────────────────────
    # get_assigned_duration
    # ─────────────────────────────────────────────
    def test_get_assigned_duration_computes_from_start_and_end(self, device_manager, constant_action_interactor):
        controller = ConstantActionController(id=1)
        start_time = datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2026, 1, 1, 16, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_start_time.return_value = start_time
        mock_assigned.get_end_time.return_value = end_time

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_constant_action.return_value = mock_assigned

        constant_action_interactor.get_action_state.return_value = ActionState.IDLE
        controller.use_schedule(mock_schedule, device_manager)

        result = controller.get_assigned_duration(device_manager)

        assert result == timedelta(hours=2)

    def test_get_assigned_duration_returns_none_without_schedule(self, device_manager):
        controller = ConstantActionController(id=1)

        assert controller.get_assigned_duration(device_manager) is None
