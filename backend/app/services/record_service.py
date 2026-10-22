from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.enums import Role
from app.models.appointment import Appointment
from app.models.consultation_record import ConsultationRecord
from app.models.lab_file import LabFile
from app.models.user import User
from app.schemas.records import RecordCreate
from app.services.access_service import patient_in_scope, user_hospital_id
from app.services.audit_service import log_action


def check_appointment(
    db: Session,
    current: User,
    patient: User,
    appointment_id: Optional[int],
) -> None:
    if appointment_id is None:
        return
    appointment = db.get(Appointment, appointment_id)
    if (
        appointment is None
        or appointment.patient_id != patient.id
        or (
            current.role == Role.DOCTOR
            and appointment.doctor_id != current.id
        )
    ):
        raise HTTPException(400, "appointment_id does not match this patient")


def create_record(
    db: Session,
    current: User,
    patient: User,
    data: RecordCreate,
    request: Optional[Request] = None,
) -> ConsultationRecord:
    check_appointment(db, current, patient, data.appointment_id)
    hospital_id = user_hospital_id(patient)
    if hospital_id is None and current.role == Role.DOCTOR:
        hospital_id = user_hospital_id(current)
    if hospital_id is None:
        raise HTTPException(400, "Patient must belong to a hospital")
    record = ConsultationRecord(
        patient_id=patient.id,
        hospital_id=hospital_id,
        author_id=current.id,
        appointment_id=data.appointment_id,
        note=data.note,
        diagnosis=data.diagnosis,
        prescription=(
            [item.model_dump() for item in data.prescription]
            if data.prescription
            else None
        ),
        advice=data.advice,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    log_action(
        db,
        current,
        "record.create",
        "consultation_record",
        record.id,
        hospital_id=record.hospital_id,
        request=request,
    )
    return record


def get_lab_file_for_user(
    db: Session,
    viewer: User,
    file_id: int,
    request: Optional[Request] = None,
) -> LabFile:
    lab_file = db.get(LabFile, file_id)
    patient = db.get(User, lab_file.patient_id) if lab_file is not None else None
    if (
        lab_file is None
        or patient is None
        or not patient_in_scope(db, viewer, patient)
    ):
        log_action(
            db,
            viewer,
            "lab.download_denied",
            "lab_file",
            file_id,
            hospital_id=lab_file.hospital_id if lab_file is not None else None,
            request=request,
        )
        raise HTTPException(404, "File not found")
    if viewer.role != Role.PATIENT:
        log_action(
            db,
            viewer,
            "lab.download",
            "lab_file",
            lab_file.id,
            hospital_id=lab_file.hospital_id,
            request=request,
        )
    return lab_file
