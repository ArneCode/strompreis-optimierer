from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import (
    get_device_manager,
    get_optimizer_service,
    get_orchestrator_service,
    get_settings_service,
)
from api.plan_collectors import collect_plan_data
from device_manager import IDeviceManager
from electricity_price_optimizer_py import Schedule
from services.interfaces import IOptimizerService, IOrchestratorService, ISettingsService

router = APIRouter(prefix="/api", tags=["plan"])


def _require_schedule(orchestrator: IOrchestratorService) -> Schedule:
    """
    Ensure that a schedule is available, otherwise raise an HTTPException.

    Args:
        orchestrator: Orchestrator service providing schedule state and access.

    Returns:
        The current Schedule object.

    Raises:
        HTTPException:
            409 if optimization is currently running but schedule is not yet available
            404 if no schedule is available
    """
    if not orchestrator.has_schedule:
        if orchestrator.currently_running:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="schedule not available yet (optimization running)",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="schedule not available",
        )
    try:
        return orchestrator.get_schedule()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="schedule not available",
        )


@router.get("/plan")
def get_plan(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
) -> dict[str, Any]:
    """
    Get the optimal plan as Gantt tasks.

    Returns:
        Dict containing:
            tasks: list of frontend compatible Gantt tasks

    Raises:
        HTTPException:
            409 if optimization is currently running and schedule is not yet available
            404 if no schedule is available
    """
    schedule = _require_schedule(orchestrator)
    data = collect_plan_data(manager, schedule)

    return {
        "tasks": data["tasks"]
    }


@router.get("/plan/data")
def get_plan_data(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
):
    """
    Get additional plan data required for charts and detail views.

    Includes:
        timeline (ISO timestamps)
        battery SOC series (Wh)
        variable action power series (W)
        hourly electricity price (ct/kWh)
        hourly total generation (kW)
        hourly total fixed consumption (W)
        scheduled consumer power series (W)

    Raises:
        HTTPException:
            409 if optimization is currently running and schedule is not yet available
            404 if no schedule is available
    """
    schedule = _require_schedule(orchestrator)
    data = collect_plan_data(manager, schedule)

    return {
        "timeline": data["timeline"],
        "batteries": data["batteries"],
        "variableActions": data["variableActions"],
        "pricesCtPerKwh": data["pricesCtPerKwh"],
        "generationKw": data["generationKw"],
        "generationByGeneratorKw": data["generationByGeneratorKw"],
        "constantActions": data["constantActions"],
        "scheduledConsumers": data["scheduledConsumers"],
        "fixedConsumptionW": data["consumptionW"],
    }


@router.post("/plan/generate", status_code=status.HTTP_202_ACCEPTED)
def generate_plan(
    device_manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
    settings_service: ISettingsService = Depends(get_settings_service),
    optimizer_service: IOptimizerService = Depends(get_optimizer_service)
):
    """
    Start plan generation by running the optimization algorithm.

    Returns:
        {"status": "started"} if the optimization was successfully started.

    Raises:
        HTTPException:
            409 if optimization is already running
    """
    if orchestrator.currently_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="optimization already running",
        )

    try:
        orchestrator.run_optimization(
            device_manager, settings_service, optimizer_service)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="optimization already running"
        )

    return {"status": "started"}


@router.get("/plan/status")
def get_plan_status(orchestrator: IOrchestratorService = Depends(get_orchestrator_service)):
    """
    Get the current plan/optimization status.

    Returns:
        A dict containing:
            currentlyRunning: True if an optimization is currently running
            hasSchedule: True if a schedule has been generated and is available
    """
    return {
        "currentlyRunning": orchestrator.currently_running,
        "hasSchedule": orchestrator.has_schedule,
    }
