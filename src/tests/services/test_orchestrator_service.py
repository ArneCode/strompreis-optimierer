from electricity_price_optimizer_py.units import Euro
import pytest
from unittest.mock import MagicMock, create_autospec, patch, ANY
from concurrent.futures import Future
from electricity_price_optimizer_py import Schedule

from services.orchestrator_service import OrchestratorService
from device_manager import IDeviceManager
from services.interfaces import ISettingsService, IOptimizerService
from controllers import DeviceController


@pytest.fixture
def mock_device_manager():
    """Fixture for a mocked IDeviceManager."""
    dm = create_autospec(IDeviceManager, instance=True)
    controller_service = MagicMock()
    dm.get_controller_service.return_value = controller_service
    controller_service.get_all_controllers.return_value = [
        create_autospec(DeviceController, instance=True)
    ]
    return dm


@pytest.fixture
def mock_settings_service():
    """Fixture for a mocked ISettingsService."""
    return create_autospec(ISettingsService, instance=True)


@pytest.fixture
def mock_optimizer_service():
    """Fixture for a mocked IOptimizerService."""
    return create_autospec(IOptimizerService, instance=True)


@pytest.fixture
def orchestrator_service():
    """Fixture for an OrchestratorService instance."""
    service = OrchestratorService()
    # Replace the real executor with a mock for testing
    service.executor = MagicMock()
    return service


class TestOrchestratorService:
    def test_initial_state(self, orchestrator_service: OrchestratorService):
        """Test initial state: no schedule, not running."""
        assert not orchestrator_service.has_schedule
        assert not orchestrator_service.currently_running
        with pytest.raises(ValueError, match="Schedule has not been generated yet."):
            orchestrator_service.get_schedule()

    def test_run_optimization_workflow(self, orchestrator_service: OrchestratorService, mock_device_manager, mock_settings_service, mock_optimizer_service):
        """Test that run_optimization submits a task and sets the running state."""
        # Act
        orchestrator_service.run_optimization(
            mock_device_manager, mock_settings_service, mock_optimizer_service)

        # Assert
        assert orchestrator_service.currently_running
        # Check that the optimizer was called via the executor
        orchestrator_service.executor.submit.assert_called_once_with(
            mock_optimizer_service.run_optimization, ANY, ANY)
        # Check that a done callback was added
        future_mock = orchestrator_service.executor.submit.return_value
        future_mock.add_done_callback.assert_called_once_with(
            orchestrator_service._process_result)

    def test_state_guard_prevents_concurrent_runs(self, orchestrator_service: OrchestratorService, mock_device_manager, mock_settings_service, mock_optimizer_service):
        """Test that a second call to run_optimization raises a RuntimeError."""
        # Arrange: First run starts
        orchestrator_service.run_optimization(
            mock_device_manager, mock_settings_service, mock_optimizer_service)

        # Act & Assert: Second run should fail
        with pytest.raises(RuntimeError, match="Optimization is already running."):
            orchestrator_service.run_optimization(
                mock_device_manager, mock_settings_service, mock_optimizer_service)

    @patch('api.scopes.device_manager_scope')
    def test_process_result_callback_success(self, mock_scope, orchestrator_service: OrchestratorService, mock_device_manager):
        """Test the _process_result callback on a successful future."""
        # Arrange
        mock_scope.return_value.__enter__.return_value = mock_device_manager
        orchestrator_service._currently_running = True
        mock_schedule = create_autospec(Schedule, instance=True)
        mock_cost = Euro(100)

        # Create a future that is already "done"
        future = Future()
        future.set_result((mock_cost, mock_schedule))

        # Act
        orchestrator_service._process_result(future)

        # Assert
        assert orchestrator_service.has_schedule
        assert orchestrator_service.get_schedule() == mock_schedule
        assert not orchestrator_service.currently_running

        # Check that controllers were updated
        for controller in mock_device_manager.get_controller_service().get_all_controllers():
            controller.use_schedule.assert_called_once_with(
                mock_schedule, mock_device_manager)

    @patch('api.scopes.device_manager_scope')
    def test_process_result_callback_failure(self, mock_scope, orchestrator_service: OrchestratorService):
        """Test the _process_result callback when the future contains an exception."""
        # Arrange
        orchestrator_service._currently_running = True
        future = Future()
        future.set_exception(ValueError("Optimizer failed"))

        # Act & Assert
        with pytest.raises(ValueError, match="Optimizer failed"):
            orchestrator_service._process_result(future)

        # Assert that cleanup was performed
        assert not orchestrator_service.currently_running
        assert not orchestrator_service.has_schedule
        mock_scope.assert_not_called()
