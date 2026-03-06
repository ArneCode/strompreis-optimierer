from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional, Dict
from awattar.client import AwattarClient
from zoneinfo import ZoneInfo

from external_api_services.cache import Cache
BERLIN = ZoneInfo("Europe/Berlin")
NEEDED_FUTURE_HOURS = 24
API_UPDATE_HOUR = 14
FALLBACK_ONE_DAY = 24
FALLBACK_TWO_DAYS = 48

@dataclass(frozen = True)
class PriceBlock:
    """
    One hourly price interval.
    """
    start : datetime
    end : datetime
    price: float

def _floor_hour(dt: datetime) -> datetime:
    """
    Truncates a datetime to the beginning of its hour.
    """
    floor_time = dt.replace(minute = 0, second = 0, microsecond = 0)
    return floor_time

class PriceCache(Cache):
    """
    In-memory cache for hourly electricity prices.
    Uses fallback logic for missing data.
    """
    def __init__(
            self,
            client : AwattarClient | None = None,
            refresh_interval_s: int = 15 * 60,
            future_hours: int = 48
    ):
        """
        Initializes the PriceCache.
        :param client: Client for fetching hourly electricity prices.
        :param refresh_interval_s: minimum seconds between API fetches
        :param future_hours: number of hours to cache starting from the current hour
        """
        if future_hours < NEEDED_FUTURE_HOURS:
            raise ValueError(f"future_hours ({future_hours}) must be >= ({NEEDED_FUTURE_HOURS})")
        self._client = client or AwattarClient('DE')
        self.refresh_interval_s = refresh_interval_s
        self.future_hours = future_hours
        self._blocks: dict[datetime, float] = {}
        self._last_fetch_s: float = 0.0
        self._lock = threading.Lock()
        self._cached_until: Optional[datetime] = None

    def _refresh_needed(self) -> bool:
        """
        Checks if the cache needs to be refreshed.
        :return: a boolean indicating whether the cache needs to be refreshed.
        """
        if not self._blocks:
            return True
        if (time.time() - self._last_fetch_s) > self.refresh_interval_s:
            return True

        now = _floor_hour(datetime.now(BERLIN))
        needed_end = now + timedelta(hours = NEEDED_FUTURE_HOURS)
        return self._cached_until is None or  self._cached_until < needed_end

    def refresh(self) -> None:
        """
        Refreshes the cache if necessary with new data from the external API.
        """
        with self._lock:
            if not self._refresh_needed():
                return

            now_dt = _floor_hour(datetime.now(BERLIN))
            cache_start = now_dt
            cache_end = cache_start + timedelta(hours = self.future_hours)

            if now_dt.hour < API_UPDATE_HOUR:
                begin_dt = now_dt.replace(hour = 0, minute = 0, second = 0, microsecond = 0)
            else:
                begin_dt = cache_start
            end_dt = cache_end
            items = self._client.request(begin_dt, end_dt)

            real: Dict[datetime, float] = {}
            for item in items:
                start = item.start_datetime
                start = _floor_hour(start.astimezone(BERLIN))
                real[start] = float(item.marketprice)

            blocks_map: Dict[datetime, PriceBlock] = {}
            current_dt = cache_start
            while current_dt < cache_end:
                next_dt = current_dt + timedelta(hours = 1)

                price = real.get(current_dt)
                if price is None:
                    price = real.get(current_dt - timedelta(hours = FALLBACK_ONE_DAY))
                    if price is None:
                        price = real.get(current_dt - timedelta(hours = FALLBACK_TWO_DAYS))

                if price is None:
                    raise RuntimeError(f"No price available for {current_dt.isoformat()}.")


                blocks_map[current_dt] = PriceBlock(start = current_dt, end = next_dt, price = price)
                current_dt = next_dt

            self._blocks = {dt: block.price for dt, block in blocks_map.items()}
            self._last_fetch_s = time.time()
            self._cached_until = cache_end

    def get_blocks(self) -> Dict[datetime, float]:
        """
        Returns the cached price blocks.
        :return: the cached price blocks.
        """
        self.refresh()
        return self._blocks.copy()