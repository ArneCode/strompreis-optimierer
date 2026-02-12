"""Example FastAPI endpoint demonstrating device deletion.

DELETE /devices/{device_id}:
- Uses DeviceManager dependency
- Returns 204 on success, 404 if not found
"""
# Created with AI assistance
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.dependencies import get_device_manager
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
