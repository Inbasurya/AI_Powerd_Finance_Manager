"""Financial calendar events endpoints."""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Financial Calendar"])


class CalendarEvent(BaseModel):
    """Scheduled financial event."""

    id: int
    title: str
    event_type: str
    amount: Optional[float] = Field(default=None, description="Payment amount if applicable")
    due_date: date
    status: str = Field(default="upcoming")
    notes: Optional[str] = None


SAMPLE_EVENTS: list[CalendarEvent] = [
    CalendarEvent(id=1, title="Credit Card Bill", event_type="credit_card_bill", amount=1800, due_date=date.today().replace(day=18), status="upcoming"),
    CalendarEvent(id=2, title="Insurance Premium", event_type="insurance_premium", amount=3200, due_date=date.today().replace(day=5), status="upcoming"),
    CalendarEvent(id=3, title="SIP Investment", event_type="sip_investment", amount=2500, due_date=date.today().replace(day=10), status="upcoming"),
    CalendarEvent(id=4, title="Home Loan EMI", event_type="loan_emi", amount=14500, due_date=date.today().replace(day=2), status="paid"),
    CalendarEvent(id=5, title="Budget Review", event_type="budget_review", amount=None, due_date=date.today().replace(day=27), status="upcoming", notes="Review spending and savings rate."),
]


@router.get("/calendar/events", response_model=List[CalendarEvent])
def list_events() -> List[CalendarEvent]:
    """Return monthly financial events for dashboard calendar widget."""

    return SAMPLE_EVENTS
