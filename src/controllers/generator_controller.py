from datetime import datetime
from typing import Optional, TYPE_CHECKING

from electricity_price_optimizer_py.units import Watt, WattHour

import device
import instances
from external_api_services import forecast_service
from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.forecast_service import ForecastService
from .base import DeviceController

from electricity_price_optimizer_py import (
    Schedule,
    OptimizerContext,
    PrognosesProvider
)

if TYPE_CHECKING:
    from device_manager import IDeviceManager

def generator_fingerprint(generator) -> tuple:
    return (
        float(generator.latitude),
        float(generator.longitude),
        float(generator.declination),
        float(generator.azimuth),
        float(generator.peak_power)
    )

class GeneratorPvController(DeviceController):
    """Controller for generator devices (e.g., PV panels).

    Generators are passive: they don't receive commands but their
    prognoses/current output is added to the optimizer context.
    """

    def __init__(self, id: "int"):
        self._id = id
        self._schedule: "Optional[Schedule]" = None

        self._forecast_cache: Optional[ForecastCache] = None
        self._forecast_service: Optional[ForecastService] = None
        self._generator_fingerprint: Optional[tuple] = None

    @property
    def device_id(self) -> "int":
        return self._id

    def use_schedule(self, schedule: "Schedule", device_manager: "IDeviceManager") -> "None":
        """Store the schedule (generators typically don't act on it)."""
        self._schedule = schedule

    def _ensure_forecast_is_ready(self, device_manager: "IDeviceManager") -> None:
        generator = device_manager.get_device_service().get_generator_pv(self._id)
        fingerprint = generator_fingerprint(generator)

        if self._forecast_cache is None or self._forecast_cache is None or self._generator_fingerprint is None:
            self._forecast_cache = ForecastCache(
                client = instances.forecast_client,
                generator = generator
            )
            self._forecast_service = ForecastService(cache = self._forecast_cache)
            self._generator_fingerprint = fingerprint
            return

        if fingerprint != self._generator_fingerprint:
            try:
                self._forecast_cache.set_generator(generator)
            except Exception:
                self._forecast_cache = ForecastCache(
                    client = instances.forecast_client,
                    generator = generator
                )
                self._forecast_service = ForecastService(cache = self._forecast_cache)

            self._generator_fingerprint = fingerprint

    def add_to_optimizer_context(self, context: "OptimizerContext", current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """Add generator prognoses to the optimizer context."""
        device = device_manager.get_device_service().get_generator_pv(
            self._id)
        prognoses = PrognosesProvider(
            # Mock prognosis: constant 5W generation; replace with real data access
            # lambda t1, t2: WattHour(5)
            lambda t1, t2: self._forecast_service.get_total_production(t1, t2)
        )
        context.add_generated_electricity_prognoses(prognoses)

    def update_device(self, current_time: "datetime", device_manager: "IDeviceManager") -> "None":
        """Optional periodic update; for generators we generally don't actuate devices."""
        # Could poll interactor to advance simulated state if it exposes update()
        interactor = device_manager.get_interactor_service().get_generator_interactor(self._id)
        if interactor is None:
            return
        # Some mock interactors implement update(current_time, device_manager)
        try:
            interactor.update(current_time, device_manager)
        except Exception:
            # Not all interactors implement update; ignore quietly
            pass
