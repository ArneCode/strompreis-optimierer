from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional, Dict
from zoneinfo import ZoneInfo

from device import GeneratorPV
from external_api_services.forecast_service.forecast_client import ForecastClient

BERLIN = ZoneInfo("Europe/Berlin")

def floor_hour(dt: datetime) -> datetime:
    return dt.replace(minute=0, second=0, microsecond=0)

# Created with AI assistance
def _parse_ts(ts: str) -> datetime:
    """
    Handles:
      - ISO 8601 like '2026-02-10T06:31:54+00:00'
      - 'YYYY-MM-DD HH:MM:SS'
      - '...Z' (UTC Zulu)
    """
    s = ts.strip()

    # ISO with 'Z'
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    # Try ISO first
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        pass

    # Fallback: 'YYYY-MM-DD HH:MM:SS' (assume naive -> treat as Berlin local)
    try:
        dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
        # If this ever happens, you can decide which tz it should be.
        return dt.replace(tzinfo=BERLIN)
    except ValueError as e:
        raise ValueError(f"Unrecognized timestamp format: {ts!r}") from e

@dataclass(frozen=True)
class ForecastBlock:
    start: datetime # inklusiv
    end: datetime # exklusiv
    production: float

class ForecastCache:
    """
    Caches hourly energy (Wh) per hour_start (Berlin).
    """
    def __init__(
        self,
        *,
        client: ForecastClient,
        generator: GeneratorPV,
        refresh_interval_s: int = 15 * 60,
        future_hours: int = 30,
        series_key: str = "watt_hours_period",
    ) -> None:
        self._client = client
        self._generator = generator
        self._refresh_interval_s = refresh_interval_s
        self._future_hours = future_hours
        self._series_key = series_key
        self._lock = threading.Lock()
        self._last_fetch_s: float = 0.0
        self._blocks: Dict[datetime, float] = {}
        self._cached_until: Optional[datetime] = None
        self._generator_has_changed: bool = False

    def _refresh_needed(self) -> bool:
        if not self._blocks:
            return True
        if (time.time() - self._last_fetch_s) > self._refresh_interval_s:
            return True
        if self._generator_has_changed:
            return True
        now = floor_hour(datetime.now(BERLIN))
        needed_end = now + timedelta(hours = 24) #Vielleicht nur 24h anstelle von 48h hier
        return self._cached_until is None or self._cached_until < needed_end

    def refresh(self) -> None:
        with self._lock: #Vielleicht unnötig
            if not self._refresh_needed():
                return

            try:
                payload = self._client.fetch_estimate(
                    latitude = self._generator.latitude,
                    longitude = self._generator.longitude,
                    declination = self._generator.declination,
                    azimuth = self._generator.azimuth,
                    kilowatt_peak = self._generator.peak_power.get_value(),
                    time_mode = "utc",
                )
            except Exception as exception:
                if self._blocks:
                    return
                raise RuntimeError(f"Forecast API call failed and cache is empty: {exception}") from exception

            result = payload.get("result")
            if not isinstance(result, dict):
                if self._blocks:
                    return
                raise RuntimeError("Forecast payload has no 'result' dict and cache is empty.")

            series = result.get(self._series_key)
            if not isinstance(series, dict):
                if self._blocks:
                    return
                raise RuntimeError(f"Forecast result has no series '{self._series_key}' and cache is empty.")

            items = list(series.items())
            raw: Dict[datetime, float] = {}

            for timestamp, value in items:
                dt = _parse_ts(timestamp)  # tz-aware
                dt = dt.astimezone(BERLIN)

                if dt.minute != 0 or dt.second != 0:
                    continue

                dt = dt.replace(microsecond = 0)
                raw[dt] = float(value)

            start = datetime.now(BERLIN).replace(hour = 0, minute = 0, second = 0, microsecond = 0)
            end = start + timedelta(hours = 48)

            real: Dict[datetime, float] = {}

            current = start
            while current < end:
                hour_end = current + timedelta(hours = 1)

                value = raw.get(hour_end)
                if value is None:
                    value = 0.0

                real[current] = value
                current = hour_end

            #Debug
            print("real: ")
            for dt, val in sorted(real.items()):
                print(f"{dt:%Y-%m-%d %H:%M} -> {val} Wh")

            blocks: Dict[datetime, ForecastBlock] = {}
            cache_start = floor_hour(datetime.now(BERLIN))
            cache_end = cache_start + timedelta(hours = self._future_hours)
            current_dt = cache_start

            while current_dt < cache_end:
                next_dt = current_dt + timedelta(hours = 1)

                production = real.get(current_dt)
                if production is None:
                    production = real.get(current_dt - timedelta(hours = 24))

                if production is None:
                    raise RuntimeError(f"No production known for {current_dt.isoformat()}.")

                blocks[current_dt] = ForecastBlock(start = current_dt, end = next_dt, production = production)
                current_dt = next_dt

            self._blocks = {dt: block.production for dt, block in blocks.items()}
            self._last_fetch_s = time.time()
            self._cached_until = cache_end
            self._generator_has_changed = False

            #Debug
            print("Blocks:")
            for dt, val in sorted(blocks.items()):
                print(f"{dt:%Y-%m-%d %H:%M} -> {val.production} Wh")

    def get_blocks(self):
        self.refresh()
        return self._blocks.copy()

    def set_generator(self, generator: GeneratorPV):
        self._generator = generator
        self._generator_has_changed = True
        self.refresh()