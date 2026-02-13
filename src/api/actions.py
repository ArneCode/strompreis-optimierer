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



class ActionBase(BaseModel):
    start: datetime
    end: datetime
    consumption: float

class ConstantActionIn(ActionBase):
    """
    Schema for actions with a fixed power consumption and a specific duration.
    """
    duration_minutes: float

class VariableActionIn(ActionBase):#
    """
    Schema for actions where power can vary over time.
    Defined by a total energy amount (Wh) and a maximum power limit (W).
    """
    total_consumption: float


@router.post("/devices/{device_id}/actions", status_code=status.HTTP_201_CREATED)
def create_action(
        device_id: int,
        payload: dict[str, Any],
        manager: IDeviceManager = Depends(get_device_manager)
) -> dict[str, Any]:
    svc = manager.get_device_service()
    device = svc.get_device(device_id)
    """
    Add a new scheduled action to a specific device.

    Depending on the device type, this creates either a ConstantAction 
    (fixed power/duration) or a VariableAction (flexible power distribution).

    Args:
        device_id: The ID of the device to assign the action to.
        payload: Dictionary containing the action parameters (validated per device type).

    Returns:
        A success status and the type of device the action was added to.

    Raises:
        HTTPException:
            404 if the device is not found.
            400 if validation fails or the device type does not support actions.
    """

    if device is None:
        raise HTTPException(status_code=404, detail="Gerät nicht gefunden")

    if isinstance(device, ConstantActionDevice):
        try:
            data = ConstantActionIn(**payload)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        new_action = ConstantAction(
            device_id=device.id,
            start_from=data.start,
            end_before=data.end,
            duration=timedelta(minutes=data.duration_minutes),
            consumption=Watt(data.consumption)
        )
        device.actions.append(new_action)

    elif isinstance(device, VariableActionDevice):
        try:
            data = VariableActionIn(**payload)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        new_action = VariableAction(
            device_id=device.id,
            start=data.start,
            end=data.end,
            total_consumption=WattHour(data.total_consumption),
            max_consumption=Watt(data.consumption)
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
    """
    Remove a specific action from a device's schedule.

    Args:
        device_id: The ID of the device owning the action.
        action_id: The unique ID of the action to be removed.

    Returns:
        A confirmation message upon successful deletion.

    Raises:
        HTTPException:
            404 if the device or the action is not found.
            400 if the device type is incompatible with actions.
    """

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


