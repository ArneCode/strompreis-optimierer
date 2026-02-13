from abc import ABC, abstractmethod
from datetime import datetime

class PriceServicePort(ABC):
    """
    Port for all price services.
    """
    @abstractmethod
    def get_average_price(self, start: datetime, end: datetime) -> float:
        """ Returns the average price of a time period between start and end."""
        pass