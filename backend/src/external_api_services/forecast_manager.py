from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, Tuple

from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.pv_configuration import PVConfiguration
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.forecast_service import ForecastService


def _get_pv_key(configuration: PVConfiguration) -> Tuple[float, float, float, float, float]:
    """
    Returns a key from a given PV configuration for identifying caches per PV configuration.
    :param configuration: the given PV configuration
    :return: the key
    """
    return (
        float(configuration.latitude),
        float(configuration.longitude),
        float(configuration.declination),
        float(configuration.azimuth),
        float(configuration.peak_power)
    )


@dataclass
class _Entry:
    """
    Internal registry entry holding one cache + service instance.
    """
    cache: ForecastCache
    service: ForecastService


class ForecastManager:
    """
    Registry for ForecastService instances per PV configuration.
    """
    def __init__(
        self,
        *,
        client: ForecastClient,
        refresh_interval_s: int = 15 * 60,
        future_hours: int = 30,
        series_key: str = "watt_hours_period",
    ) -> None:
        """
        Initializes the ForecastManager.
        :param client: the central client for HTTP calls
        :param refresh_interval_s: minimum seconds between API fetches
        :param future_hours: number of hours to cache starting from the current hour
        :param series_key: series name in the forecast payload
        """
        self._client = client
        self._refresh_interval_s = refresh_interval_s
        self._future_hours = future_hours
        self._series_key = series_key

        self._lock = threading.Lock()
        self._entries: Dict[Tuple[float, float, float, float, float], _Entry] = {}

    def get_service(self, configuration: PVConfiguration) -> ForecastService:
        """
        Returns the ForecastService for a given PV configuration.
        :param configuration: the given PV configuration
        :return: the ForecastService
        """
        key = _get_pv_key(configuration)

        with self._lock:
            entry = self._entries.get(key)
            if entry is not None:
                return entry.service

            cache = ForecastCache(
                client = self._client,
                pv_configuration = configuration,
                refresh_interval_s = self._refresh_interval_s,
                future_hours = self._future_hours,
                series_key = self._series_key,
            )
            service = ForecastService(cache = cache)
            self._entries[key] = _Entry(cache = cache, service = service)
            return service

    def clear(self) -> None:
        """
        Clears all cached PV forecast services.
        """
        with self._lock:
            self._entries.clear()

