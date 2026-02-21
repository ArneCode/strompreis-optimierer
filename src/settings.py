from datetime import datetime, timedelta
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Interval
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


class SimulatedAnnealingSettings(Base):
    """Settings for the simulated annealing optimization algorithm. 
    Only one instance of this class should exist in the database."""
    __tablename__ = "simulated_annealing_settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    initial_temperature: Mapped[float] = mapped_column(default=40.0)
    cooling_rate: Mapped[float] = mapped_column(default=0.95)
    final_temperature: Mapped[float] = mapped_column(default=0.1)
    constant_action_move_factor: Mapped[float] = mapped_column(default=30.0)
    num_moves_per_step: Mapped[int] = mapped_column(default=2)

    # ensure only one instance exists in the db
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row_only"),
    )
