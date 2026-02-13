"""SQLAlchemy models for devices and actions.

Includes:
- Base Device with polymorphism via DeviceType
- Battery with capacity and rate constraints
- ConstantActionDevice and VariableActionDevice with related actions
- Generator hierarchy (e.g., PV)
"""
from datetime import datetime, timedelta
from sqlalchemy import DateTime, ForeignKey, Interval
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from electricity_price_optimizer_py.units import WattHour, Watt, Euro, EuroPerWh
from sqlalchemy import Enum, ForeignKey, String, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, declared_attr
from database.base import Base
import enum

from database.mapper import TimezoneAwareDateMapper, WattHourMapper, WattMapper, EuroMapper, EuroPerWhMapper


class DeviceType(enum.Enum):
    """Device type discriminator for polymorphic mapping."""
    BATTERY = "BATTERY"
    CONSTANT_ACTION_DEVICE = "CONSTANT_ACTION_DEVICE"
    VARIABLE_ACTION_DEVICE = "VARIABLE_ACTION_DEVICE"
    GENERATOR_PV = "GENERATOR_PV"


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

    # 1. The "one" side of the relationship
    # This will be a list of ConstantAction objects
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

    # 2. The "many" side of the relationship
    # This points back to the single parent device
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
        "polymorphic_identity": DeviceType.GENERATOR_PV,
    }
