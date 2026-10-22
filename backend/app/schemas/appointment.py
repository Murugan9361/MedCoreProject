from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.enums import AppointmentStatus


def _no_timezone(value: datetime) -> datetime:
    if value.tzinfo is not None:
        raise ValueError(
            "Send local clinic time without a timezone, e.g. 2026-10-19T10:00:00"
        )
    return value


class AppointmentCreate(BaseModel):
    doctor_id: int
    start_time: datetime
    reason: Optional[str] = Field(default=None, max_length=500)
    patient_id: Optional[int] = None

    @field_validator("start_time")
    @classmethod
    def check_time(cls, value: datetime) -> datetime:
        return _no_timezone(value)


class RescheduleRequest(BaseModel):
    start_time: datetime

    @field_validator("start_time")
    @classmethod
    def check_time(cls, value: datetime) -> datetime:
        return _no_timezone(value)


class CancelRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


class StatusUpdate(BaseModel):
    status: AppointmentStatus

    @field_validator("status")
    @classmethod
    def only_closing_statuses(
        cls, value: AppointmentStatus
    ) -> AppointmentStatus:
        if value not in (AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW):
            raise ValueError("Status must be completed or no_show")
        return value


class AppointmentOut(BaseModel):
    id: int
    hospital_id: int
    doctor_id: int
    doctor_name: str
    patient_id: int
    patient_name: str
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    reason: Optional[str]
    cancel_reason: Optional[str]
    booked_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
