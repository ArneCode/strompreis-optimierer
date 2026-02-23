from typing import TYPE_CHECKING
from sqlalchemy.orm import Session
from electricity_price_optimizer_py import SimulatedAnnealingSettings as SimulatedAnnealingSettingsOptimizer
from settings import SimulatedAnnealingSettings
from services.interfaces import ISettingsService

if TYPE_CHECKING:
    from api.settings import SimulatedAnnealingSettingsUpdate


class SqlAlchemySettingsService(ISettingsService):
    def __init__(self, session: Session):
        self._session = session

    def get_simulated_annealing_settings(self) -> SimulatedAnnealingSettings:
        """Retrieve the current optimization settings."""
        settings = self._session.get(SimulatedAnnealingSettings, 1)
        if settings is None:
            settings = SimulatedAnnealingSettings()
            self._session.add(settings)
            self._session.flush()
        return settings

    def update_simulated_annealing_settings(self, settings_payload: "SimulatedAnnealingSettingsUpdate") -> None:
        """Update the optimization settings."""
        settings = self.get_simulated_annealing_settings()
        update_data = settings_payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        self._session.add(settings)

    def reset_simulated_annealing_settings(self) -> SimulatedAnnealingSettings:
        """Reset the optimization settings to their default values."""
        settings = self._session.get(SimulatedAnnealingSettings, 1)
        if settings:
            self._session.delete(settings)
            self._session.flush()  # Ensure the deletion is processed before the get
        return self.get_simulated_annealing_settings()

    def get_optimizer_settings(self) -> "SimulatedAnnealingSettingsOptimizer":
        """Get settings in the format required by the optimizer."""
        settings = self.get_simulated_annealing_settings()
        return SimulatedAnnealingSettingsOptimizer(
            initial_temperature=settings.initial_temperature,
            cooling_rate=settings.cooling_rate,
            final_temperature=settings.final_temperature,
            constant_action_move_factor=settings.constant_action_move_factor,
            num_moves_per_step=settings.num_moves_per_step,
        )
