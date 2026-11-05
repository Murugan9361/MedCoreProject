from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import CREATABLE_ROLES, Role
from app.models.appointment import Appointment
from app.models.doctor_patient import DoctorPatient
from app.models.hospital import Hospital
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.user import (
    PatientCreate,
    PatientDirectoryOut,
    PatientOut,
    PatientProfileUpdate,
)
from app.services.access_service import get_patient_for_user, user_hospital_id
from app.services.audit_service import log_action
from app.services.patient_service import create_patient_user

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/me", response_model=PatientOut)
def get_my_profile(current: User = Depends(get_current_user)) -> User:
    if current.role != Role.PATIENT or current.profile is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return current


@router.patch("/me", response_model=PatientOut)
def update_my_profile(
    data: PatientProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.PATIENT_PROFILE_UPDATE)),
) -> User:
    if current.role != Role.PATIENT or current.profile is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current.profile, field, value)
    db.commit()
    db.refresh(current)
    log_action(
        db,
        current,
        "patient.profile_update",
        "patient",
        current.id,
        hospital_id=current.profile.hospital_id,
        request=request,
    )
    return current


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    data: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.PATIENT_CREATE)),
) -> User:
    if Role.PATIENT not in CREATABLE_ROLES[current.role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"A {current.role.value} cannot create a patient",
        )

    doctor_id = current.id if current.role == Role.DOCTOR else data.doctor_id

    if doctor_id is not None:
        doctor = db.get(User, doctor_id)
        if (
            not doctor
            or doctor.role != Role.DOCTOR
            or not doctor.is_active
            or doctor.staff_profile is None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="doctor_id must be an active doctor",
            )
        if current.role != Role.SUPER_ADMIN:
            creator_hospital = (
                current.staff_profile.hospital_id if current.staff_profile else None
            )
            doctor_hospital = (
                doctor.staff_profile.hospital_id if doctor.staff_profile else None
            )
            if creator_hospital is not None and doctor_hospital is not None and creator_hospital != doctor_hospital:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Doctor must be in your hospital",
                )
        hospital_id = doctor.staff_profile.hospital_id
    elif current.role in (Role.ADMIN, Role.ATTENDER):
        hospital_id = user_hospital_id(current)
        if hospital_id is None:
            raise HTTPException(
                status_code=403,
                detail="You can only add patients to your own hospital",
            )
    elif current.role == Role.SUPER_ADMIN:
        hospital_id = data.hospital_id
    else:
        hospital_id = None
    if hospital_id is not None and db.get(Hospital, hospital_id) is None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    patient = create_patient_user(
        db,
        data,
        creator=current,
        doctor_id=doctor_id,
        hospital_id=hospital_id,
    )
    log_action(
        db,
        current,
        "patient.create",
        "patient",
        patient.id,
        hospital_id=hospital_id,
        request=request,
    )
    return patient


@router.get("", response_model=list[PatientDirectoryOut])
def list_patients(
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(
        require_permission(Permission.PATIENT_DIRECTORY_VIEW)
    ),
) -> list[User]:
    query = db.query(User).join(PatientProfile, PatientProfile.user_id == User.id)
    query = query.filter(User.role == Role.PATIENT)
    if current.role == Role.DOCTOR:
        doctor_hospital = user_hospital_id(current)
        assigned_ids = db.query(DoctorPatient.patient_id).filter(DoctorPatient.doctor_id == current.id)
        apt_patient_ids = db.query(Appointment.patient_id).filter(Appointment.doctor_id == current.id)
        query = query.filter(
            or_(
                User.id.in_(assigned_ids),
                User.id.in_(apt_patient_ids),
                PatientProfile.hospital_id == doctor_hospital,
            )
        )
    elif current.role in (Role.ADMIN, Role.ATTENDER):
        hospital_id = user_hospital_id(current)
        if hospital_id is None:
            return []
        query = query.filter(PatientProfile.hospital_id == hospital_id)
    patients = query.order_by(User.id).all()
    for patient in patients:
        log_action(
            db,
            current,
            "patient.list",
            "patient",
            patient.id,
            hospital_id=patient.profile.hospital_id if patient.profile else None,
            request=request,
        )
    return patients


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient_endpoint(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.PATIENT_DIRECTORY_VIEW)),
) -> User:
    return get_patient_for_user(db, current, patient_id, request=request)
