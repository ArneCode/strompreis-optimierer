"""Database initialization and session management.

This module sets up the SQLAlchemy engine and session factory for the application.
It provides a centralized point for database configuration.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.base import Base

# 'echo=True' will log all SQL statements to your terminal (great for debugging)
engine = create_engine("sqlite:///database.db", echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This looks at all classes inheriting from 'Base' and creates tables in the .db file


def init_db():
    Base.metadata.create_all(engine)
