from datetime import time
from unittest.mock import create_autospec
import pytest

from device_manager import DeviceManager
from devices import (
    Battery,
    GeneratorPV,
    GeneratorRandom,
    GeneratorScheduled,
    ConstantActionDevice,
    VariableActionDevice,
)
from electricity_price_optimizer_py.units import Watt
from interactors.mock import (
    MockBatteryInteractor,
    MockGeneratorPVInteractor,
    MockConstantActionInteractor,
    MockVariableActionInteractor,
)
from controllers import (
    BatteryController,
    GeneratorPvController,
    GeneratorRandomController,
    GeneratorScheduledController,
    ConstantActionController,
    VariableActionController,
)
from uow import IUnitOfWork
from services.device_service import IDeviceService
from services.interactor_service import IInteractorService
from services.controller_service import IControllerService


@pytest.fixture
def uow():
    """Fixture for the Unit of Work mock."""
    uow_mock = create_autospec(IUnitOfWork, instance=True)
    uow_mock.device_service = create_autospec(IDeviceService, instance=True)
    uow_mock.interactor_service = create_autospec(
        IInteractorService, instance=True)
    uow_mock.controller_service = create_autospec(
        IControllerService, instance=True)
    uow_mock.device_service.add_device.return_value = 1
    return uow_mock


@pytest.fixture
def device_manager(uow):
    """Fixture for the DeviceManager."""
    return DeviceManager(uow)


class TestDeviceManager:
    def test_add_battery(self, device_manager, uow):
        device = Battery(id=1, name="Test Battery",
                         capacity=100, current_charge=50)
        device_id = device_manager.add_battery(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_battery_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_battery_interactor.call_args[0][0],
            MockBatteryInteractor,
        )
        uow.controller_service.add_battery_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_battery_controller.call_args[0][0],
            BatteryController,
        )

    def test_add_generator_pv(self, device_manager, uow):
        device = GeneratorPV(id=1, name="Test PV")
        device_id = device_manager.add_generator_pv(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_generator_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_generator_interactor.call_args[0][0],
            MockGeneratorPVInteractor,
        )
        uow.controller_service.add_generator_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_generator_controller.call_args[0][0],
            GeneratorPvController,
        )

    def test_add_generator_random(self, device_manager, uow):
        device = GeneratorRandom(id=1, name="Test Random Gen", seed=42)
        device_id = device_manager.add_generator_random(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_generator_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_generator_interactor.call_args[0][0],
            MockGeneratorPVInteractor,
        )
        uow.controller_service.add_generator_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_generator_controller.call_args[0][0],
            GeneratorRandomController,
        )

    def test_add_generator_scheduled(self, device_manager, uow):
        device = GeneratorScheduled(
            id=1, name="Test Scheduled Gen", schedule={time(0, 0): Watt(0)}
        )
        device_id = device_manager.add_generator_scheduled(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_generator_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_generator_interactor.call_args[0][0],
            MockGeneratorPVInteractor,
        )
        uow.controller_service.add_generator_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_generator_controller.call_args[0][0],
            GeneratorScheduledController,
        )

    def test_add_constant_action_device(self, device_manager, uow):
        device = ConstantActionDevice(id=1, name="Test Constant Device")
        device_id = device_manager.add_constant_action_device(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_constant_action_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_constant_action_interactor.call_args[0][0],
            MockConstantActionInteractor,
        )
        uow.controller_service.add_constant_action_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_constant_action_controller.call_args[0][0],
            ConstantActionController,
        )

    def test_add_variable_action_device(self, device_manager, uow):
        device = VariableActionDevice(id=1, name="Test Variable Device")
        device_id = device_manager.add_variable_action_device(device)

        assert device_id == 1
        uow.device_service.add_device.assert_called_once_with(device)
        uow.interactor_service.add_variable_action_interactor.assert_called_once()
        assert isinstance(
            uow.interactor_service.add_variable_action_interactor.call_args[0][0],
            MockVariableActionInteractor,
        )
        uow.controller_service.add_variable_action_controller.assert_called_once()
        assert isinstance(
            uow.controller_service.add_variable_action_controller.call_args[0][0],
            VariableActionController,
        )
