"""Database engine and session management utilities."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import config


# SQLite needs ``check_same_thread`` disabled for use across FastAPI workers.
engine = create_engine(
	config.database_url,
	connect_args={"check_same_thread": False} if config.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models; imported by model modules.
Base = declarative_base()


def get_db() -> Generator:
	"""Yield a SQLAlchemy session per request and ensure cleanup."""
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def init_db() -> None:
	"""Create database tables if they do not exist."""
	# Import models to register metadata before ``create_all``.
	from app.models import db_models  # noqa: F401

	Base.metadata.create_all(bind=engine)
