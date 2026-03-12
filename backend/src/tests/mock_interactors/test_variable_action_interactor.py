from datetime import datetime, timedelta, timezone
from unittest.mock import create_autospec, Mock
import pytest

from device_manager import IDeviceManager
from devices import VariableActionDevice, VariableAction
from electricity_price_optimizer_py.units import Watt, WattHour
from interactors.mock import MockVariableActionInteractor
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
def device_manager(variable_action_device):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_variable_action_device.return_value = variable_action_device
    return dm


class TestMockVariableActionInteractor:
    """Tests for MockVariableActionInteractor."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_device_id_property(self):
        interactor = MockVariableActionInteractor(id=42)

        assert interactor.device_id == 42

    def test_initial_current_is_zero(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)

        assert interactor.get_current(device_manager).get_value() == 0

    def test_initial_total_consumed_is_zero(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)

        assert interactor.get_total_consumed(device_manager).get_value() == 0

    # ─────────────────────────────────────────────
    # set_current
    # ─────────────────────────────────────────────
    def test_set_current_stores_value(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)

        interactor.set_current(Watt(1000), device_manager)

        assert interactor.get_current(device_manager).get_value() == 1000

    def test_set_current_clamps_to_max_consumption(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)

        interactor.set_current(Watt(5000), device_manager)  # Over max of 2000

        assert interactor.get_current(device_manager).get_value() == 2000

    def test_set_current_clamps_to_zero_minimum(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)

        interactor.set_current(Watt(-500), device_manager)  # Negative

        assert interactor.get_current(device_manager).get_value() == 0

    # ─────────────────────────────────────────────
    # update
    # ─────────────────────────────────────────────
    def test_update_accumulates_energy(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        interactor.set_current(Watt(1000), device_manager)
        interactor.update(t0, device_manager)  # Sets baseline
        interactor.update(t1, device_manager)  # 1000W * 1h = 1000Wh

        assert interactor.get_total_consumed(device_manager).get_value() == 1000

    def test_update_no_accumulation_when_current_is_zero(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        # Current is 0 by default
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)

        assert interactor.get_total_consumed(device_manager).get_value() == 0

    def test_update_accumulates_over_multiple_periods(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)
        t2 = t1 + timedelta(hours=1)

        interactor.set_current(Watt(1000), device_manager)
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)  # +1000Wh

        interactor.set_current(Watt(500), device_manager)
        interactor.update(t2, device_manager)  # +500Wh

        assert interactor.get_total_consumed(device_manager).get_value() == 1500

    def test_update_first_call_sets_baseline(self, device_manager):
        interactor = MockVariableActionInteractor(id=1)
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        interactor.set_current(Watt(1000), device_manager)
        interactor.update(t0, device_manager)  # First call, no accumulation

        assert interactor.get_total_consumed(device_manager).get_value() == 0
