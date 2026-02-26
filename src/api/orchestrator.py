from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status
from api.dependencies import get_device_manager, get_optimizer_service, get_orchestrator_service, get_settings_service
from device_manager import IDeviceManager
from devices import Battery, GeneratorRandom, VariableActionDevice, VariableAction, ConstantActionDevice, ConstantAction, GeneratorPV
from electricity_price_optimizer_py.units import WattHour, Watt
from services.interfaces import IOptimizerService, ISettingsService
from services.orchestrator_service import IOrchestratorService, OrchestratorService

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


@router.post("/test", status_code=status.HTTP_200_OK)
def test_orchestrator(manager: IDeviceManager = Depends(get_device_manager),
                      orchestrator: IOrchestratorService = Depends(
                          get_orchestrator_service),
                      settings_service: ISettingsService = Depends(
                          get_settings_service),
                      optimizer_service: IOptimizerService = Depends(
                          get_optimizer_service)
                      ) -> dict:
    # Seed sample devices
    # 1) Battery
    battery = Battery(
        name="Test Battery",
        capacity=WattHour(5000.0),
        current_charge=WattHour(2500.0),
        max_charge_rate=Watt(500.0),
        max_discharge_rate=Watt(500.0),
        efficiency=0.95,
        # ...existing code...
    )
    manager.add_battery(battery)

    # 2) Constant action device with one action

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    cad = ConstantActionDevice(name="Washer")
    cad.actions.append(
        ConstantAction(
            start_from=now,
            end_before=now + timedelta(hours=6),
            duration=timedelta(hours=2),
            consumption=Watt(300.0),
            # ...existing code...
        )
    )
    manager.add_constant_action_device(cad)

    # 3) Variable action device with one action
    vad = VariableActionDevice(name="EV Charger")
    vad.actions.append(
        VariableAction(
            start=now + timedelta(hours=1),
            end=now + timedelta(hours=8),
            total_consumption=WattHour(7000.0),
            max_consumption=Watt(2000.0),
            # ...existing code...
        )
    )
    manager.add_variable_action_device(vad)

    # 4) PV generator
    pv = GeneratorPV(name="Roof PV", latitude=52.5200, longitude=13.4050,
                     declination=30, azimuth=180, peak_power=Watt(8.5), location="Berlin")
    manager.add_generator_pv(pv)

    pvrandom = GeneratorRandom(
        name="Random PV", peak_power=Watt(8.5), seed=None)
    manager.add_generator_random(pvrandom)

    # Run orchestrator
    orchestrator.run_optimization(manager, settings_service, optimizer_service)
    print("Optimization started...")
    # schedule = orchestrator.get_schedule()

    # Return a minimal summary
    return {
        "message": "Optimization executed",
        "device_count": len(manager.get_device_service().get_all_devices()),
    }
