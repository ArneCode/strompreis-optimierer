import pytest
from unittest.mock import MagicMock

from services.controller_service import ControllerService
from controllers import (
    BatteryController,
    ConstantActionController,
    VariableActionController,
)
from controllers.base import GeneratorController


@pytest.fixture
def controller_service():
    """Fixture for a new ControllerService instance."""
    return ControllerService()


@pytest.fixture
def mock_battery_controller():
    """Fixture for a mocked BatteryController."""
    mock = MagicMock(spec=BatteryController)
    mock.device_id = 1
    return mock


@pytest.fixture
def mock_generator_controller():
    """Fixture for a mocked GeneratorController."""
    mock = MagicMock(spec=GeneratorController)
    mock.device_id = 2
    return mock


@pytest.fixture
def mock_constant_action_controller():
    """Fixture for a mocked ConstantActionController."""
    mock = MagicMock(spec=ConstantActionController)
    mock.device_id = 3
    return mock


@pytest.fixture
def mock_variable_action_controller():
    """Fixture for a mocked VariableActionController."""
    mock = MagicMock(spec=VariableActionController)
    mock.device_id = 4
    return mock


class TestControllerService:
    def test_initial_state(self, controller_service: ControllerService):
        assert controller_service.get_all_controllers() == []
        assert controller_service.get_battery_controller(1) is None

    def test_add_and_get_staged(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        assert controller_service.get_battery_controller(
            1) == mock_battery_controller
        assert controller_service.get_all_controllers() == [
            mock_battery_controller]

    def test_add_and_commit(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.commit()
        assert controller_service.get_battery_controller(
            1) == mock_battery_controller
        # Rollback should have no effect after commit
        controller_service.rollback()
        assert controller_service.get_battery_controller(
            1) == mock_battery_controller

    def test_add_and_rollback(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.rollback()
        assert controller_service.get_battery_controller(1) is None
        assert controller_service.get_all_controllers() == []

    def test_remove_staged(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.commit()
        controller_service.remove_controller(1)
        assert controller_service.get_battery_controller(1) is None
        assert controller_service.get_all_controllers() == []

    def test_remove_and_rollback(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.commit()
        controller_service.remove_controller(1)
        controller_service.rollback()
        assert controller_service.get_battery_controller(
            1) == mock_battery_controller
        assert controller_service.get_all_controllers() == [
            mock_battery_controller]

    def test_remove_and_commit(
        self, controller_service: ControllerService, mock_battery_controller: BatteryController
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.commit()
        controller_service.remove_controller(1)
        controller_service.commit()
        assert controller_service.get_battery_controller(1) is None
        assert controller_service.get_all_controllers() == []

    def test_get_all_methods(
        self,
        controller_service: ControllerService,
        mock_battery_controller: BatteryController,
        mock_generator_controller: GeneratorController,
        mock_constant_action_controller: ConstantActionController,
        mock_variable_action_controller: VariableActionController,
    ):
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.add_generator_controller(mock_generator_controller)
        controller_service.add_constant_action_controller(
            mock_constant_action_controller)
        controller_service.add_variable_action_controller(
            mock_variable_action_controller)

        assert controller_service.get_all_battery_controllers() == [
            mock_battery_controller
        ]
        assert controller_service.get_all_generator_controllers() == [
            mock_generator_controller
        ]
        assert controller_service.get_all_constant_action_controllers() == [
            mock_constant_action_controller
        ]
        assert controller_service.get_all_variable_action_controllers() == [
            mock_variable_action_controller
        ]

        all_controllers = controller_service.get_all_controllers()
        assert len(all_controllers) == 4
        assert mock_battery_controller in all_controllers
        assert mock_generator_controller in all_controllers
        assert mock_constant_action_controller in all_controllers
        assert mock_variable_action_controller in all_controllers

    def test_transactionality(
        self,
        controller_service: ControllerService,
        mock_battery_controller: BatteryController,
        mock_generator_controller: GeneratorController,
    ):
        # Commit initial state
        controller_service.add_battery_controller(mock_battery_controller)
        controller_service.commit()
        assert controller_service.get_all_controllers() == [
            mock_battery_controller]

        # Start transaction
        controller_service.remove_controller(
            mock_battery_controller.device_id)  # Delete
        controller_service.add_generator_controller(
            mock_generator_controller)  # Add

        # Check staged state
        assert controller_service.get_battery_controller(1) is None
        assert (
            controller_service.get_generator_controller(
                2) == mock_generator_controller
        )
        assert controller_service.get_all_controllers() == [
            mock_generator_controller]

        # Rollback
        controller_service.rollback()

        # Check that we are back to the committed state
        assert controller_service.get_battery_controller(
            1) == mock_battery_controller
        assert controller_service.get_generator_controller(2) is None
        assert controller_service.get_all_controllers() == [
            mock_battery_controller]
