"""Background tasks for the application.

This module contains functions designed to be run periodically as background tasks,
such as updating device states from interactors and initializing services from the
database on startup.
"""
from datetime import datetime, timezone
from api.scopes import device_manager_scope
from controllers.battery_controller import BatteryController
from interactors.mock.mock_battery import MockBatteryInteractor
from interactors.mock.mock_generator import MockGeneratorInteractor
from interactors.mock.mock_constant_action import MockConstantActionInteractor
from interactors.mock.mock_variable_action import MockVariableActionInteractor
from instances import interactor_service_instance, controller_service_instance
from interactors.mock import (
    MockBatteryInteractor,
    MockGeneratorInteractor,
    MockConstantActionInteractor,
    MockVariableActionInteractor,
)
from controllers import (
    BatteryController,
    GeneratorPvController,
    ConstantActionController,
    VariableActionController,
)


def update_controllers():
    """Update all device states from their controllers."""
    current_time = datetime.now(timezone.utc)
    with device_manager_scope() as dm:
        for controller in dm.get_controller_service().get_all_controllers():
            controller.update_device(current_time, dm)


def update_mock_interactors():
    """Update the state of all mock interactors."""
    current_time = datetime.now(timezone.utc)
    with device_manager_scope() as dm:
        for battery_interactor in dm.get_interactor_service().get_all_battery_interactors():
            if (isinstance(battery_interactor, MockBatteryInteractor)):
                battery_interactor.update(current_time, dm)

        for generator_interactor in dm.get_interactor_service().get_all_generator_interactors():
            if (isinstance(generator_interactor, MockGeneratorInteractor)):
                generator_interactor.update(current_time, dm)

        for constant_action_interactor in dm.get_interactor_service().get_all_constant_action_interactors():
            if (isinstance(constant_action_interactor, MockConstantActionInteractor)):
                constant_action_interactor.update(current_time, dm)

        for variable_action_interactor in dm.get_interactor_service().get_all_variable_action_interactors():
            if (isinstance(variable_action_interactor, MockVariableActionInteractor)):
                variable_action_interactor.update(current_time, dm)


def initialize_services_from_db() -> None:
    """Populate interactor/controller services from devices stored in the DB without re-adding to the DB."""
    with device_manager_scope() as dm:
        ds = dm.get_device_service()
        # Batteries
        for dev in ds.get_all_batteries():
            interactor_service_instance.add_battery_interactor(
                MockBatteryInteractor(dev.id)
            )
            controller_service_instance.add_battery_controller(
                BatteryController(dev.id)
            )
        # Generators
        for dev in ds.get_all_generators():
            interactor_service_instance.add_generator_interactor(
                MockGeneratorInteractor(dev.id)
            )
            controller_service_instance.add_generator_controller(
                GeneratorPvController(dev.id)
            )
        # Constant actions
        for dev in ds.get_all_constant_action_devices():
            interactor_service_instance.add_constant_action_interactor(
                MockConstantActionInteractor(dev.id)
            )
            controller_service_instance.add_constant_action_controller(
                ConstantActionController(dev.id)
            )
        # Variable actions
        for dev in ds.get_all_variable_action_devices():
            interactor_service_instance.add_variable_action_interactor(
                MockVariableActionInteractor(dev.id)
            )
            controller_service_instance.add_variable_action_controller(
                VariableActionController(dev.id)
            )
