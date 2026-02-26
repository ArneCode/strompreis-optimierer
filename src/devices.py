"""SQLAlchemy models for devices and actions.

Includes:
- Base Device with polymorphism via DeviceType
- Battery with capacity and rate constraints
- ConstantActionDevice and VariableActionDevice with related actions
- Generator hierarchy (e.g., PV)
"""
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy import JSON, DateTime, ForeignKey, Interval
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from electricity_price_optimizer_py.units import WattHour, Watt, Euro, EuroPerWh
from sqlalchemy import Enum, ForeignKey, String, Integer, Float
from database.base import Base
import enum
import random
from noise import pnoise1

from database.mapper import TimezoneAwareDateMapper, WattHourMapper, WattMapper, EuroMapper, EuroPerWhMapper


class DeviceType(enum.Enum):
    """Device type discriminator for polymorphic mapping."""
    BATTERY = "BATTERY"
    CONSTANT_ACTION_DEVICE = "CONSTANT_ACTION_DEVICE"
    VARIABLE_ACTION_DEVICE = "VARIABLE_ACTION_DEVICE"
    GENERATOR_PV = "GENERATOR_PV"
    GENERATOR_RANDOM = "GENERATOR_RANDOM"
    GENERATOR_SCHEDULED = "GENERATOR_SCHEDULED"


class Device(Base):
    """Base device model with polymorphic identity."""
    __tablename__ = "device"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[DeviceType] = mapped_column(Enum(DeviceType), nullable=False)
    __mapper_args__ = {
        "polymorphic_on": "type"
    }


class Battery(Device):
    """Battery device with capacity, charge levels, and rate limits."""
    __tablename__ = "battery"
    id: Mapped[int] = mapped_column(ForeignKey(
        "device.id", ondelete="CASCADE"), primary_key=True)

    capacity: Mapped[WattHour] = mapped_column(WattHourMapper)
    current_charge: Mapped[WattHour] = mapped_column(WattHourMapper)
    max_charge_rate: Mapped[Watt] = mapped_column(WattMapper)
    max_discharge_rate: Mapped[Watt] = mapped_column(WattMapper)
    efficiency: Mapped[float] = mapped_column(Float)
    __mapper_args__ = {
        "polymorphic_identity": DeviceType.BATTERY,
    }


class ConstantActionDevice(Device):
    """Device holding constant actions as a one-to-many relationship."""
    __tablename__ = "constant_action_device"

    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )

    actions: Mapped[List["ConstantAction"]] = relationship(
        "ConstantAction",
        back_populates="device",
        cascade="all, delete-orphan"
    )

    __mapper_args__ = {
        "polymorphic_identity": DeviceType.CONSTANT_ACTION_DEVICE,
    }


class ConstantAction(Base):
    """Constant action definition with time window, duration, and consumption."""
    __tablename__ = "constant_action"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(
        ForeignKey("constant_action_device.id", ondelete="CASCADE")
    )

    device: Mapped["ConstantActionDevice"] = relationship(
        "ConstantActionDevice",
        back_populates="actions"
    )

    start_from: Mapped[datetime] = mapped_column(TimezoneAwareDateMapper)
    end_before: Mapped[datetime] = mapped_column(TimezoneAwareDateMapper)
    duration: Mapped[timedelta] = mapped_column(Interval)
    consumption: Mapped[Watt] = mapped_column(WattMapper)


class VariableActionDevice(Device):
    """Device holding variable actions as a one-to-many relationship."""
    __tablename__ = "variable_action_device"
    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )

    actions: Mapped[List["VariableAction"]] = relationship(
        "VariableAction",
        back_populates="device",
        cascade="all, delete-orphan"
    )

    __mapper_args__ = {
        "polymorphic_identity": DeviceType.VARIABLE_ACTION_DEVICE,
    }


class VariableAction(Base):
    """Variable action definition with window, total energy, and per-timestep max."""
    __tablename__ = "variable_action"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(
        ForeignKey("variable_action_device.id", ondelete="CASCADE")
    )

    device: Mapped["VariableActionDevice"] = relationship(
        "VariableActionDevice",
        back_populates="actions"
    )

    start: Mapped[datetime] = mapped_column(TimezoneAwareDateMapper)
    end: Mapped[datetime] = mapped_column(TimezoneAwareDateMapper)
    total_consumption: Mapped[WattHour] = mapped_column(WattHourMapper)
    max_consumption: Mapped[Watt] = mapped_column(WattMapper)


class Generator(Device):
    """Abstract base class for generator devices."""
    __abstract__ = True

    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )


class GeneratorPV(Generator):
    """Photovoltaic generator device (attributes TBD)."""
    __tablename__ = "generator_pv"
    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[String] = mapped_column(String, nullable=False)
    declination: Mapped[float] = mapped_column(Float, nullable=False)
    azimuth: Mapped[float] = mapped_column(Float, nullable=False)
    peak_power: Mapped[Watt] = mapped_column(WattMapper, nullable=False)

    """
    Todo: Add specific attributes for PV generators, e.g., max output, efficiency, etc.
    """
    __mapper_args__ = {
        "polymorphic_identity": DeviceType.GENERATOR_PV,
    }


class GeneratorRandom(Generator):
    """Random generator device (for testing)."""
    __tablename__ = "generator_random"
    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    peak_power: Mapped[Watt] = mapped_column(WattMapper, nullable=False)

    __mapper_args__ = {
        "polymorphic_identity": DeviceType.GENERATOR_RANDOM,
    }

    def __init__(self, seed: Optional[int], **kwargs):
        super().__init__(**kwargs)

        self.seed = seed if seed is not None else random.randint(0, int(65535))

    def new_random_seed(self):
        """Generate a new random seed for this generator."""
        self.seed = random.randint(0, int(65535))

    def get_generation(self, time: datetime) -> Watt:
        """Get the generation at a specific time with realistic variation."""
        # mit ki generiert
        # 1. Use a relative offset to keep the numbers small for the C-extension
        # We'll use seconds since Jan 1, 2025 as a reference point.
        reference_ts = 1735689600
        ts_offset = time.timestamp() - reference_ts

        # 2. Define a 'wavelength' (how fast the noise changes).
        # Let's say one full 'feature' of noise occurs every 12 hours.
        wavelength = 12 * 3600.0
        x = ts_offset / wavelength

        # 3. Use 'octaves' to add detail.
        # octaves=3 adds two smaller, faster waves on top of the main one.
        # persistence=0.5 means each smaller wave is half as strong as the previous.
        raw_noise: float = pnoise1(
            x,
            octaves=3,
            persistence=0.5,
            lacunarity=2.0,
            base=self.seed % 1024  # Keep seed small to avoid Segfaults
        )

        # 4. Scale from [-1, 1] to [0, 1]
        # We use a slight clip to ensure we don't get negative power
        noise_scaled = max(0, (raw_noise + 1) / 2)

        return noise_scaled * self.peak_power


class GeneratorScheduled(Generator):
    """Scheduled generator device with predefined generation profile."""
    __tablename__ = "generator_scheduled"
    id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"),
        primary_key=True
    )

    # For simplicity, we can store a JSON string of time-to-generation mappings
    # In a real implementation, this would likely be a separate table for efficiency
    schedule: Mapped[dict[str, float]] = mapped_column(JSON)

    __mapper_args__ = {
        "polymorphic_identity": DeviceType.GENERATOR_SCHEDULED,
    }

    def __init__(self, schedule: dict[time, Watt], **kwargs):
        super().__init__(**kwargs)
        # Convert time keys to string for JSON storage
        # check that 00:00 is included in the schedule
        assert any(t == time(0, 0) for t in schedule.keys()
                   ), "Schedule must include an entry for 00:00"
        self.schedule = {t.strftime("%H:%M"): g.get_value()
                         for t, g in schedule.items()}

    def _get_day_schedule(self, d: date) -> list[tuple[datetime, Watt]]:
        """
        Returns a sorted list of (datetime, value) for a specific date.
        Converts the internal "HH:MM" JSON strings into full datetime objects.
        """
        day_points = []
        for t_str, val in self.schedule.items():
            # Convert "HH:MM" -> time object -> datetime on date 'd'
            t_obj = datetime.strptime(t_str, "%H:%M").time()
            dt_obj = datetime.combine(d, t_obj)
            # use timezone-aware datetime (utc)
            dt_obj = dt_obj.replace(tzinfo=timezone.utc)
            day_points.append((dt_obj, Watt(val)))

        day_points.sort(key=lambda x: x[0])
        return day_points

    def get_generation(self, date_time: datetime) -> Watt:
        """Get the scheduled power generation at a specific time."""
        sorted_schedule = self._get_day_schedule(date_time.date())

        current_value = Watt(0)
        for dt, val in sorted_schedule:
            if date_time >= dt:
                current_value = val
            else:
                break
        return current_value

    def get_generation_between(self, t1: datetime, t2: datetime) -> WattHour:
        """Calculates energy between two datetimes, supporting multi-day spans."""
        if t1 >= t2:
            return WattHour(0)

        total_energy = WattHour(0)
        current_date = t1.date()

        # Iterate through every date involved in the range [t1, t2]
        while current_date <= t2.date():
            day_points = self._get_day_schedule(current_date)

            for i in range(len(day_points)):
                start_dt, val = day_points[i]

                # Determine when this specific segment ends
                if i + 1 < len(day_points):
                    next_dt = day_points[i + 1][0]
                else:
                    # End of the day segment goes to midnight of the next day
                    next_dt = datetime.combine(
                        current_date + timedelta(days=1), time(0, 0))
                    next_dt = next_dt.replace(tzinfo=timezone.utc)

                # Intersection of [start_dt, next_dt] and [t1, t2]
                overlap_start = max(start_dt, t1)
                overlap_end = min(next_dt, t2)

                if overlap_start < overlap_end:
                    duration = overlap_end - overlap_start
                    total_energy += val * duration

            current_date += timedelta(days=1)

        return total_energy
