from __future__ import annotations
from typing import Any, cast
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from electricity_price_optimizer_py.units import WattHour, Watt
from api.dependencies import get_device_manager
from device_manager import IDeviceManager
from device import (
    Device,
    ConstantActionDevice,
    VariableActionDevice,
    GeneratorPV,
    Battery,
)


from electricity_price_optimizer_py.units import WattHour, Watt

router = APIRouter(prefix="/api", tags=["devices"])


# schemas

class DeviceIn(BaseModel):
    # Common
    id: int | None = None
    name: str
    type: str  # frontend uses e.g. "Verbraucher", "PVAnlage"

    # Batterie spezifische Felder
    capacity: float | None = None  # Wh
    currentCharge: float | None = None  # Wh (Optional: falls man den Startwert setzen will)
    maxChargeRate: float | None = None  # W
    maxDischarge: float | None = None  # W
    efficiency: float | None = Field(default=0.95, ge=0, le=1)  # Standard 95%

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
    }

    if isinstance(d, ConstantActionDevice):
        base["type"] = "Consumer"
        base["flexibility"] = "constant"
        # NEU: Mapping der konkreten Aktionen
        base["actions"] = [
            {
                "id": action.id,
                "start_from": action.start_from.isoformat(),
                "end_before": action.end_before.isoformat(),
                "duration_seconds": action.duration.total_seconds(),
                "consumption": Watt.get_value(action.consumption)
            } for action in d.actions
        ]
        return base

    if isinstance(d, VariableActionDevice):
        base["type"] = "Consumer"
        base["flexibility"] = "variable"
        base["actions"] = [
            {
                "id": action.id,
                "start": action.start.isoformat(),
                "end": action.end.isoformat(),
                "total_consumption": WattHour.get_value(action.total_consumption),
                "max_consumption": Watt.get_value(action.max_consumption)
            } for action in d.actions
        ]
        return base

    if isinstance(d, GeneratorPV):
        base["type"] = "PVGenerator"
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
        base["type"] = "Battery"
        base.update({
            "capacity": WattHour.get_value(d.capacity),
            "maxChargeRate": Watt.get_value(d.max_charge_rate),
            "maxDischarge": Watt.get_value(d.max_discharge_rate),
            "efficiency": d.efficiency,
            "currentCharge": WattHour.get_value(d.current_charge),
        })
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

    if t == "Battery":
        b = Battery(name=payload.name)
        if payload.capacity is not None:
            b.capacity = WattHour(payload.capacity)
        if payload.currentCharge is not None:
            b.current_charge = WattHour(payload.currentCharge)
        if payload.maxChargeRate is not None:
            b.max_charge_rate = Watt(payload.maxChargeRate)
        if payload.maxDischarge is not None:
            b.max_discharge_rate = Watt(payload.maxDischarge)
        if payload.efficiency is not None:
            b.efficiency = payload.efficiency
        return b


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
