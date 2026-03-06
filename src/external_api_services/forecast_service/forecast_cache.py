from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional, Dict
from zoneinfo import ZoneInfo

from external_api_services.cache import Cache
from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_service.pv_configuration import PVConfiguration

BERLIN = ZoneInfo("Europe/Berlin")
MINIMUM_FUTURE_HOURS = 24


def _floor_hour(dt: datetime) -> datetime:
    """
    Returns a given datetime truncated to the beginning of its hour.
    :param dt: the given datetime
    :return: the truncated datetime
    """
    return dt.replace(minute=0, second=0, microsecond=0)

# Created with AI Assistance


def _parse_ts(timestamp: str) -> datetime:
    """
    Parses a timestamp returned by forecast.solar.
    """
    stamp = timestamp.strip()

    if stamp.endswith("Z"):
        stamp = stamp[:-1] + "+00:00"

    try:
        # Preferred: ISO 8601 format
        return datetime.fromisoformat(stamp)

    except ValueError:
        try:
            # Fallback: naive timestamp (treated as local Berlin time)
            dt = datetime.strptime(stamp, "%Y-%m-%d %H:%M:%S")
            return dt.replace(tzinfo=BERLIN)

        except ValueError as e:
            raise ValueError(
                f"Invalid timestamp format: {timestamp}"
            ) from e


@dataclass(frozen=True)
class ForecastBlock:
    """
    Represents one hourly production block.
    start: inclusive hour start
    end: exclusive hour end
    production: energy in Wh produced between start and end
    """
    start: datetime
    end: datetime
    production: float


class ForecastCache(Cache):
    """
    In-memory cache for PV forecast data.
    """

    def __init__(
        self,
        *,
        client: ForecastClient,
        pv_configuration: PVConfiguration,
        refresh_interval_s: int = 15 * 60,
        future_hours: int = 30,
        series_key: str = "watt_hours_period",
    ) -> None:
        """
        Initializes the cache.
        :param client: HTTP client used to fetch data from the API
        :param pv_configuration: holds the configuration of the PV
        :param refresh_interval_s: minimum seconds between API fetches
        :param future_hours: number of hours to cache starting from the current hour
        :param series_key: series name in the forecast payload
        """
        self._client = client
        self._pv_configuration = pv_configuration
        self._refresh_interval_s = refresh_interval_s
        self._future_hours = future_hours
        self._series_key = series_key
        self._lock = threading.Lock()
        self._last_fetch_s: float = 0.0
        self._blocks: Dict[datetime, float] = {}
        self._cached_until: Optional[datetime] = None

    def _refresh_needed(self) -> bool:
        """
        Decides whether a refresh needs to be performed.
        Conditions:
        - cache empty
        - refresh_interval exceeded
        - cache horizon shorter than now + 24 hours
        :return:
        """
        if not self._blocks:
            return True
        if (time.time() - self._last_fetch_s) > self._refresh_interval_s:
            return True
        now = _floor_hour(datetime.now(BERLIN))
        needed_end = now + timedelta(hours=MINIMUM_FUTURE_HOURS)
        return self._cached_until is None or self._cached_until < needed_end

    def refresh(self) -> None:
        """
        Refreshes the cached blocks if necessary.
        Uses fallback logic for missing blocks.
        If API call fails and cached blocks exist already, keep old cache otherwise an exception is raised.
        :return:
        """
        with self._lock:
            if not self._refresh_needed():
                return

            try:
                payload = self._client.fetch_estimate(
                    latitude=self._pv_configuration.latitude,
                    longitude=self._pv_configuration.longitude,
                    declination=self._pv_configuration.declination,
                    azimuth=self._pv_configuration.azimuth,
                    kilowatt_peak=self._pv_configuration.peak_power / 1000.0,
                    time_mode="utc",
                )
            except Exception as exception:
                if self._blocks:
                    return
                raise RuntimeError(
                    f"Forecast API call failed and cache is empty: {exception}") from exception

            result = payload.get("result")
            if not isinstance(result, dict):
                if self._blocks:
                    return
                raise RuntimeError(
                    "Forecast payload has no 'result' dict and cache is empty.")

            series = result.get(self._series_key)
            if not isinstance(series, dict):
                if self._blocks:
                    return
                raise RuntimeError(
                    f"Forecast result has no series '{self._series_key}' and cache is empty.")

            items = list(series.items())
            raw: Dict[datetime, float] = {}

            for timestamp, value in items:
                date = _parse_ts(timestamp)  # tz-aware
                date = date.astimezone(BERLIN)

                if date.minute != 0 or date.second != 0:
                    continue

                date = date.replace(microsecond=0)
                raw[date] = float(value)

            start = datetime.now(BERLIN).replace(
                hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(hours=48)
            real: Dict[datetime, float] = {}
            current = start

            while current < end:
                hour_end = current + timedelta(hours=1)
                value = raw.get(hour_end)

                if value is None:
                    value = 0.0

                real[current] = value
                current = hour_end

            blocks: Dict[datetime, ForecastBlock] = {}
            cache_start = _floor_hour(datetime.now(BERLIN))
            cache_end = cache_start + timedelta(hours=self._future_hours)
            current_dt = cache_start

            while current_dt < cache_end:
                next_dt = current_dt + timedelta(hours=1)

                production = real.get(current_dt)
                if production is None:
                    production = real.get(current_dt - timedelta(hours=24))

                if production is None:
                    raise RuntimeError(
                        f"No production known for {current_dt.isoformat()}.")

                blocks[current_dt] = ForecastBlock(
                    start=current_dt, end=next_dt, production=production)
                current_dt = next_dt

            self._blocks = {dt: block.production for dt,
                            block in blocks.items()}
            self._last_fetch_s = time.time()
            self._cached_until = cache_end

    def get_blocks(self):
        """
        Returns cached blocks and ensures the cache is refreshed.
        :return: the cached blocks
        """
        self.refresh()
        return self._blocks.copy()
