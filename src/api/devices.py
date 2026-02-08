from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies import get_device_manager
from device_manager import IDeviceManager
from device import (
    Device,
    ConstantActionDevice,
    VariableActionDevice,
    GeneratorPV,
    Battery,
)

router = APIRouter(prefix="/api", tags=["devices"])


# schemas

class DeviceIn(BaseModel):
    # Common
    id: int | None = None
    name: str
    type: str  # frontend uses e.g. "Verbraucher", "PVAnlage"

    # Verbraucher fields (optional, for UI display)
    power: float | int | None = None  # W
    duration: float | int | None = None  # minutes

    # PV fields (accepted but not persisted in DB yet)
    ratedPower: float | int | None = None
    angleOfInclination: float | int | None = None
    alignment: str | None = None
    location: str | None = None
    lat: float | None = None
    lng: float | None = None

    class Config:
        extra = "allow"

# helpers

def _device_to_frontend_dict(d: Device) -> dict[str, Any]:
    """Serialize DB models into the frontend shape (devices page)."""
    base: dict[str, Any] = {
        "id": d.id,
        "name": d.name,
        "actions": [],  # keep for frontend compatibility
    }

    if isinstance(d, ConstantActionDevice):
        base["type"] = "Verbraucher"
        # No actions endpoint yet -> we can't reliably infer power/duration
        base["power"] = None
        base["duration"] = None
        return base

    if isinstance(d, GeneratorPV):
        base["type"] = "PVAnlage"
        # Not persisted yet; return nulls so UI has the keys
        base.update(
            {
                "ratedPower": None,
                "angleOfInclination": None,
                "alignment": None,
                "location": None,
                "lat": None,
                "lng": None,
            }
        )
        return base

    if isinstance(d, Battery):
        base["type"] = "BATTERY"
        # Keep minimal; expand later if your devices page needs these
        return base

    if isinstance(d, VariableActionDevice):
        base["type"] = "VariableActionDevice"
        return base

    # Fallback
    base["type"] = getattr(d.type, "value", str(getattr(d, "type", "UNKNOWN")))
    return base


def _payload_to_device_model(payload: DeviceIn) -> ConstantActionDevice | VariableActionDevice | GeneratorPV | Battery:
    """Map frontend 'type' to internal model instance."""
    t = (payload.type or "").strip()

    if t in {"Verbraucher", "Consumer", "CONSUMER"}:
        return ConstantActionDevice(name=payload.name)

    if t in {"PVAnlage", "PV", "GeneratorPV", "GENERATOR_PV"}:
        return GeneratorPV(name=payload.name)

    if t in {"BATTERY", "Battery"}:
        # If Battery requires constructor args in your project, adapt here.
        # Keeping it simple: create only if your Battery has defaults.
        return Battery(name=payload.name)  # type: ignore[call-arg]

    # Default fallback
    return ConstantActionDevice(name=payload.name)


# routes

@router.get("/devices")
def get_devices(manager: IDeviceManager = Depends(get_device_manager)) -> list[dict[str, Any]]:
    devices = manager.get_device_service().get_all_devices()
    return [_device_to_frontend_dict(d) for d in devices]


@router.post("/devices", status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceIn, manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    model = _payload_to_device_model(payload)

    # Add to manager based on type
    if isinstance(model, ConstantActionDevice):
        manager.add_constant_action_device(model)
    elif isinstance(model, VariableActionDevice):
        manager.add_variable_action_device(model)
    elif isinstance(model, GeneratorPV):
        manager.add_generator(model)
    elif isinstance(model, Battery):
        manager.add_battery(model)
    else:
        manager.add_constant_action_device(model)  # fallback

    return _device_to_frontend_dict(model)


@router.delete("/devices/{device_id}")
def delete_device(device_id: int, manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    svc = manager.get_device_service()
    existing = svc.get_device(device_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    manager.remove_device(device_id)
    return {"success": True}


@router.delete("/devices")
def reset_all_devices(manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    ids = manager.get_device_service().get_all_device_ids()
    for did in ids:
        manager.remove_device(did)
    return {"success": True, "message": "Alle Geräte wurden gelöscht"}
