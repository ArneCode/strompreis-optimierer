# Created with AI Assistance
"""
Example FastAPI endpoint demonstrating a request for the electricity prices of the next 24 hours.

GET/price/next-24h:
- Returns 200 on success
- Returns 400 on failure
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from external_api_services.api_services import api_services

router = APIRouter(prefix="/api")

class TimeValue(BaseModel):
    dt: datetime
    value: float

class SeriesResponse(BaseModel):
    series: list[TimeValue]


@router.get("/prices/next-24h", response_model=SeriesResponse)
def get_prices_next_24h():
    price_map = api_services.price_service.get_hourly_prices_24h(datetime.now())
    series = [TimeValue(dt = dt, value = price) for dt, price in price_map.items()]
    return SeriesResponse(series = series)
