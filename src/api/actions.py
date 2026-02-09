from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from datetime import timedelta
from api.dependencies import get_device_manager
from device_manager import IDeviceManager
from device import (
    Device,
    ConstantActionDevice,
    VariableActionDevice,
    ConstantAction,
    VariableAction
)
from pydantic import BaseModel, Field
from datetime import datetime

from electricity_price_optimizer_py.units import Watt, WattHour

router = APIRouter(prefix="/api", tags=["actions"])



class ActionIn(BaseModel):
    start: datetime
    end: datetime

    duration_minutes: float | None = None
    total_consumption: float | None = None

    consumption: float | int


@router.post("/devices/{device_id}/actions", status_code=status.HTTP_201_CREATED)
def create_action(
        device_id: int,
        payload: ActionIn,
        manager: IDeviceManager = Depends(get_device_manager)
) -> dict[str, Any]:
    svc = manager.get_device_service()
    device = svc.get_device(device_id)

    if device is None:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")

    if isinstance(device, ConstantActionDevice):
        if payload.duration_minutes is None:
            raise HTTPException(status_code=400, detail="Konstante Geräte benötigen 'duration_minutes'")

        new_action = ConstantAction(
            device_id=device.id,
            start_from=payload.start,
            end_before=payload.end,
            duration=timedelta(minutes=payload.duration_minutes),
            consumption=Watt(payload.consumption)
        )
        device.actions.append(new_action)

    elif isinstance(device, VariableActionDevice):
        if payload.total_consumption is None:
            raise HTTPException(status_code=400, detail="Flexible Geräte benötigen 'total_consumption' (Wh)")

        new_action = VariableAction(
            device_id=device.id,
            start=payload.start,
            end=payload.end,
            total_consumption=WattHour(payload.total_consumption),
            max_consumption=Watt(payload.consumption)
        )
        device.actions.append(new_action)

    else:
        raise HTTPException(status_code=400, detail="Gerätetyp unterstützt keine Aktionen")

    return {"success": True, "type": device.type.value}

@router.delete("/devices/{device_id}/actions/{action_id}")
def delete_action(
        device_id: int,
        action_id: int,
        manager: IDeviceManager = Depends(get_device_manager)
) -> dict[str, Any]:
    svc = manager.get_device_service()
    device = svc.get_device(device_id)

    if device is None:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")

    if not isinstance(device, (ConstantActionDevice, VariableActionDevice)):
        raise HTTPException(
            status_code=400,
            detail="Dieses Gerät unterstützt keine Aktionen"
        )

    action_to_remove = next((a for a in device.actions if a.id == action_id), None)

    if action_to_remove is None:
        raise HTTPException(status_code=404, detail="Aktion nicht gefunden")

    device.actions.remove(action_to_remove)

    return {"success": True, "message": f"Aktion {action_id} wurde gelöscht"}


