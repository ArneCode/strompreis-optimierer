from datetime import datetime, timezone
from api.scopes import device_manager_scope
from interactors.mock.mock_battery import MockBatteryInteractor
from interactors.mock.mock_generator import MockGeneratorInteractor
from interactors.mock.mock_constant_action import MockConstantActionInteractor
from interactors.mock.mock_variable_action import MockVariableActionInteractor


def update_controllers():
    current_time = datetime.now(timezone.utc)
    with device_manager_scope() as dm:
        for controller in dm.get_controller_service().get_all_controllers():
            controller.update_device(current_time, dm)


def update_mock_interactors():
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
