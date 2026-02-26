import pytest
from unittest.mock import MagicMock, create_autospec
from sqlalchemy.orm import Session

from services.settings_service import SqlAlchemySettingsService
from settings import SimulatedAnnealingSettings
from api.settings import SimulatedAnnealingSettingsUpdate
from electricity_price_optimizer_py import SimulatedAnnealingSettings as SimulatedAnnealingSettingsOptimizer


@pytest.fixture
def mock_session():
    """Fixture for a mocked SQLAlchemy session."""
    return create_autospec(Session, instance=True)


@pytest.fixture
def settings_service(mock_session):
    """Fixture for the SqlAlchemySettingsService."""
    return SqlAlchemySettingsService(mock_session)


class TestSettingsService:
    def test_get_settings_returns_existing(self, settings_service: SqlAlchemySettingsService, mock_session: MagicMock):
        """
        Test that get_simulated_annealing_settings returns existing settings.
        """
        # Arrange
        existing_settings = SimulatedAnnealingSettings(
            initial_temperature=500.0,
            cooling_rate=0.9,
            final_temperature=1.0,
            constant_action_move_factor=0.5,
            num_moves_per_step=10
        )
        mock_session.get.return_value = existing_settings

        # Act
        settings = settings_service.get_simulated_annealing_settings()

        # Assert
        assert settings == existing_settings

    def test_update_settings(self, settings_service: SqlAlchemySettingsService, mock_session: MagicMock):
        """
        Test updating settings with a full and partial payload.
        """
        # Arrange
        existing_settings = SimulatedAnnealingSettings(
            initial_temperature=1000.0,
            cooling_rate=0.99,
            final_temperature=1.0,
            constant_action_move_factor=0.5,
            num_moves_per_step=10
        )
        mock_session.get.return_value = existing_settings

        # Act: Full update
        full_update = SimulatedAnnealingSettingsUpdate(
            initial_temperature=1234.5, num_moves_per_step=99)
        settings_service.update_simulated_annealing_settings(full_update)

        # Assert
        assert existing_settings.initial_temperature == 1234.5
        assert existing_settings.num_moves_per_step == 99
        assert existing_settings.cooling_rate == 0.99  # Unchanged

        # Act: Partial update
        partial_update = SimulatedAnnealingSettingsUpdate(cooling_rate=0.95)
        settings_service.update_simulated_annealing_settings(partial_update)

        # Assert
        assert existing_settings.initial_temperature == 1234.5  # Unchanged
        assert existing_settings.cooling_rate == 0.95  # Changed

    def test_reset_settings(self, settings_service: SqlAlchemySettingsService, mock_session: MagicMock):
        """
        Test that resetting settings restores them to their default values.
        """
        # Arrange
        existing_settings = SimulatedAnnealingSettings(
            initial_temperature=999.0)
        # First get() returns existing, subsequent get() returns None (simulating deletion)
        mock_session.get.side_effect = [existing_settings, None]
        default_settings = SimulatedAnnealingSettings()

        # Act
        new_settings = settings_service.reset_simulated_annealing_settings()

        # Assert
        assert new_settings.initial_temperature == default_settings.initial_temperature
        assert new_settings.cooling_rate == default_settings.cooling_rate

    def test_get_optimizer_settings(self, settings_service: SqlAlchemySettingsService, mock_session: MagicMock):
        """
        Test conversion to the optimizer's settings format.
        """
        # Arrange
        db_settings = SimulatedAnnealingSettings(
            initial_temperature=100.0,
            cooling_rate=0.9,
            final_temperature=1.0,
            constant_action_move_factor=0.5,
            num_moves_per_step=10
        )
        mock_session.get.return_value = db_settings

        # Act
        optimizer_settings = settings_service.get_optimizer_settings()

        # Assert
        assert isinstance(optimizer_settings,
                          SimulatedAnnealingSettingsOptimizer)
        assert optimizer_settings.initial_temperature == db_settings.initial_temperature
