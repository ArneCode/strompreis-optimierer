from datetime import datetime
from zoneinfo import ZoneInfo

from external_api_services.cache import Cache
from external_api_services.forecast_service.forecast_service import ForecastService

BERLIN = ZoneInfo("Europe/Berlin")

def get_datetime(year: int, month: int, day: int, hour: int, minute: int, tzinfo = BERLIN) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo = tzinfo)

BLOCKS = {
    get_datetime(2026, 3, 5, 10, 0): 200.0,
    get_datetime(2026, 3, 5, 11, 0): 300.0,
    get_datetime(2026, 3, 5, 12, 0): 400.0,
    get_datetime(2026, 3, 5, 13, 0): 100.0
}

class FakeForecastCache(Cache):
    def __init__(self, blocks: dict[datetime, float]):
        self._blocks = blocks

    def get_blocks(self):
        return self._blocks.copy()

def test_get_total_production_of_full_hour():
    service = ForecastService(cache = FakeForecastCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 0)
    end = get_datetime(2026, 3, 5, 13, 0)

    assert abs(service.get_total_production(start, end) - 400.0) < 0.001

def test_get_production_inside_hour():
    service = ForecastService(cache = FakeForecastCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 0)
    end = get_datetime(2026, 3, 5, 12, 30)

    assert abs(service.get_total_production(start, end) - 200.0) < 0.001

def test_get_total_production_across_hour():
    service = ForecastService(cache = FakeForecastCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 12, 40)
    end = get_datetime(2026, 3, 5, 13, 30)

    assert abs(service.get_total_production(start, end) - 183.3333) < 0.001

def test_get_total_production_across_hours():
    service = ForecastService(cache = FakeForecastCache(BLOCKS))

    start = get_datetime(2026, 3, 5, 10, 30)
    end = get_datetime(2026, 3, 5, 13, 30)

    assert abs(service.get_total_production(start, end) - 850.0) < 0.001

def test_get_prognoses():
    service = ForecastService(cache = FakeForecastCache(BLOCKS))

    timestamps = [
        get_datetime(2026, 3, 5, 10, 0),
        get_datetime(2026, 3, 5, 11, 0),
        get_datetime(2026, 3, 5, 12, 0),
    ]
    end = get_datetime(2026, 3, 5, 13, 0)

    prognoses = service.get_prognoses(timestamps, end)

    assert len(prognoses) == 3
    assert abs(float(prognoses[0].get_value()) - 200.0) < 0.001
    assert abs(float(prognoses[1].get_value()) - 300.0) < 0.001
    assert abs(float(prognoses[2].get_value()) - 400.0) < 0.001