from datetime import datetime, timezone
from unittest.mock import create_autospec, Mock
import pytest

from device_manager import IDeviceManager
from devices import Battery
from electricity_price_optimizer_py.units import Watt, WattHour
from electricity_price_optimizer_py import Schedule, OptimizerContext, Battery as OptimizerBattery
from controllers import BatteryController
from interactors.interfaces import BatteryInteractor, DeviceStatus
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
def battery_interactor():
    """Fixture for mocked BatteryInteractor."""
    interactor = create_autospec(BatteryInteractor, instance=True)
    interactor.get_charge.return_value = WattHour(500)
    interactor.get_current.return_value = Watt(0)
    return interactor


@pytest.fixture
def device_manager(battery, battery_interactor):
    """Fixture for mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    dm.get_device_service.return_value = create_autospec(IDeviceService, instance=True)
    dm.get_interactor_service.return_value = create_autospec(IInteractorService, instance=True)
    dm.get_controller_service.return_value = create_autospec(IControllerService, instance=True)
    dm.get_device_service().get_battery.return_value = battery
    dm.get_interactor_service().get_battery_interactor.return_value = battery_interactor
    return dm


class TestBatteryController:
    """Tests for BatteryController."""

    # ─────────────────────────────────────────────
    # Initialization
    # ─────────────────────────────────────────────
    def test_device_id_property(self):
        controller = BatteryController(id=42)

        assert controller.device_id == 42

    def test_initial_schedule_is_none(self):
        controller = BatteryController(id=1)

        assert controller._schedule is None

    # ─────────────────────────────────────────────
    # use_schedule
    # ─────────────────────────────────────────────
    def test_use_schedule_stores_schedule(self, device_manager):
        controller = BatteryController(id=1)
        mock_schedule = create_autospec(Schedule, instance=True)

        controller.use_schedule(mock_schedule, device_manager)

        assert controller._schedule is mock_schedule

    # ─────────────────────────────────────────────
    # get_current_power (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_current_power_delegates_to_interactor(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        battery_interactor.get_current.return_value = Watt(200)

        result = controller.get_current_power(device_manager)

        assert result.get_value() == 200
        battery_interactor.get_current.assert_called_once_with(device_manager)

    # ─────────────────────────────────────────────
    # get_charge (delegates to interactor)
    # ─────────────────────────────────────────────
    def test_get_charge_delegates_to_interactor(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        battery_interactor.get_charge.return_value = WattHour(750)

        result = controller.get_charge(device_manager)

        assert result.get_value() == 750
        battery_interactor.get_charge.assert_called_once_with(device_manager)

    # ─────────────────────────────────────────────
    # get_status
    # ─────────────────────────────────────────────
    def test_get_status_returns_charging_when_positive(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        battery_interactor.get_current.return_value = Watt(100)

        status = controller.get_status(device_manager)

        assert status == DeviceStatus.CHARGING

    def test_get_status_returns_discharging_when_negative(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        battery_interactor.get_current.return_value = Watt(-100)

        status = controller.get_status(device_manager)

        assert status == DeviceStatus.DISCHARGING

    def test_get_status_returns_idle_when_zero(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        battery_interactor.get_current.return_value = Watt(0)

        status = controller.get_status(device_manager)

        assert status == DeviceStatus.IDLE

    # ─────────────────────────────────────────────
    # update_device
    # ─────────────────────────────────────────────
    def test_update_device_does_nothing_without_schedule(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        controller.update_device(current_time, device_manager)

        battery_interactor.set_current.assert_not_called()

    def test_update_device_sets_current_from_schedule(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        # Mock the schedule and assigned battery
        mock_assigned = Mock()
        mock_assigned.get_charge_speed.return_value = Watt(300)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_battery.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        battery_interactor.set_current.assert_called_once_with(Watt(300), device_manager)

    def test_update_device_handles_no_assigned_battery(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_battery.return_value = None  # No assignment for this battery

        controller.use_schedule(mock_schedule, device_manager)
        controller.update_device(current_time, device_manager)

        battery_interactor.set_current.assert_not_called()

    def test_update_device_handles_value_error(self, device_manager, battery_interactor):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_charge_speed.side_effect = ValueError("Time out of range")

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_battery.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        # Should not raise, just return silently
        controller.update_device(current_time, device_manager)

        battery_interactor.set_current.assert_not_called()

    # ─────────────────────────────────────────────
    # get_assigned_charge_rate
    # ─────────────────────────────────────────────
    def test_get_assigned_charge_rate_returns_none_without_schedule(self, device_manager):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        result = controller.get_assigned_charge_rate(current_time, device_manager)

        assert result is None

    def test_get_assigned_charge_rate_returns_rate_from_schedule(self, device_manager):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_assigned = Mock()
        mock_assigned.get_charge_speed.return_value = Watt(250)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_battery.return_value = mock_assigned

        controller.use_schedule(mock_schedule, device_manager)
        result = controller.get_assigned_charge_rate(current_time, device_manager)

        assert result.get_value() == 250

    def test_get_assigned_charge_rate_returns_none_when_no_assignment(self, device_manager):
        controller = BatteryController(id=1)
        current_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        mock_schedule = create_autospec(Schedule, instance=True)
        mock_schedule.get_battery.return_value = None

        controller.use_schedule(mock_schedule, device_manager)
        result = controller.get_assigned_charge_rate(current_time, device_manager)

        assert result is None
