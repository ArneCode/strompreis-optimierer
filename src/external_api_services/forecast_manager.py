from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, Tuple

from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.pv_configuration import PVConfiguration
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.forecast_service import ForecastService


def _get_pv_key(configuration: PVConfiguration) -> Tuple[float, float, float, float, float]:
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
        key = _get_pv_key(cfg)

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

