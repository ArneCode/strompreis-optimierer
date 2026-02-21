from __future__ import annotations
from typing import Any, Union, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from electricity_price_optimizer_py.units import WattHour, Watt
from api.dependencies import get_device_manager
from device_manager import IDeviceManager
from devices import (
    Device,
    ConstantActionDevice,
    GeneratorRandom,
    VariableActionDevice,
    GeneratorPV,
    Battery,
)

router = APIRouter(prefix="/api", tags=["devices"])


class DeviceBaseIn(BaseModel):
    name: str


class ConsumerIn(DeviceBaseIn):
    """
    Input schema for energy consumers. Supports both fixed-load (constant)
    and flexible-load (variable) appliances.
    """
    type: Literal["Consumer"]
    flexibility: Literal["constant", "variable"] = "constant"
    power: float | None = None
    duration: float | None = None


class BatteryIn(DeviceBaseIn):
    """
    Input schema for storage systems. Used to buffer excess generation
    and optimize cost.
    """
    type: Literal["Battery"]
    capacity: float
    currentCharge: float = 0
    maxChargeRate: float
    maxDischarge: float
    efficiency: float


class PVGeneratorIn(DeviceBaseIn):
    """
    Input schema for Photovoltaic systems. Location and orientation data
    are used for solar yield forecasting.
    """
    type: Literal["PVGenerator"]
    location: str
    peakPower: float
    latitude: float
    longitude: float
    declination: float
    azimuth: float


class RandomGeneratorIn(DeviceBaseIn):
    type: Literal["RandomGenerator"]
    peakPower: float


DevicePayload = Union[ConsumerIn, BatteryIn, PVGeneratorIn, RandomGeneratorIn]


def _device_to_frontend_dict(d: Device) -> dict[str, Any]:
    """
    Transforms an internal Device object into a dictionary optimized for the frontend.

    This converts physical unit objects (Watt, WattHour) into raw numeric values
    and ensures all timestamps are ISO formatted for JSON compatibility.

    Args:
        d: The Device instance to convert (Battery, PV, Consumer, etc.).

    Returns:
        A dictionary containing all frontend-relevant attributes of the device.
    """
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
            "ratedPower": Watt.get_value(d.peak_power),
            "angleOfInclination": d.declination,
            "alignment": d.azimuth,
            "lat": d.latitude,
            "lng": d.longitude,
            "location": d.location,
        })
        return base

    if isinstance(d, GeneratorRandom):
        base.update({
            "type": "RandomGenerator",
            "peakPower": Watt.get_value(d.peak_power),
            "seed": d.seed
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
    """
    Retrieve a list of all devices currently configured in the system.

    Returns:
        A list of dictionaries representing the configuration of each device.
    """
    devices = manager.get_device_service().get_all_devices()
    return [_device_to_frontend_dict(d) for d in devices]


@router.post("/devices", status_code=status.HTTP_201_CREATED)
def create_device(
        payload: DevicePayload,
        manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    """
    Create a new device based on the provided parameters and add it to the manager.

    Supports various device types including consumers (constant/variable),
    batteries, and generators (PV, Random).

    Args:
        payload: Validated device data from the request body.

    Returns:
        The newly created device in frontend-compatible format.

    Raises:
        HTTPException: 400 if the device type is invalid.
    """
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
            name=payload.name,
            location=payload.location,
            latitude=payload.latitude,
            longitude=payload.longitude,
            declination=payload.declination,
            azimuth=payload.azimuth,
            peak_power=Watt(payload.peakPower)
        )
        manager.add_generator_pv(model)

    elif isinstance(payload, RandomGeneratorIn):
        model = GeneratorRandom(
            name=payload.name,
            peak_power=Watt(payload.peakPower),
            seed=None  # will be set in the constructor to a random seed if None
        )
        manager.add_generator_random(model)
    else:
        raise HTTPException(status_code=400, detail="Ungültiger Gerätetyp")

    return _device_to_frontend_dict(model)


@router.post("/devices/{device_id}/new_seed", status_code=status.HTTP_200_OK)
def new_random_seed(device_id: int, manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    """
    Generate a new random seed for a Random Generator device.
    This changes the simulated generation profile for future optimizations.

    Args:
        device_id: ID of the device to update.

    Returns:
        The updated device data.

    Raises:
        HTTPException:
            404 if the device is not found.
            400 if the device is not a random generator.
    """
    svc = manager.get_device_service()
    device = svc.get_device(device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden")

    if not isinstance(device, GeneratorRandom):
        raise HTTPException(
            status_code=400, detail="Gerät ist kein Zufallsgenerator")

    device.new_random_seed()

    return _device_to_frontend_dict(device)


@router.delete("/devices/{device_id}")
def delete_device(device_id: int, manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    """
    Remove a specific device from the system.

    Args:
        device_id: ID of the device to be deleted.

    Returns:
        A success status dictionary.

    Raises:
        HTTPException: 404 if the device is not found.
    """
    svc = manager.get_device_service()
    if svc.get_device(device_id) is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    manager.remove_device(device_id)
    return {"success": True}


@router.delete("/devices")
def reset_all_devices(manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    """
    Delete all currently registered devices from the Device Manager.
    Used to completely reset the system configuration.

    Returns:
        A success message indicating all devices have been removed.
    """
    ids = manager.get_device_service().get_all_device_ids()
    for did in ids:
        manager.remove_device(did)
    return {"success": True, "message": "Alle Geräte wurden gelöscht"}
