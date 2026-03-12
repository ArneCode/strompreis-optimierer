"""Background tasks for the application.

This module contains functions designed to be run periodically as background tasks,
such as updating device states from interactors and initializing services from the
database on startup.
"""
from datetime import datetime, timezone
from api.scopes import device_manager_scope, uow_scope
from controllers.battery_controller import BatteryController
from controllers.consumer_scheduled_controller import ConsumerScheduledController
from controllers.generator_random_controller import GeneratorRandomController
from controllers.generator_scheduled_controller import GeneratorScheduledController
from device_manager import DeviceManager
from interactors.mock.mock_battery import MockBatteryInteractor
from interactors.mock.mock_consumer_scheduled import MockConsumerScheduledInteractor
from interactors.mock.mock_generator_pv import MockGeneratorPVInteractor
from interactors.mock.mock_constant_action import MockConstantActionInteractor
from interactors.mock.mock_generator_random import MockGeneratorRandomInteractor
from interactors.mock.mock_generator_scheduled import MockGeneratorScheduledInteractor
from interactors.mock.mock_variable_action import MockVariableActionInteractor
from api.dependencies import (
    get_controller_service,
    get_interactor_service,
    get_orchestrator_service,
    get_optimizer_service,
)
from interactors.mock import (
    MockBatteryInteractor,
    MockGeneratorPVInteractor,
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
            if (isinstance(generator_interactor, (MockGeneratorPVInteractor, MockGeneratorRandomInteractor, MockGeneratorScheduledInteractor))):
                generator_interactor.update(current_time, dm)

        for constant_action_interactor in dm.get_interactor_service().get_all_constant_action_interactors():
            if (isinstance(constant_action_interactor, MockConstantActionInteractor)):
                constant_action_interactor.update(current_time, dm)

        for variable_action_interactor in dm.get_interactor_service().get_all_variable_action_interactors():
            if (isinstance(variable_action_interactor, MockVariableActionInteractor)):
                variable_action_interactor.update(current_time, dm)


def run_scheduled_optimization():
    """Run optimization if not already running."""
    print("Running scheduled optimization...")
    orchestrator_service = get_orchestrator_service()
    if orchestrator_service.currently_running:
        print("Optimization already running, skipping scheduled run.")
        return

    with uow_scope() as uow:
        device_manager = DeviceManager(uow)
        settings_service = uow.settings_service
        optimizer_service = get_optimizer_service()
        orchestrator_service.run_optimization(
            device_manager, settings_service, optimizer_service)


def initialize_services_from_db() -> None:
    """Populate interactor/controller services from devices stored in the DB without re-adding to the DB."""
    interactor_service = get_interactor_service()
    controller_service = get_controller_service()

    with device_manager_scope() as dm:
        ds = dm.get_device_service()
        # Batteries
        for dev in ds.get_all_batteries():
            interactor_service.add_battery_interactor(
                MockBatteryInteractor(dev.id, dev.current_charge)
            )
            controller_service.add_battery_controller(
                BatteryController(dev.id)
            )
        # Generators
        for dev in ds.get_all_generators_pv():
            interactor_service.add_generator_interactor(
                MockGeneratorPVInteractor(dev.id)
            )
            controller_service.add_generator_controller(
                GeneratorPvController(dev.id)
            )
        for dev in ds.get_all_generators_random():
            interactor_service.add_generator_interactor(
                MockGeneratorRandomInteractor(dev.id)
            )
            controller_service.add_generator_controller(
                GeneratorRandomController(dev.id)
            )
        for dev in ds.get_all_generators_scheduled():
            interactor_service.add_generator_interactor(
                MockGeneratorScheduledInteractor(dev.id)
            )
            controller_service.add_generator_controller(
                GeneratorScheduledController(dev.id)
            )
        for dev in ds.get_all_consumers_scheduled():
            interactor_service.add_consumer_scheduled_interactor(
                MockConsumerScheduledInteractor(dev.id)
            )
            controller_service.add_consumer_scheduled_controller(
                ConsumerScheduledController(dev.id)
            )
        # Constant actions
        for dev in ds.get_all_constant_action_devices():
            interactor_service.add_constant_action_interactor(
                MockConstantActionInteractor(dev.id)
            )
            controller_service.add_constant_action_controller(
                ConstantActionController(dev.id)
            )
        # Variable actions
        for dev in ds.get_all_variable_action_devices():
            interactor_service.add_variable_action_interactor(
                MockVariableActionInteractor(dev.id)
            )
            controller_service.add_variable_action_controller(
                VariableActionController(dev.id)
            )
