from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from api.dependencies import get_device_manager
from device_manager import IDeviceManager

from devices import Battery, ConstantActionDevice, VariableActionDevice
from electricity_price_optimizer_py.units import Watt, WattHour


router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/overview")
def get_overview(manager: IDeviceManager = Depends(get_device_manager)) -> dict[str, Any]:
    """
    Overview endpoint for dashboard cards.

    Returns:
      {
        "batteries": [{ id, name, currentPower, chargeLevel, status }],
        "actions":   [{ id, name, currentPower, status, actionType }],
        "generators":[{ id, name, currentPower, status }]
      }
    """

    controller_service = manager.get_controller_service()
    device_service = manager.get_device_service()

    now = datetime.now(timezone.utc)

    batteries: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    generators: list[dict[str, Any]] = []

    for device in device_service.get_all_devices():
        # batteries
        if isinstance(device, Battery):
            ctrl = controller_service.get_battery_controller(device.id)
            if ctrl is None:
                continue

            batteries.append(
                {
                    "id": device.id,
                    "name": device.name,
                    "currentPower": float(Watt.get_value(ctrl.get_current_power(manager))),
                    "chargeLevel": float(WattHour.get_value(ctrl.get_charge(manager))),
                    "status": ctrl.get_status_str(manager),
                }
            )
            continue

        # constant actions
        if isinstance(device, ConstantActionDevice):
            ctrl = controller_service.get_constant_action_controller(device.id)
            if ctrl is None:
                continue

            actions.append(
                {
                    "id": device.id,
                    "name": device.name,
                    "actionType": "constant",
                    "currentPower": float(Watt.get_value(ctrl.get_current_power(manager))),
                    "status": ctrl.get_status_str(manager),
                }
            )
            continue

        # variable actions
        if isinstance(device, VariableActionDevice):
            ctrl = controller_service.get_variable_action_controller(device.id)
            if ctrl is None:
                continue

            actions.append(
                {
                    "id": device.id,
                    "name": device.name,
                    "actionType": "variable",
                    "currentPower": float(Watt.get_value(ctrl.get_current_power(manager))),
                    "status": ctrl.get_status_str(now, manager),
                }
            )
            continue

        # Generators
        gen_ctrl = controller_service.get_generator_controller(device.id)
        if gen_ctrl is not None:
            generators.append(
                {
                    "id": device.id,
                    "name": device.name,
                    "currentPower": float(Watt.get_value(gen_ctrl.get_current_power(manager))),
                    "status": gen_ctrl.get_status_str(manager),
                }
            )

    return {
        "batteries": batteries,
        "actions": actions,
        "generators": generators,
    }