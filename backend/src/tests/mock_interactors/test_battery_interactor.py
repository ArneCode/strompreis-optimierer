from datetime import datetime, timedelta, timezone
from unittest.mock import create_autospec
import pytest

from device_manager import IDeviceManager
from devices import Battery
from electricity_price_optimizer_py.units import Watt, WattHour
from interactors.mock import MockBatteryInteractor
from services.device_service import IDeviceService
from services.interactor_service import IInteractorService
from services.controller_service import IControllerService


@pytest.fixture
def battery():
    """Fixture for a test battery device."""
    return Battery(
        id=1,
        name="Test Battery",
        capacity=WattHour(1000),
        current_charge=WattHour(500),
        max_charge_rate=Watt(500),
        max_discharge_rate=Watt(500),
        efficiency=1.0,
    )


@pytest.fixture
def device_manager(battery):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_battery.return_value = battery
    return dm


class TestMockBatteryInteractor:
    """Tests for MockBatteryInteractor."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_initial_charge_defaults_to_zero(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        assert interactor.get_charge(device_manager).get_value() == 0

    def test_initial_charge_can_be_set(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(500))

        assert interactor.get_charge(device_manager).get_value() == 500

    def test_initial_current_is_zero(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        assert interactor.get_current(device_manager).get_value() == 0

    def test_device_id_property(self):
        interactor = MockBatteryInteractor(id=42)

        assert interactor.device_id == 42

    # ─────────────────────────────────────────────
    # set_current: Charging
    # ─────────────────────────────────────────────
    def test_set_current_positive_charges(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        interactor.set_current(Watt(200), device_manager)

        assert interactor.get_current(device_manager).get_value() == 200

    def test_set_current_clamps_to_max_charge_rate(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        interactor.set_current(Watt(999), device_manager)  # Over max_charge_rate of 500

        assert interactor.get_current(device_manager).get_value() == 500

    # ─────────────────────────────────────────────
    # set_current: Discharging
    # ─────────────────────────────────────────────
    def test_set_current_negative_discharges(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        interactor.set_current(Watt(-200), device_manager)

        assert interactor.get_current(device_manager).get_value() == -200

    def test_set_current_clamps_to_max_discharge_rate(self, device_manager):
        interactor = MockBatteryInteractor(id=1)

        interactor.set_current(Watt(-999), device_manager)  # Over max_discharge_rate of 500

        assert interactor.get_current(device_manager).get_value() == -500

    # ─────────────────────────────────────────────
    # update: Time integration
    # ─────────────────────────────────────────────
    def test_update_increases_charge_when_charging(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(0))
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        interactor.set_current(Watt(100), device_manager)
        interactor.update(t0, device_manager)  # Sets baseline
        interactor.update(t1, device_manager)  # Integrates: +100Wh

        assert interactor.get_charge(device_manager).get_value() == 100

    def test_update_decreases_charge_when_discharging(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(500))
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        interactor.set_current(Watt(-100), device_manager)
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)  # -100Wh

        assert interactor.get_charge(device_manager).get_value() == 400

    def test_update_clamps_charge_to_capacity(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(900))
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        interactor.set_current(Watt(500), device_manager)  # Would add 500Wh -> 1400Wh
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)

        assert interactor.get_charge(device_manager).get_value() == 1000  # Clamped to capacity

    def test_update_clamps_charge_to_zero(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(50))
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        interactor.set_current(Watt(-500), device_manager)  # Would remove 500Wh -> -450Wh
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)

        assert interactor.get_charge(device_manager).get_value() == 0  # Clamped to zero

    def test_update_no_change_when_current_is_zero(self, device_manager):
        interactor = MockBatteryInteractor(id=1, initial_charge=WattHour(500))
        t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(hours=1)

        # Current is 0 by default
        interactor.update(t0, device_manager)
        interactor.update(t1, device_manager)

        assert interactor.get_charge(device_manager).get_value() == 500  # Unchanged
