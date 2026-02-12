from __future__ import annotations
"""

import threading
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from device import GeneratorPV
from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.forecast_service import ForecastService


def _pv_fingerprint(pv: GeneratorPV) -> Tuple[float, float, float, float, float]:
    
    Only include fields that influence the forecast.
    If any of these change, we must refresh/rebuild the cache.
    
    return (
        float(pv.latitude),
        float(pv.longitude),
        float(pv.declination),
        float(pv.azimuth),
        float(pv.peak_power), #Aufüpassen wegen watt
    )


@dataclass
class _Entry:
    fingerprint: Tuple[float, float, float, float, float]
    cache: ForecastCache
    service: ForecastService


class ForecastManager:
    
    App-scoped registry for ForecastServices per PV generator.
    - Keeps one cache+service per GeneratorPV.id
    - Updates cache when PV config changes
    Thread-safe for concurrent requests.
    

    def __init__(
        self,
        *,
        client: ForecastClient,
        refresh_interval_s: int = 15 * 60,
        future_hours: int = 30,
        series_key: str = "watt_hours_period",
    ) -> None:
        self._client = client
        self._refresh_interval_s = refresh_interval_s
        self._future_hours = future_hours
        self._series_key = series_key

        self._lock = threading.Lock()
        self._entries: Dict[int, _Entry] = {}

    def get_service(self, generator: GeneratorPV) -> ForecastService:
        
        Return the ForecastService for this PV.
        Creates it lazily on first use.
        If PV parameters changed, updates the underlying cache.
        
        pv_id = int(generator.id)
        fp = _pv_fingerprint(generator)

        with self._lock:
            entry = self._entries.get(pv_id)


            if entry is None:
                cache = ForecastCache(
                    client=self._client,
                    generator=generator,
                    refresh_interval_s=self._refresh_interval_s,
                    future_hours=self._future_hours,
                    series_key=self._series_key,
                )
                service = ForecastService(cache=cache)
                entry = _Entry(fingerprint=fp, cache=cache, service=service)
                self._entries[pv_id] = entry
                return service

            # Config changed -> update cache (keeps service instance stable)
            if entry.fingerprint != fp:
                # your ForecastCache already has set_generator()
                entry.cache.set_generator(generator)
                entry.fingerprint = fp

            return entry.service

    def remove(self, pv_id: int) -> None:
        
        Optional: call when a PV device is deleted to free memory.
        
        with self._lock:
            self._entries.pop(int(pv_id), None)

    def clear(self) -> None:
        
        Optional: drop all cached PV services.
        
        with self._lock:
            self._entries.clear()
"""

import threading
from dataclasses import dataclass
from typing import Dict, Tuple

from external_api_services.forecast_service.forecast_cache import ForecastCache, PVConfiguration
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.forecast_service import ForecastService


def _pv_fingerprint(configuration: PVConfiguration) -> Tuple[float, float, float, float, float]:
    return (
        float(configuration.latitude),
        float(configuration.longitude),
        float(configuration.declination),
        float(configuration.azimuth),
        float(configuration.peak_power)
    )


@dataclass
class _Entry:
    cache: ForecastCache
    service: ForecastService


class ForecastManager:
    def __init__(
        self,
        *,
        client: ForecastClient,
        refresh_interval_s: int = 15 * 60,
        future_hours: int = 30,
        series_key: str = "watt_hours_period",
    ) -> None:
        self._client = client
        self._refresh_interval_s = refresh_interval_s
        self._future_hours = future_hours
        self._series_key = series_key

        self._lock = threading.Lock()
        self._entries: Dict[Tuple[float, float, float, float, float], _Entry] = {}

    def get_service(self, cfg: PVConfiguration) -> ForecastService:
        key = _pv_fingerprint(cfg)

        with self._lock:
            entry = self._entries.get(key)
            if entry is not None:
                return entry.service

            cache = ForecastCache(
                client=self._client,
                pv_configuration=cfg,
                refresh_interval_s=self._refresh_interval_s,
                future_hours=self._future_hours,
                series_key=self._series_key,
            )
            service = ForecastService(cache=cache)
            self._entries[key] = _Entry(cache=cache, service=service)
            return service

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


