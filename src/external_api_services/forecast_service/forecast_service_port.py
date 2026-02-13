from abc import ABC, abstractmethod
from datetime import datetime

class ForecastServicePort(ABC):
    """
    Port for all price services.
    """
    @abstractmethod
    def get_total_production(self, start: datetime, end: datetime) -> float:
        """ Returns the total production of a pv generator in a time period between start and end."""
        pass