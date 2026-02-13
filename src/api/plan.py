from __future__ import annotations

from typing import Any

from external_api_services.api_services import api_services
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from electricity_price_optimizer_py.units import WattHour, Watt
from api.dependencies import get_device_manager, get_orchestrator_service
from device_manager import IDeviceManager
from services.interfaces import IOrchestratorService
from device import ConstantActionDevice
from device import VariableActionDevice
from device import Battery
from electricity_price_optimizer_py import Schedule

BERLIN = ZoneInfo("Europe/Berlin")

router = APIRouter(prefix="/api", tags=["plan"])

def _collect_total_generation_kw(
    manager: IDeviceManager,
    timeline: list[datetime],
) -> list[float]:
    """
    Calculates the total sum of all generators based on the timeslots of 'timeline'.

    Args:
        manager: Device manager providing access to all configured devices.
        timeline: the list of timeslots to calculate the total generation for.

    Returns:
        A list of the total generation in kw. Each element of the list corresponds with
        the element in 'timeline' of the same index.

    """
    step = (timeline[1] - timeline[0]) if len(timeline) > 1 else timedelta(hours=1)
    end = timeline[-1] + step

    total_kw: list[float] = [0.0 for _ in timeline]

    controllers = manager.get_controller_service().get_all_controllers()

    gen_controllers = [
        c for c in controllers
        if hasattr(c, "get_prognoses") and callable(getattr(c, "get_prognoses"))
    ]

    end = timeline[-1] + timedelta(hours=1)

    for ctrl in gen_controllers:
        try:
            prognoses = ctrl.get_prognoses(manager, timeline, end)
        except Exception:
            continue

        if not prognoses:
            continue

        for i in range(min(len(prognoses), len(timeline))):
            try:
                wh = WattHour.get_value(prognoses[i])
            except Exception:
                continue

            total_kw[i] += float(wh) / 1000.0

    return total_kw


def _collect_hourly_prices_ct_per_kwh(timeline: list[datetime]) -> list[float | None]:
    """
    Collect hourly electricity prices aligned with the given timeline.

    Args:
        timeline: List of timestamps (typically hourly) used to align price values.
    
    Returns:
        A list of prices in ct/kWh aligned to 'timeline'. If a price for a given hour is missing in the
        cache, the list contains None at that position.
    """

    blocks = api_services.price_cache.get_blocks()
    prices: list[float | None] = []

    for t in timeline:
        hour = t.astimezone(BERLIN).replace(minute=0, second=0, microsecond=0)
        block = blocks.get(hour)

        if block is None:
            prices.append(None)
        else:
            prices.append(float(block.price) / 10.0)

    return prices   

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

def _create_timeline(hours: int):
    timeline = []

    start_time = datetime.now(timezone.utc)
    timeline = [start_time + timedelta(hours=i) for i in range(hours)]

    return timeline

def _collect_power_values(action, assigned_action, step_minutes):
    power_values = []

    start = action.start
    end = action.end

    step = timedelta(minutes=step_minutes)
    t = start

    while t < end:
        power = assigned_action.get_consumption(t)
        power_values.append(Watt.get_value(power))
        t += step

    return power_values

def _collect_soc_values(battery, timeline):
    soc_values = []

    for time in timeline:
        soc_values.append(WattHour.get_value(battery.get_charge_level(time)))

    return soc_values

def _collect_plan_data(manager, schedule) -> dict[str, Any]:
    """
    Transform the optimizer schedule and device configuration into frontend plan data.

    It generates:
        Gantt tasks for devices that have schedule assignments
        time series data for batteries (SOC) and variable actions (power values)
        hourly price series (ct/kWh)
        hourly total generation (kW)

    Args:
        manager: Device manager providing access to all configured devices.
        schedule: The current optimizer schedule.

    Returns:
        A dict containing: tasks, timeline, batteries, variableActions, priceCtPerKwh, generationKw
    """

    tasks = []
    batteries = []
    variable_actions = []
    timeline = _create_timeline(24)

    generation_kw = _collect_total_generation_kw(manager, timeline)
    prices_ct_per_kwh = _collect_hourly_prices_ct_per_kwh(timeline)

    plan_start = timeline[0]
    plan_end = timeline[-1] + timedelta(hours = 1)

    i = 1
    for device in manager.get_device_service().get_all_devices():
        if isinstance(device, ConstantActionDevice):
            for action in device.actions:
                assigned = schedule.get_constant_action(device.id)
                if assigned is None:
                    continue
                
                start = assigned.get_start_time().isoformat()
                end = assigned.get_end_time().isoformat()

                tasks.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "text": device.name,
                        "start": start,
                        "end": end,
                    }
                )
                i += 1    

        if isinstance(device, VariableActionDevice):
            for action in device.actions:
                assigned_action = schedule.get_variable_action(device.id)
                if assigned_action is None:
                    continue 

                tasks.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "text": device.name,
                        "start": action.start.isoformat(),
                        "end": action.end.isoformat(),
                    }
                ) 

                variable_actions.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "powerW": _collect_power_values(action, assigned_action, 30),
                        "start": action.start.isoformat(),
                        "stepMinutes": 30,
                    }
                )          
                i += 1

        if isinstance(device, Battery):
            assigned_battery = schedule.get_battery(device.id)
            if assigned_battery is None:
                continue

            tasks.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "text": device.name,
                    "start": plan_start.isoformat(),
                    "end": plan_end.isoformat(),
                }
            )


            batteries.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "socWh": _collect_soc_values(assigned_battery, timeline),
                }
            )
            i += 1

           

    
    return {
        "tasks": tasks,
        "timeline": [time.isoformat() for time in timeline],
        "batteries": batteries,
        "variableActions": variable_actions,
        "pricesCtPerKwh": prices_ct_per_kwh,
        "generationKw": generation_kw,
    }

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
    data = _collect_plan_data(manager, schedule)

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

    Raises:
        HTTPException:
            409 if optimization is currently running and schedule is not yet available
            404 if no schedule is available
    """
    schedule = _require_schedule(orchestrator)
    data = _collect_plan_data(manager, schedule)

    return {
        "timeline": data["timeline"],
        "batteries": data["batteries"],
        "variableActions": data["variableActions"],
        "pricesCtPerKwh": data["pricesCtPerKwh"],
        "generationKw": data["generationKw"]
    }

@router.post("/plan/generate", status_code=status.HTTP_202_ACCEPTED)
def generate_plan(
    device_manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
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
        orchestrator.run_optimization(device_manager)
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