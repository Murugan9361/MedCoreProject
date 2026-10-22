from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.enums import Role
from app.models.doctor_patient import DoctorPatient
from app.models.user import User
from app.services.audit_service import log_action


def user_hospital_id(user: User) -> Optional[int]:
    if user.staff_profile is not None:
        return user.staff_profile.hospital_id
    if user.profile is not None:
        return user.profile.hospital_id
    return None


def patient_in_scope(db: Session, viewer: User, patient: User) -> bool:
    if patient.role != Role.PATIENT:
        return False
    if viewer.role == Role.SUPER_ADMIN:
        return True
    if viewer.role in (Role.ADMIN, Role.ATTENDER):
        viewer_hospital = user_hospital_id(viewer)
        return (
            viewer_hospital is not None
            and user_hospital_id(patient) == viewer_hospital
        )
    if viewer.role == Role.DOCTOR:
        return (
            db.query(DoctorPatient.id)
            .filter(
                DoctorPatient.doctor_id == viewer.id,
                DoctorPatient.patient_id == patient.id,
            )
            .first()
            is not None
        )
    return viewer.role == Role.PATIENT and viewer.id == patient.id


def get_patient_for_user(
    db: Session,
    viewer: User,
    patient_id: int,
    request: Optional[Request] = None,
    action: str = "patient.view",
    log_success: bool = True,
) -> User:
    patient = db.get(User, patient_id)
    if patient is None or not patient_in_scope(db, viewer, patient):
        log_action(
            db,
            viewer,
            f"{action}_denied",
            "patient",
            patient_id,
            hospital_id=user_hospital_id(patient) if patient is not None else None,
            request=request,
        )
        raise HTTPException(status_code=404, detail="Patient not found")
    if log_success and viewer.id != patient.id:
        log_action(
            db,
            viewer,
            action,
            "patient",
            patient.id,
            hospital_id=user_hospital_id(patient),
            request=request,
        )
    return patient
