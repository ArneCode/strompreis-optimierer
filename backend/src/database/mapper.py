"""Custom SQLAlchemy type mappers.

This module provides custom `TypeDecorator` implementations to map application-specific
unit types (e.g., Watt, Euro) to standard SQL types (e.g., Float). This allows
the application to work with strong types while ensuring correct persistence
in the database. It also includes a mapper for timezone-aware datetimes.
"""
from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, TypeDecorator
from electricity_price_optimizer_py.units import Watt, WattHour, Euro, EuroPerWh


class WattMapper(TypeDecorator):
    impl = Float
    cache_ok = True

    def process_bind_param(self, value: Watt | None, dialect):
        if value is not None:
            return value.get_value()
        return None

    def process_result_value(self, value: float | None, dialect):
        if value is not None:
            return Watt(value)
        return None


class WattHourMapper(TypeDecorator):
    impl = Float
    cache_ok = True

    def process_bind_param(self, value: WattHour | None, dialect):
        if value is not None:
            return value.get_value()
        return None

    def process_result_value(self, value: float | None, dialect):
        if value is not None:
            return WattHour(value)
        return None


class EuroMapper(TypeDecorator):
    impl = Float
    cache_ok = True

    def process_bind_param(self, value: Euro | None, dialect):
        if value is not None:
            return value.get_value()
        return None

    def process_result_value(self, value: float | None, dialect):
        if value is not None:
            return Euro(value)
        return None


class EuroPerWhMapper(TypeDecorator):
    impl = Float
    cache_ok = True

    def process_bind_param(self, value: EuroPerWh | None, dialect):
        if value is not None:
            return value.get_value()
        return None

    def process_result_value(self, value: float | None, dialect):
        if value is not None:
            return EuroPerWh(value)
        return None


class TimezoneAwareDateMapper(TypeDecorator):
    """Results returned from the DB will always be UTC-aware."""
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value: datetime, dialect):
        if value is not None and value.tzinfo is None:
            # Assume UTC if the DB returns a naive datetime
            return value.replace(tzinfo=timezone.utc)
        return value

    def process_bind_param(self, value: datetime, dialect):
        if value is not None and value.tzinfo is not None:
            # Convert to UTC before saving to keep the DB clean
            return value.astimezone(timezone.utc)
        return value
