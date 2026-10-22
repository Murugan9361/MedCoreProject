from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.doctor_details import DoctorDetails
from app.models.staff_profile import StaffProfile
from app.models.user import User
from app.schemas.staff import (
    DoctorCreate,
    DoctorDirectoryOut,
    DoctorExtra,
    DoctorOut,
)
from app.services.appointment_service import free_slots
from app.services.staff_service import create_staff_user

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.post("", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(
    data: DoctorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.DOCTOR_CREATE)),
) -> User:
    def add_details(session: Session, user: User) -> None:
        exists = (
            session.query(DoctorDetails)
            .filter(
                DoctorDetails.registration_number == data.registration_number
            )
            .first()
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration number already exists",
            )
        session.add(
            DoctorDetails(
                user_id=user.id,
                **data.model_dump(include=set(DoctorExtra.model_fields)),
            )
        )

    return create_staff_user(
        db,
        current,
        Role.DOCTOR,
        data,
        extra=add_details,
        request=request,
    )


@router.get("", response_model=list[DoctorDirectoryOut])
def doctor_directory(
    hospital_id: Optional[int] = None,
    specialization: Optional[str] = None,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.DOCTOR_DIRECTORY_VIEW)),
) -> list[DoctorDirectoryOut]:
    query = (
        db.query(User, StaffProfile, DoctorDetails)
        .join(StaffProfile, StaffProfile.user_id == User.id)
        .join(DoctorDetails, DoctorDetails.user_id == User.id)
        .filter(User.role == Role.DOCTOR, User.is_active.is_(True))
    )
    if current.role in (Role.ADMIN, Role.ATTENDER):
        own_hospital = (
            current.staff_profile.hospital_id
            if current.staff_profile is not None
            else None
        )
        query = query.filter(StaffProfile.hospital_id == own_hospital)
    elif current.role == Role.SUPER_ADMIN and hospital_id is not None:
        query = query.filter(StaffProfile.hospital_id == hospital_id)
    elif current.role == Role.PATIENT and current.profile is not None:
        if current.profile.hospital_id is not None:
            query = query.filter(
                StaffProfile.hospital_id == current.profile.hospital_id
            )
        elif hospital_id is not None:
            query = query.filter(StaffProfile.hospital_id == hospital_id)
    elif hospital_id is not None:
        query = query.filter(StaffProfile.hospital_id == hospital_id)
    if specialization:
        query = query.filter(DoctorDetails.specialization.ilike(f"%{specialization}%"))

    return [
        DoctorDirectoryOut(
            id=user.id,
            name=user.full_name,
            hospital_id=staff.hospital_id,
            specialization=details.specialization,
            department=staff.department,
            consultation_fee=details.consultation_fee,
            languages_spoken=details.languages_spoken,
            bio=details.bio,
        )
        for user, staff, details in query.order_by(User.full_name).all()
    ]


@router.get("/{doctor_id}/slots")
def doctor_slots(
    doctor_id: int,
    day: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.DOCTOR_DIRECTORY_VIEW)),
) -> dict[str, object]:
    doctor = db.get(User, doctor_id)
    if (
        doctor is None
        or doctor.role != Role.DOCTOR
        or not doctor.is_active
        or doctor.staff_profile is None
    ):
        raise HTTPException(status_code=404, detail="Doctor not found")
    if current.role in (Role.ADMIN, Role.ATTENDER):
        if current.staff_profile is not None:
            current_hospital_id = current.staff_profile.hospital_id
        else:
            current_hospital_id = None
        if doctor.staff_profile.hospital_id != current_hospital_id:
            raise HTTPException(status_code=404, detail="Doctor not found")
    elif current.role == Role.PATIENT and current.profile is not None:
        if (
            current.profile.hospital_id is not None
            and doctor.staff_profile.hospital_id != current.profile.hospital_id
        ):
            raise HTTPException(status_code=404, detail="Doctor not found")
    return {"doctor_id": doctor_id, "date": day, "slots": free_slots(db, doctor_id, day)}
