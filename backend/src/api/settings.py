from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from api.dependencies import get_settings_service, get_uow
from uow import IUnitOfWork
from services.interfaces import ISettingsService


router = APIRouter(
    prefix="/api/settings/simulated-annealing", tags=["settings"])


class SimulatedAnnealingSettingsRead(BaseModel):
    initial_temperature: float
    cooling_rate: float
    final_temperature: float
    constant_action_move_factor: float
    num_moves_per_step: int

    model_config = ConfigDict(from_attributes=True)


class SimulatedAnnealingSettingsUpdate(BaseModel):
    initial_temperature: float | None = None
    cooling_rate: float | None = None
    final_temperature: float | None = None
    constant_action_move_factor: float | None = None
    num_moves_per_step: int | None = None


@router.get("/", response_model=SimulatedAnnealingSettingsRead)
def get_settings(settings_service: ISettingsService = Depends(get_settings_service)):
    """Retrieve the current optimization settings."""
    settings = settings_service.get_simulated_annealing_settings()
    return SimulatedAnnealingSettingsRead.model_validate(settings)


@router.put("/", status_code=status.HTTP_200_OK)
def update_settings(
    settings_payload: SimulatedAnnealingSettingsUpdate,
    settings_service: ISettingsService = Depends(get_settings_service)
):
    """Update the optimization settings."""
    settings_service.update_simulated_annealing_settings(settings_payload)
    return {"message": "Settings updated successfully."}


@router.post("/reset", status_code=status.HTTP_200_OK, response_model=SimulatedAnnealingSettingsRead)
def reset_settings(settings_service: ISettingsService = Depends(get_settings_service)):
    """Reset the optimization settings to their default values."""
    settings = settings_service.reset_simulated_annealing_settings()
    return SimulatedAnnealingSettingsRead.model_validate(settings)
