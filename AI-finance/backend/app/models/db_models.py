"""SQLAlchemy ORM entities for portfolio assets and future extensions."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Float, Integer, String, Text

from app.core.database import Base


class Asset(Base):
	"""Tracked financial asset for wealth portfolio."""

	__tablename__ = "assets"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	asset_type = Column(String(120), nullable=False)
	purchase_value = Column(Float, nullable=False, default=0.0)
	current_value = Column(Float, nullable=False, default=0.0)
	purchase_date = Column(Date, nullable=False, default=date.today)
	location = Column(String(255), nullable=True)
	notes = Column(Text, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FamilyMember(Base):
	"""Family member record for household budgeting."""

	__tablename__ = "family_members"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	role = Column(String(120), nullable=False)
	monthly_income = Column(Float, default=0.0, nullable=False)
	monthly_expense = Column(Float, default=0.0, nullable=False)
	savings = Column(Float, default=0.0, nullable=False)
	contribution = Column(Float, default=0.0, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
