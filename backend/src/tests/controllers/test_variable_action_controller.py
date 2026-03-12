from datetime import datetime, timedelta, timezone
from unittest.mock import create_autospec, Mock
import pytest

from device_manager import IDeviceManager
from devices import VariableActionDevice, VariableAction
from electricity_price_optimizer_py.units import Watt, WattHour
from electricity_price_optimizer_py import Schedule, OptimizerContext
from controllers import VariableActionController
from interactors.interfaces import VariableActionInteractor, DeviceStatus
from services.device_service import IDeviceService
from services.interactor_service import IInteractorService
from services.controller_service import IControllerService


@pytest.fixture
def variable_action():
    """Fixture for a test variable action."""
    action = Mock(spec=VariableAction)
    action.start = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    action.end = datetime(2026, 1, 1, 18, 0, 0, tzinfo=timezone.utc)
    action.total_consumption = WattHour(5000)
    action.max_consumption = Watt(2000)
    return action


@pytest.fixture
def variable_action_device(variable_action):
    """Fixture for a test variable action device."""
    device = Mock(spec=VariableActionDevice)
    device.id = 1
    device.name = "Test EV Charger"
    device.actions = [variable_action]
    return device


@pytest.fixture
def variable_action_interactor():
    """Fixture for mocked VariableActionInteractor."""
    interactor = create_autospec(VariableActionInteractor, instance=True)
    interactor.get_current.return_value = Watt(0)
    interactor.get_total_consumed.return_value = WattHour(0)
    return interactor


@pytest.fixture
def device_manager(variable_action_device, variable_action_interactor):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_variable_action_device.return_value = variable_action_device
    dm.get_interactor_service().get_variable_action_interactor.return_value = variable_action_interactor
    return dm


class TestVariableActionController:
    """Tests for VariableActionController."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_device_id_property(self):
        controller = VariableActionController(id=42)

        assert controller.device_id == 42

    def test_initial_schedule_is_none(self):
        controller = VariableActionController(id=1)

        assert controller._schedule is None

    # ─────────────────────────────────────────────
    # use_schedule
    # ─────────────────────────────────────────────
    def test_use_schedule_stores_schedule(self, device_manager):
        controller = VariableActionController(id=1)
        mock_schedule = create_autospec(Schedule, instance=True)

        controller.use_schedule(mock_schedule, device_manager)

        assert controller._schedule is mock_schedule

    # ─────────────────────────────────────────────
    # get_current_power (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_current_power_delegates_to_interactor(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        variable_action_interactor.get_current.return_value = Watt(1500)

        result = controller.get_current_power(device_manager)

        assert result.get_value() == 1500
        variable_action_interactor.get_current.assert_called_once_with(device_manager)

    def test_get_current_power_returns_zero_when_no_interactor(self, device_manager):
        controller = VariableActionController(id=1)
        device_manager.get_interactor_service().get_variable_action_interactor.return_value = None

        result = controller.get_current_power(device_manager)

        assert result.get_value() == 0

    # ─────────────────────────────────────────────
    # get_total_consumed (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_total_consumed_delegates_to_interactor(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        variable_action_interactor.get_total_consumed.return_value = WattHour(2500)

        result = controller.get_total_consumed(device_manager)

        assert result.get_value() == 2500
        variable_action_interactor.get_total_consumed.assert_called_once_with(device_manager)

    def test_get_total_consumed_returns_zero_when_no_interactor(self, device_manager):
        controller = VariableActionController(id=1)
        device_manager.get_interactor_service().get_variable_action_interactor.return_value = None

        result = controller.get_total_consumed(device_manager)

        assert result.get_value() == 0

    # ─────────────────────────────────────────────
    # get_status
    # ─────────────────────────────────────────────
    def test_get_status_returns_running_when_consuming(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        variable_action_interactor.get_current.return_value = Watt(1000)

        status = controller.get_status(current_time, device_manager)

        assert status == DeviceStatus.RUNNING

    def test_get_status_returns_idle_when_not_consuming(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        variable_action_interactor.get_current.return_value = Watt(0)

        status = controller.get_status(current_time, device_manager)

        assert status == DeviceStatus.IDLE

    # ─────────────────────────────────────────────
    # update_device
    # ─────────────────────────────────────────────
    def test_update_device_sets_current_from_schedule(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_consumption.return_value = Watt(1500)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        variable_action_interactor.set_current.assert_called_once_with(Watt(1500), device_manager)

    def test_update_device_does_nothing_without_schedule(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        controller.update_device(current_time, device_manager)

        variable_action_interactor.set_current.assert_not_called()

    def test_update_device_does_nothing_when_no_assignment(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = None

        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        variable_action_interactor.set_current.assert_not_called()

    def test_update_device_sets_zero_when_time_out_of_range(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_consumption.side_effect = Exception("Time out of range")

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        variable_action_interactor.set_current.assert_called_once_with(Watt(0), device_manager)

    # ─────────────────────────────────────────────
    # get_assigned_consumption
    # ─────────────────────────────────────────────
    def test_get_assigned_consumption_returns_value_from_schedule(self, device_manager):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_consumption.return_value = Watt(1800)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        result = controller.get_assigned_consumption(current_time, device_manager)

        assert result.get_value() == 1800

    def test_get_assigned_consumption_returns_none_without_schedule(self, device_manager):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        result = controller.get_assigned_consumption(current_time, device_manager)

        assert result is None

    def test_get_assigned_consumption_returns_none_when_no_assignment(self, device_manager):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = None

        controller.use_schedule(mock_schedule, device_manager)
        result = controller.get_assigned_consumption(current_time, device_manager)

        assert result is None

    def test_get_assigned_consumption_returns_none_on_exception(self, device_manager):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_consumption.side_effect = Exception("Error")

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_variable_action.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        result = controller.get_assigned_consumption(current_time, device_manager)

        assert result is None

    # ─────────────────────────────────────────────
    # get_status_str
    # ─────────────────────────────────────────────
    def test_get_status_str_returns_string(self, device_manager, variable_action_interactor):
        controller = VariableActionController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        variable_action_interactor.get_current.return_value = Watt(1000)

        result = controller.get_status_str(current_time, device_manager)

        assert result == "running"
