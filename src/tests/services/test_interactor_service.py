import pytest
from unittest.mock import MagicMock

from services.interactor_service import InteractorService
from interactors.interfaces import (
    BatteryInteractor,
    GeneratorInteractor,
    ConstantActionInteractor,
    VariableActionInteractor,
)


@pytest.fixture
def interactor_service():
    """Fixture for a new InteractorService instance."""
    return InteractorService()


@pytest.fixture
def mock_battery_interactor():
    """Fixture for a mocked BatteryInteractor."""
    mock = MagicMock(spec=BatteryInteractor)
    mock.device_id = 1
    return mock


@pytest.fixture
def mock_generator_interactor():
    """Fixture for a mocked GeneratorInteractor."""
    mock = MagicMock(spec=GeneratorInteractor)
    mock.device_id = 2
    return mock


@pytest.fixture
def mock_constant_action_interactor():
    """Fixture for a mocked ConstantActionInteractor."""
    mock = MagicMock(spec=ConstantActionInteractor)
    mock.device_id = 3
    return mock


@pytest.fixture
def mock_variable_action_interactor():
    """Fixture for a mocked VariableActionInteractor."""
    mock = MagicMock(spec=VariableActionInteractor)
    mock.device_id = 4
    return mock


class TestInteractorService:
    def test_initial_state(self, interactor_service: InteractorService):
        assert interactor_service.get_all_battery_interactors() == []
        assert interactor_service.get_battery_interactor(1) is None

    def test_add_and_get_staged(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        assert interactor_service.get_battery_interactor(
            1) == mock_battery_interactor
        assert interactor_service.get_all_battery_interactors() == [
            mock_battery_interactor]

    def test_add_and_commit(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.commit()
        assert interactor_service.get_battery_interactor(
            1) == mock_battery_interactor
        # Rollback should have no effect after commit
        interactor_service.rollback()
        assert interactor_service.get_battery_interactor(
            1) == mock_battery_interactor

    def test_add_and_rollback(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.rollback()
        assert interactor_service.get_battery_interactor(1) is None
        assert interactor_service.get_all_battery_interactors() == []

    def test_remove_staged(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.commit()
        interactor_service.remove_interactor(1)
        assert interactor_service.get_battery_interactor(1) is None
        assert interactor_service.get_all_battery_interactors() == []

    def test_remove_and_rollback(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.commit()
        interactor_service.remove_interactor(1)
        interactor_service.rollback()
        assert interactor_service.get_battery_interactor(
            1) == mock_battery_interactor
        assert interactor_service.get_all_battery_interactors() == [
            mock_battery_interactor]

    def test_remove_and_commit(
        self, interactor_service: InteractorService, mock_battery_interactor: BatteryInteractor
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.commit()
        interactor_service.remove_interactor(1)
        interactor_service.commit()
        assert interactor_service.get_battery_interactor(1) is None
        assert interactor_service.get_all_battery_interactors() == []

    def test_get_all_methods(
        self,
        interactor_service: InteractorService,
        mock_battery_interactor: BatteryInteractor,
        mock_generator_interactor: GeneratorInteractor,
        mock_constant_action_interactor: ConstantActionInteractor,
        mock_variable_action_interactor: VariableActionInteractor,
    ):
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.add_generator_interactor(mock_generator_interactor)
        interactor_service.add_constant_action_interactor(
            mock_constant_action_interactor)
        interactor_service.add_variable_action_interactor(
            mock_variable_action_interactor)

        assert interactor_service.get_all_battery_interactors() == [
            mock_battery_interactor]
        assert interactor_service.get_all_generator_interactors() == [
            mock_generator_interactor]
        assert interactor_service.get_all_constant_action_interactors() == [
            mock_constant_action_interactor]
        assert interactor_service.get_all_variable_action_interactors() == [
            mock_variable_action_interactor]

    def test_transactionality(
        self,
        interactor_service: InteractorService,
        mock_battery_interactor: BatteryInteractor,
        mock_generator_interactor: GeneratorInteractor,
    ):
        # Commit initial state
        interactor_service.add_battery_interactor(mock_battery_interactor)
        interactor_service.commit()
        assert interactor_service.get_all_battery_interactors() == [
            mock_battery_interactor]

        # Start transaction
        interactor_service.remove_interactor(
            mock_battery_interactor.device_id)  # Delete
        interactor_service.add_generator_interactor(
            mock_generator_interactor)  # Add

        # Check staged state
        assert interactor_service.get_battery_interactor(1) is None
        assert interactor_service.get_generator_interactor(
            2) == mock_generator_interactor

        # Rollback
        interactor_service.rollback()

        # Check that we are back to the committed state
        assert interactor_service.get_battery_interactor(
            1) == mock_battery_interactor
        assert interactor_service.get_generator_interactor(2) is None
