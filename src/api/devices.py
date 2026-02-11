from __future__ import annotations
from typing import Any, Union, Literal
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

router = APIRouter(prefix="/api", tags=["devices"])



class DeviceBaseIn(BaseModel):
    name: str


class ConsumerIn(DeviceBaseIn):
    type: Literal["Consumer"]
    flexibility: Literal["constant", "variable"] = "constant"
    power: float | None = None
    duration: float | None = None


class BatteryIn(DeviceBaseIn):
    type: Literal["Battery"]
    capacity: float
    currentCharge: float = 0
    maxChargeRate: float
    maxDischarge: float
    efficiency: float


class PVGeneratorIn(DeviceBaseIn):
    type: Literal["PVGenerator"]
    ratedPower: float | None = None
    angleOfInclination: float | None = None
    alignment: str | None = None
    location: str | None = None
    lat: float | None = None
    lng: float | None = None



DevicePayload = Union[ConsumerIn, BatteryIn, PVGeneratorIn]

def _device_to_frontend_dict(d: Device) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": d.id,
        "name": d.name,
    }

    if isinstance(d, ConstantActionDevice):
        base.update({
            "type": "Consumer",
            "flexibility": "constant",
            "actions": [
                {
                    "id": a.id,
                    "start": a.start_from.isoformat(),
                    "end": a.end_before.isoformat(),
                    "duration": a.duration.total_seconds() / 60,
                    "consumption": Watt.get_value(a.consumption)
                } for a in d.actions
            ]
        })
        return base

    if isinstance(d, VariableActionDevice):
        base.update({
            "type": "Consumer",
            "flexibility": "variable",
            "actions": [
                {
                    "id": a.id,
                    "start": a.start.isoformat(),
                    "end": a.end.isoformat(),
                    "totalConsumption": WattHour.get_value(a.total_consumption),
                    "maxConsumption": Watt.get_value(a.max_consumption)
                } for a in d.actions
            ]
        })
        return base

    if isinstance(d, GeneratorPV):
        base.update({
            "type": "PVGenerator",
            "ratedPower": Watt.get_value(d.rated_power) if hasattr(d, 'rated_power') and d.rated_power else None,
            "angleOfInclination": getattr(d, 'angle_of_inclination', None),
            "alignment": getattr(d, 'alignment', None),
            "location": getattr(d, 'location', None),
            "lat": getattr(d, 'latitude', None),
            "lng": getattr(d, 'longitude', None),
        })
        return base

    if isinstance(d, Battery):
        base.update({
            "type": "Battery",
            "capacity": WattHour.get_value(d.capacity),
            "maxChargeRate": Watt.get_value(d.max_charge_rate),
            "maxDischarge": Watt.get_value(d.max_discharge_rate),
            "efficiency": d.efficiency,
            "currentCharge": WattHour.get_value(d.current_charge),
        })
        return base

    return base



@router.get("/devices")
def get_devices(manager: IDeviceManager = Depends(get_device_manager)) -> list[dict[str, Any]]:
    devices = manager.get_device_service().get_all_devices()
    return [_device_to_frontend_dict(d) for d in devices]


@router.post("/devices", status_code=status.HTTP_201_CREATED)
def create_device(
        payload: DevicePayload,
        manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:


    if isinstance(payload, ConsumerIn):
        if payload.flexibility == "variable":
            model = VariableActionDevice(name=payload.name)
            manager.add_variable_action_device(model)
        else:
            model = ConstantActionDevice(name=payload.name)
            manager.add_constant_action_device(model)

    elif isinstance(payload, BatteryIn):
        model = Battery(
            name=payload.name,
            capacity=WattHour(payload.capacity),
            current_charge=WattHour(payload.currentCharge),
            max_charge_rate=Watt(payload.maxChargeRate),
            max_discharge_rate=Watt(payload.maxDischarge),
            efficiency=payload.efficiency
        )
        manager.add_battery(model)

    elif isinstance(payload, PVGeneratorIn):
        model = GeneratorPV(
            name=payload.name
        )

        manager.add_generator(model)


    #TODO Generator
    else:
        raise HTTPException(status_code=400, detail="Ungültiger Gerätetyp")

    return _device_to_frontend_dict(model)


@router.delete("/devices/{device_id}")
def delete_device(device_id: int, manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    svc = manager.get_device_service()
    if svc.get_device(device_id) is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    manager.remove_device(device_id)
    return {"success": True}


@router.delete("/devices")
def reset_all_devices(manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    ids = manager.get_device_service().get_all_device_ids()
    for did in ids:
        manager.remove_device(did)
    return {"success": True, "message": "Alle Geräte wurden gelöscht"}