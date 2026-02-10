from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_device_manager, get_orchestrator_service
from device_manager import IDeviceManager
from services.interfaces import IOrchestratorService
from device import ConstantActionDevice
from device import VariableActionDevice
from device import Battery


router = APIRouter(prefix="/api", tags=["plan"])

@router.get("/plan")
def get_plan(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
) -> dict[str, Any]:
    
    schedule = orchestrator.get_schedule()
    
    if schedule is None:
        raise HTTPException(status_code=404, detail="schedule not available")

    tasks: list[dict[str, Any]] = []

    i = 1
    for device in manager.get_device_service().get_all_devices():
        if isinstance(device, ConstantActionDevice):
            for action in device.actions:
                assigned = schedule.get_constant_action(device.id)
                if assigned is None:
                    continue
                
                start = assigned.get_start_time()
                end = assigned.get_end_time()

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
            i += 1
            

    return {
        "tasks": tasks,
    }

