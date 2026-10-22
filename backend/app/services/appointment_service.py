from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session

from app.core.clinic import CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES, WORKING_DAYS
from app.enums import AppointmentStatus, Role
from app.models.appointment import Appointment
from app.models.doctor_patient import DoctorPatient
from app.models.user import User
from app.schemas.appointment import AppointmentCreate
from app.services.access_service import patient_in_scope, user_hospital_id
from app.services.audit_service import log_action

SCHEDULED = AppointmentStatus.SCHEDULED


def validate_slot(start: datetime) -> None:
    if start <= datetime.now():
        raise HTTPException(400, "Appointment must be in the future")
    if start.weekday() not in WORKING_DAYS:
        raise HTTPException(400, "The clinic is closed on that day")
    if (
        start.second != 0
        or start.microsecond != 0
        or start.minute % SLOT_MINUTES != 0
    ):
        raise HTTPException(
            400,
            f"Start time must be on a {SLOT_MINUTES}-minute slot, e.g. 10:00 or 10:30",
        )
    opens = start.replace(hour=OPEN_HOUR, minute=0, second=0, microsecond=0)
    closes = start.replace(hour=CLOSE_HOUR, minute=0, second=0, microsecond=0)
    if start < opens or start + timedelta(minutes=SLOT_MINUTES) > closes:
        raise HTTPException(
            400, f"Clinic hours are {OPEN_HOUR:02d}:00 to {CLOSE_HOUR:02d}:00"
        )


def check_conflicts(
    db: Session,
    doctor_id: int,
    patient_id: int,
    start: datetime,
    exclude_id: Optional[int] = None,
) -> None:
    query = db.query(Appointment).filter(
        Appointment.start_time == start,
        Appointment.status == SCHEDULED,
    )
    if exclude_id is not None:
        query = query.filter(Appointment.id != exclude_id)
    if query.filter(Appointment.doctor_id == doctor_id).first():
        raise HTTPException(409, "That slot is already booked")
    if query.filter(Appointment.patient_id == patient_id).first():
        raise HTTPException(409, "The patient already has an appointment at this time")


def free_slots(db: Session, doctor_id: int, day: date) -> list[str]:
    if day.weekday() not in WORKING_DAYS:
        return []
    day_start = datetime.combine(day, time.min)
    booked = {
        appointment.start_time
        for appointment in db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == SCHEDULED,
            Appointment.start_time >= day_start,
            Appointment.start_time < day_start + timedelta(days=1),
        )
    }
    now = datetime.now()
    current = datetime.combine(day, time(OPEN_HOUR))
    closing = datetime.combine(day, time(CLOSE_HOUR))
    slots = []
    while current + timedelta(minutes=SLOT_MINUTES) <= closing:
        if current > now and current not in booked:
            slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=SLOT_MINUTES)
    return slots


def appointment_in_scope(viewer: User, appointment: Appointment) -> bool:
    if viewer.role == Role.SUPER_ADMIN:
        return True
    if viewer.role in (Role.ADMIN, Role.ATTENDER):
        return (
            user_hospital_id(viewer) is not None
            and appointment.hospital_id == user_hospital_id(viewer)
        )
    if viewer.role == Role.DOCTOR:
        return appointment.doctor_id == viewer.id
    if viewer.role == Role.PATIENT:
        return appointment.patient_id == viewer.id
    return False


def get_appointment_for_user(
    db: Session, viewer: User, appointment_id: int
) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or not appointment_in_scope(viewer, appointment):
        raise HTTPException(404, "Appointment not found")
    return appointment


def appointments_query_for_user(db: Session, viewer: User) -> Query:
    query = db.query(Appointment)
    if viewer.role == Role.SUPER_ADMIN:
        return query
    if viewer.role in (Role.ADMIN, Role.ATTENDER):
        hospital_id = user_hospital_id(viewer)
        return query.filter(Appointment.hospital_id == hospital_id)
    if viewer.role == Role.DOCTOR:
        return query.filter(Appointment.doctor_id == viewer.id)
    return query.filter(Appointment.patient_id == viewer.id)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That slot was just booked by someone else") from None


def _audit(
    db: Session,
    user: User,
    action: str,
    appointment: Appointment,
    request: Optional[Request],
) -> None:
    if user.role != Role.PATIENT:
        log_action(
            db,
            user,
            action,
            "appointment",
            appointment.id,
            hospital_id=appointment.hospital_id,
            request=request,
        )


def book_appointment(
    db: Session,
    current: User,
    data: AppointmentCreate,
    request: Optional[Request] = None,
) -> Appointment:
    if current.role == Role.PATIENT:
        if data.patient_id not in (None, current.id):
            raise HTTPException(403, "Patients can only book for themselves")
        patient_id = current.id
    else:
        if data.patient_id is None:
            raise HTTPException(400, "patient_id is required")
        patient_id = data.patient_id

    patient = db.get(User, patient_id)
    if patient is None or not patient_in_scope(db, current, patient):
        raise HTTPException(404, "Patient not found")
    doctor = db.get(User, data.doctor_id)
    if (
        doctor is None
        or doctor.role != Role.DOCTOR
        or not doctor.is_active
        or doctor.staff_profile is None
    ):
        raise HTTPException(404, "Doctor not found")
    doctor_hospital_id = doctor.staff_profile.hospital_id
    patient_hospital_id = user_hospital_id(patient)
    if patient_hospital_id is not None and doctor_hospital_id != patient_hospital_id:
        raise HTTPException(404, "Doctor not found")
    if current.role == Role.DOCTOR and doctor.id != current.id:
        raise HTTPException(403, "Doctors can only book appointments for themselves")
    if current.role in (Role.ADMIN, Role.ATTENDER):
        if user_hospital_id(current) != doctor_hospital_id:
            raise HTTPException(404, "Doctor not found")

    validate_slot(data.start_time)
    check_conflicts(db, doctor.id, patient.id, data.start_time)

    appointment = Appointment(
        hospital_id=doctor_hospital_id,
        doctor_id=doctor.id,
        patient_id=patient.id,
        start_time=data.start_time,
        end_time=data.start_time + timedelta(minutes=SLOT_MINUTES),
        status=SCHEDULED,
        reason=data.reason,
        booked_by=current.id,
    )
    db.add(appointment)
    if patient.profile is not None and patient.profile.hospital_id is None:
        patient.profile.hospital_id = doctor_hospital_id

    linked = (
        db.query(DoctorPatient)
        .filter(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient.id,
        )
        .first()
    )
    if linked is None:
        db.add(DoctorPatient(doctor_id=doctor.id, patient_id=patient.id))

    _commit(db)
    db.refresh(appointment)
    _audit(db, current, "appointment.create", appointment, request)
    return appointment


def reschedule_appointment(
    db: Session,
    current: User,
    appointment_id: int,
    new_start: datetime,
    request: Optional[Request] = None,
) -> Appointment:
    appointment = get_appointment_for_user(db, current, appointment_id)
    if appointment.status != SCHEDULED:
        raise HTTPException(400, "Only scheduled appointments can be rescheduled")
    validate_slot(new_start)
    check_conflicts(
        db,
        appointment.doctor_id,
        appointment.patient_id,
        new_start,
        exclude_id=appointment.id,
    )
    appointment.start_time = new_start
    appointment.end_time = new_start + timedelta(minutes=SLOT_MINUTES)
    _commit(db)
    db.refresh(appointment)
    _audit(db, current, "appointment.reschedule", appointment, request)
    return appointment


def cancel_appointment(
    db: Session,
    current: User,
    appointment_id: int,
    reason: Optional[str],
    request: Optional[Request] = None,
) -> Appointment:
    appointment = get_appointment_for_user(db, current, appointment_id)
    if appointment.status != SCHEDULED:
        raise HTTPException(400, "Only scheduled appointments can be cancelled")
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancel_reason = reason
    _commit(db)
    db.refresh(appointment)
    _audit(db, current, "appointment.cancel", appointment, request)
    return appointment


def set_appointment_status(
    db: Session,
    current: User,
    appointment_id: int,
    new_status: AppointmentStatus,
    request: Optional[Request] = None,
) -> Appointment:
    if current.role == Role.PATIENT:
        raise HTTPException(403, "Not enough permissions")
    appointment = get_appointment_for_user(db, current, appointment_id)
    if appointment.status != SCHEDULED:
        raise HTTPException(400, "Only scheduled appointments can be closed")
    appointment.status = new_status
    _commit(db)
    db.refresh(appointment)
    _audit(
        db,
        current,
        f"appointment.{new_status.value}",
        appointment,
        request,
    )
    return appointment
