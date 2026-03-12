from datetime import datetime
from abc import ABC, abstractmethod

class Cache(ABC):
    @abstractmethod
    def get_blocks(self) -> dict[datetime, float]:
        """
        Returns blocks mapped from datetime to a float value.
        :return: a dictionary with the blocks
        """
        pass