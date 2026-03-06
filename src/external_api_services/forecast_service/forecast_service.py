from datetime import datetime, timedelta
from typing import Dict
from zoneinfo import ZoneInfo

from external_api_services.forecast_service.forecast_cache import ForecastCache
from external_api_services.forecast_service.forecast_service_port import ForecastServicePort
from electricity_price_optimizer_py.units import WattHour, Watt

BERLIN = ZoneInfo("Europe/Berlin")


def _floor_hour(dt: datetime) -> datetime:
    """
    Returns a given datetime truncated to the beginning of its hour.
    :param dt: the given datetime
    :return: the truncated datetime
    """
    return dt.replace(minute=0, second=0, microsecond=0)


def _ceil_hour(dt: datetime) -> datetime:
    """
    Returns a given datetime rounded up to the next full hour (or the same hour
    if the datetime is already exactly on the hour).
    :param dt: the given datetime
    :return: the rounded up datetime
    """
    floored_hour = _floor_hour(dt)
    return floored_hour + timedelta(hours=1)


class ForecastService(ForecastServicePort):
    """
    Service Layer for PV production forecasts.
    This service provides methods to:
    - calculate and get the total production over given time intervals (in Wh).
    - get the production prognosis for a sequence of time intervals.
    - get the current power (in W) based on the forecast of the current hour.

    Model:
    - The ForecastCache stores the production for the next 30 hours indexed by hourly timestamps.
    - Assumption: Within each hour, production is uniformly distributed (constant average power).
    - All computations are performed in the Berlin timezone.
    """

    def __init__(self, cache: ForecastCache):
        """
        Initializes the ForecastService.
        :param cache: ForecastCache instance for one specific PV configuration.
        """
        self._cache = cache

    def get_total_production(self, start: datetime, end: datetime) -> float:
        """
        Computes the predicted totally produced energy for a given time interval.
        :param start: start of the time interval
        :param end: end of the time interval
        :return: the predicted production in Wh
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

            if hour_wh is None:
                raise RuntimeError(
                    f"No production available for {hour_start.isoformat()}")

            total_wh += float(hour_wh) * (segment_seconds / 3600.0)
            current = segment_end

        return total_wh

    def get_prognoses(self, timestamps: list[datetime], end: datetime) -> list[WattHour]:
        """
        Returns the predicted energy for multiple consecutive time intervals each.
        :param timestamps: list of time intervals
        :param end: end of last time interval
        :return: the list of predicted productions for each interval
        """
        if not timestamps:
            return []

        prognoses: list[WattHour] = []

        for i in range(0, len(timestamps) - 1):
            start_timestamp = timestamps[i]
            end_timestamp = timestamps[i + 1]
            prognoses.append(
                WattHour(self.get_total_production(start_timestamp, end_timestamp)))

        prognoses.append(WattHour(self.get_total_production(
            timestamps[len(timestamps) - 1], end)))
        return prognoses

    def get_current_power(self) -> Watt:
        """
        Returns the current power.
        :return: the current power
        """
        current = datetime.now().astimezone(BERLIN)
        blocks = self._cache.get_blocks()
        produced_amount = blocks.get(_floor_hour(current))

        if produced_amount is None:
            produced_amount = 0.0

        return Watt(produced_amount)
