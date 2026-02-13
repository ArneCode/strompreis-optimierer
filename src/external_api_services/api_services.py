from external_api_services.forecast_service.forecast_client import ForecastClient
from external_api_services.forecast_manager import ForecastManager

from external_api_services.price_service.price_service import PriceService
from external_api_services.price_service.price_cache import PriceCache

class ApiServices:
    def __init__(self) -> None:
        self.forecast_client = ForecastClient() # Ein Client für ALLE pv anlagen
        self.forecast_manager = ForecastManager(
            client=self.forecast_client,
            refresh_interval_s=15 * 60,
            future_hours=30,
            series_key="watt_hours_period",
        )

        # zentrale price api sachen
        self.price_cache = PriceCache()
        self.price_service = PriceService(cache=self.price_cache)

api_services = ApiServices()
