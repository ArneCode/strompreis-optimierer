from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from api.dependencies import get_device_manager, get_orchestrator_service
from device_manager import IDeviceManager
from services.interfaces import IOrchestratorService
from device import ConstantActionDevice
from device import VariableActionDevice


router = APIRouter(prefix="/api", tags=["plan"])

@router.get("/plan")
def get_plan(
    manager: IDeviceManager = Depends(get_device_manager),
    orchestrator: IOrchestratorService = Depends(get_orchestrator_service),
) -> dict[str, Any]:
    tasks: list[dict[str, Any]] = []

    i = 1
    for device in manager.get_device_service().get_all_devices():
        if isinstance(device, ConstantActionDevice):
            for action in device.actions:
                tasks.append(
                    {
                        "id": str(i),
                        "name": device.name,
                        "text": device.name,
                        "start": action.start_from.isoformat(),
                        "end": (action.start_from + action.duration).isoformat(),
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

    return {
        "tasks": tasks,
    }
