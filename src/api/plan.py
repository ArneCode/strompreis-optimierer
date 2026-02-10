from __future__ import annotations

from typing import Any

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from electricity_price_optimizer_py.units import WattHour, Watt
from api.dependencies import get_device_manager, get_orchestrator_service
from device_manager import IDeviceManager
from services.interfaces import IOrchestratorService
from device import ConstantActionDevice
from device import VariableActionDevice
from device import Battery


router = APIRouter(prefix="/api", tags=["plan"])

def _create_timeline(hours: int):
    timeline = []

    start_time = datetime.now(timezone.utc)
    timeline = [start_time + timedelta(hours=i) for i in range(hours)]

    return timeline

def _collect_power_values(action, assigned_action, step_minutes):
    power_values = []

    """
    for time in timeline:
        power_values.append(Watt.get_value(assigned_action.get_consumption(time)))
    """
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
    tasks = []
    batteries = []
    variable_actions = []
    timeline = _create_timeline(24)

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
                tasks.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "text": device.name,
                        "start": action.start.isoformat(),
                        "end": action.end.isoformat(),
                    }
                ) 

                assigned_action = schedule.get_variable_action(device.id)
                if assigned_action is None:
                    continue

                variable_actions.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "powerW": _collect_power_values(action, assigned_action, 30) 
                    }
                )          
                i += 1

        if isinstance(device, Battery):
            tasks.append(
                {
                    "id": str(i),
                    "name": device.name,
                    "text": device.name,
                    "start": "",
                    "end": ""
                }
            )

            assigned_battery = schedule.get_battery(device.id)
            if assigned_battery is None:
                continue

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
    }

@router.get("/plan")
def get_plan(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
) -> dict[str, Any]:
    
    schedule = orchestrator.get_schedule()
    
    if schedule is None:
        raise HTTPException(status_code=404, detail="schedule not available")

    tasks: list[dict[str, Any]] = []

    data = _collect_plan_data(manager, schedule)

    return {
        "tasks": data["tasks"]
    }

@router.get("/plan/data")
def get_plan_data(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
):
    schedule = orchestrator.get_schedule()

    if schedule is None:
        raise HTTPException(status_code=404, detail="schedule not available")
    
    data = _collect_plan_data(manager, schedule)

    return {
        "timeline": data["timeline"],
        "batteries": data["batteries"],
        "variableActions": data["variableActions"],
    }


