from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from external_api_services.cache import Cache
from external_api_services.price_service.price_service_port import PriceServicePort

BERLIN = ZoneInfo("Europe/Berlin")

def _floor_hour(dt: datetime) -> datetime:
    return dt.replace(minute = 0, second = 0, microsecond = 0)

class PriceService(PriceServicePort):
    """
    Provides access to cached electricity price data.
    """
    def __init__(self, cache : Cache) -> None:
        """
        Initializes the price service.
        :param cache: the cache that caches price data
        """
        self._cache = cache

    def get_average_price(self, start: datetime, end: datetime) -> float:
        """
        Calculates the average price between two given dates.
        :param start: the start date
        :param end: the end date
        :return: the average price between start and end
        """
        start = start.astimezone(BERLIN)
        end = end.astimezone(BERLIN)
        blocks = self._cache.get_blocks()
        start_block_key = _floor_hour(start)

        if start_block_key == _floor_hour(end - timedelta(microseconds = 1)):
            return blocks[start_block_key] / 1000000 #1000

        total_weighted = 0.0
        total_duration = 0

        cur = start
        while cur < end:
            hour_start = _floor_hour(cur)
            hour_end = hour_start + timedelta(hours = 1)
            segment_end = min(hour_end, end)

            segment_duration = int((segment_end - cur).total_seconds())
            if segment_duration > 0:
                try:
                    price = blocks[hour_start]
                except KeyError as keyError:
                    raise RuntimeError(f"Missing price block for hour starting at {hour_start.isoformat()}") from keyError

                total_weighted += segment_duration * price
                total_duration += segment_duration

            cur = segment_end

        if total_duration == 0:
            raise RuntimeError("Duration of given interval is 0")

        return (total_weighted / total_duration) / 1000000 #1000

    def get_hourly_prices_24h(self, start: datetime = datetime.now()) -> dict[datetime, float]:
        """
        Returns hourly prices for the next 24 hours from now or a given datetime.
        :param start: the start date
        :return: a dictionary mapping datetime to their hourly price.
        """
        start = start.astimezone(BERLIN)
        blocks = self._cache.get_blocks()

        current = _floor_hour(start)
        end = current + timedelta(hours=23)
        hourly_prices: dict[datetime, float] = {}
        while current < end:
            price: float = blocks[current]

            if price is None:
                raise RuntimeError(f"No price for {current.isoformat()}.")

            hourly_prices[current] = price / 1000000 #1000
            current += timedelta(hours = 1)

        return hourly_prices