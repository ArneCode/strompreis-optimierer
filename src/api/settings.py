from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from api.dependencies import get_uow
from uow import IUnitOfWork


router = APIRouter(
    prefix="/api/settings/simulated-annealing", tags=["settings"])


class SimulatedAnnealingSettingsRead(BaseModel):
    initial_temperature: float
    cooling_rate: float
    final_temperature: float
    constant_action_move_factor: float
    num_moves_per_step: int

    class Config:
        from_attributes = True


class SimulatedAnnealingSettingsUpdate(BaseModel):
    initial_temperature: float | None = None
    cooling_rate: float | None = None
    final_temperature: float | None = None
    constant_action_move_factor: float | None = None
    num_moves_per_step: int | None = None


@router.get("/", response_model=SimulatedAnnealingSettingsRead)
def get_settings(uow: IUnitOfWork = Depends(get_uow)):
    """Retrieve the current optimization settings."""
    settings = uow.settings_service.get_simulated_annealing_settings()
    return SimulatedAnnealingSettingsRead.model_validate(settings)


@router.put("/", status_code=status.HTTP_200_OK)
def update_settings(
    settings_payload: SimulatedAnnealingSettingsUpdate,
    uow: IUnitOfWork = Depends(get_uow)
):
    """Update the optimization settings."""
    uow.settings_service.update_simulated_annealing_settings(settings_payload)
    return {"message": "Settings updated successfully."}
