from datetime import datetime
from zoneinfo import ZoneInfo

from external_api_services.cache import Cache
from external_api_services.price_service.price_service import PriceService

BERLIN = ZoneInfo("Europe/Berlin")

def get_datetime(year: int, month: int, day: int, hour: int, minute: int, tzinfo = BERLIN) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo = tzinfo)

BLOCKS = {
        get_datetime(2026, 3, 5, 12, 0): 2.5,
        get_datetime(2026, 3, 5, 13, 0): 4,
        get_datetime(2026, 3, 5, 14, 0): 5
    }

class FakePriceCache(Cache):
    def __init__(self, blocks: dict[datetime, float]):
        self._blocks = blocks

    def get_blocks(self):
        return self._blocks.copy()

def test_get_average_price_across_hour():
    service = PriceService(cache = FakePriceCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 40)
    end = get_datetime(2026, 3, 5, 13, 30)

    assert abs(service.get_average_price(start, end) - 0.0000034) < 1e-9

def test_get_average_price_across_hours():
    service = PriceService(cache = FakePriceCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 40)
    end = get_datetime(2026, 3, 5, 14, 30)

    assert abs(service.get_average_price(start, end) - 0.000004) < 1e-9

def test_get_average_price_inside_hour():
    service = PriceService(cache = FakePriceCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 40)
    end = get_datetime(2026, 3, 5, 12, 45)

    assert abs(service.get_average_price(start, end) - 0.0000025) < 1e-9