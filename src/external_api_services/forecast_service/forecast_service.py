from datetime import datetime, timedelta
from typing import Dict
from zoneinfo import ZoneInfo

from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.forecast_service_port import ForecastServicePort
from electricity_price_optimizer_py.units import WattHour, Watt

BERLIN = ZoneInfo("Europe/Berlin")

def _floor_hour(dt: datetime) -> datetime:
    return dt.replace(minute = 0, second = 0, microsecond = 0)

def _ceil_hour(dt: datetime) -> datetime:
    floored_hour = _floor_hour(dt)
    if dt == floored_hour:
        return floored_hour
    else:
        return floored_hour + timedelta(hours = 1)

class ForecastService(ForecastServicePort):
    def __init__(self, cache: ForecastCache):
        self._cache = cache

    def get_total_production(self, start: datetime, end: datetime) -> float:
        """
        Returns total produced energy in Wh for interval [start, end).
        Assumes production is uniformly distributed within each hour.
        """
        if end <= start:
            raise RuntimeError("end must be after start")

        start = start.astimezone(BERLIN)
        end = end.astimezone(BERLIN)
        blocks = self._cache.get_blocks()

        total_wh = 0.0
        current = start

        while current < end:
            hour_start = _floor_hour(current)
            hour_end = _ceil_hour(current)

            segment_end = min(hour_end, end)
            segment_seconds = (segment_end - current).total_seconds()

            if segment_seconds <= 0:
                break

            hour_wh = blocks.get(hour_start)
            """
            if hour_wh is None:
                hour_wh = blocks.get(hour_start - timedelta(hours=24))
            """

            if hour_wh is None:
                raise RuntimeError(f"No production for {hour_start.isoformat()}.")

            total_wh += float(hour_wh) * (segment_seconds / 3600.0)

            current = segment_end

        return total_wh

    def get_prognoses(self, timestamps: list[datetime], end: datetime) -> list[WattHour]:
        prognoses: list[WattHour] = []

        for i in range (0, len(timestamps) - 1):
            start_timestamp = timestamps[i]
            end_timestamp = timestamps[i + 1]
            prognoses.append(WattHour(self.get_total_production(start_timestamp, end_timestamp)))

        prognoses.append(WattHour(self.get_total_production(timestamps[len(timestamps) - 1], end)))
        return prognoses


    def get_current_power(self) -> Watt:
        current = datetime.now().astimezone(BERLIN)
        blocks = self._cache.get_blocks()
        produced_amount = blocks.get(_floor_hour(current))
        return Watt(produced_amount)

