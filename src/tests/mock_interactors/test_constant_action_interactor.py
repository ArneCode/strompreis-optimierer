from datetime import datetime, timedelta, timezone
from unittest.mock import create_autospec, Mock
import pytest

from device_manager import IDeviceManager
from devices import ConstantActionDevice, ConstantAction
from electricity_price_optimizer_py.units import Watt
from interactors.mock import MockConstantActionInteractor
from interactors.interfaces import ActionState
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
def device_manager(constant_action_device):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_constant_action_device.return_value = constant_action_device
    return dm


class TestMockConstantActionInteractor:
    """Tests for MockConstantActionInteractor."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_device_id_property(self):
        interactor = MockConstantActionInteractor(id=42)

        assert interactor.device_id == 42

    def test_initial_state_is_idle(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)

        assert interactor.get_action_state(device_manager) == ActionState.IDLE

    def test_initial_start_time_is_none(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)

        assert interactor.get_start_time(device_manager) is None

    # ─────────────────────────────────────────────
    # start_action
    # ─────────────────────────────────────────────
    def test_start_action_changes_state_to_running(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)

        interactor.start_action(device_manager)

        assert interactor.get_action_state(device_manager) == ActionState.RUNNING

    def test_start_action_sets_start_time(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)

        interactor.start_action(device_manager)

        assert interactor.get_start_time(device_manager) is not None

    def test_start_action_does_nothing_if_not_idle(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        interactor.start_action(device_manager)  # Now RUNNING

        interactor.start_action(device_manager)  # Should do nothing

        assert interactor.get_action_state(device_manager) == ActionState.RUNNING

    # ─────────────────────────────────────────────
    # stop_action
    # ─────────────────────────────────────────────
    def test_stop_action_resets_to_idle(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        interactor.start_action(device_manager)

        interactor.stop_action(device_manager)

        assert interactor.get_action_state(device_manager) == ActionState.IDLE

    def test_stop_action_clears_start_time(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        interactor.start_action(device_manager)

        interactor.stop_action(device_manager)

        assert interactor.get_start_time(device_manager) is None

    # ─────────────────────────────────────────────
    # get_current
    # ─────────────────────────────────────────────
    def test_get_current_returns_zero_when_idle(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)

        result = interactor.get_current(device_manager)

        assert result.get_value() == 0

    def test_get_current_returns_consumption_when_running(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        interactor.start_action(device_manager)

        result = interactor.get_current(device_manager)

        assert result.get_value() == 1000  # From fixture

    def test_get_current_returns_zero_when_completed(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=3)  # Duration is 2 hours

        interactor._state = ActionState.RUNNING
        interactor._start_time = t0
        interactor.update(t1, device_manager)  # Should complete

        result = interactor.get_current(device_manager)

        assert result.get_value() == 0

    # ─────────────────────────────────────────────
    # update
    # ─────────────────────────────────────────────
    def test_update_completes_action_after_duration(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=2)  # Exactly duration

        interactor._state = ActionState.RUNNING
        interactor._start_time = t0
        interactor.update(t1, device_manager)

        assert interactor.get_action_state(device_manager) == ActionState.COMPLETED

    def test_update_keeps_running_before_duration(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)  # Less than duration

        interactor._state = ActionState.RUNNING
        interactor._start_time = t0
        interactor.update(t1, device_manager)

        assert interactor.get_action_state(device_manager) == ActionState.RUNNING

    def test_update_does_nothing_when_idle(self, device_manager):
        interactor = MockConstantActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        interactor.update(t0, device_manager)

        assert interactor.get_action_state(device_manager) == ActionState.IDLE
