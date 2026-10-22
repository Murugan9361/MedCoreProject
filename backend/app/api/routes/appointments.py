from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import AppointmentStatus
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    CancelRequest,
    RescheduleRequest,
    StatusUpdate,
)
from app.services.appointment_service import (
    appointments_query_for_user,
    book_appointment,
    cancel_appointment,
    get_appointment_for_user,
    reschedule_appointment,
    set_appointment_status,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _day_range(query, day: date):
    start = datetime.combine(day, time.min)
    return query.filter(
        Appointment.start_time >= start,
        Appointment.start_time < start + timedelta(days=1),
    )


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    data: AppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_MANAGE)),
) -> Appointment:
    return book_appointment(db, current, data, request)


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    on_date: Optional[date] = Query(None, alias="date"),
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    appt_status: Optional[AppointmentStatus] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_VIEW)),
) -> list[Appointment]:
    query = appointments_query_for_user(db, current)
    if on_date is not None:
        query = _day_range(query, on_date)
    if doctor_id is not None:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if patient_id is not None:
        query = query.filter(Appointment.patient_id == patient_id)
    if appt_status is not None:
        query = query.filter(Appointment.status == appt_status)
    return (
        query.order_by(Appointment.start_time)
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/today", response_model=list[AppointmentOut])
def todays_clinic(
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_VIEW)),
) -> list[Appointment]:
    query = _day_range(
        appointments_query_for_user(db, current),
        date.today(),
    ).filter(Appointment.status != AppointmentStatus.CANCELLED)
    if doctor_id is not None:
        query = query.filter(Appointment.doctor_id == doctor_id)
    return query.order_by(Appointment.start_time).all()


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_VIEW)),
) -> Appointment:
    return get_appointment_for_user(db, current, appointment_id)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(
    appointment_id: int,
    data: RescheduleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_MANAGE)),
) -> Appointment:
    return reschedule_appointment(db, current, appointment_id, data.start_time, request)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(
    appointment_id: int,
    request: Request,
    data: CancelRequest = CancelRequest(),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_MANAGE)),
) -> Appointment:
    return cancel_appointment(db, current, appointment_id, data.reason, request)


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: int,
    data: StatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.APPOINTMENT_MANAGE)),
) -> Appointment:
    return set_appointment_status(db, current, appointment_id, data.status, request)
