from __future__ import annotations
import requests

FORECAST_SOLAR_BASE_URL = "https://api.forecast.solar"

class ForecastApiError(RuntimeError):
    pass

class ForecastClient:
    """
    Client makes HTTP requests to forecast.solar.
    """
    def __init__(self, base_url: str = FORECAST_SOLAR_BASE_URL, timeout_seconds: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._session = requests.Session()

    def fetch_estimate(
        self,
        *,
        latitude: float,
        longitude: float,
        declination: float,
        azimuth: float,
        kilowatt_peak: float,
        time_mode: str = "utc"
    ) -> dict:
        url = f"{self._base_url}/estimate/{latitude}/{longitude}/{declination}/{azimuth}/{kilowatt_peak}"
        try:
            resp = self._session.get(url, params={"time": time_mode}, timeout=self._timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as request_exception:
            raise ForecastApiError(f"forecast.solar request failed: {request_exception}") from request_exception