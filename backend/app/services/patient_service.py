from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.enums import Role
from app.models.doctor_patient import DoctorPatient
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.schemas.user import PatientRegister


def create_patient_user(
    db: Session,
    data: PatientRegister,
    creator: Optional[User] = None,
    doctor_id: Optional[int] = None,
    hospital_id: Optional[int] = None,
) -> User:
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        full_name=f"{data.first_name} {data.last_name}",
        email=data.email,
        hashed_password=hash_password(data.password),
        role=Role.PATIENT,
        created_by=creator.id if creator else None,
        must_change_password=creator is not None,
    )
    user.profile = PatientProfile(
        hospital_id=hospital_id,
        **data.model_dump(
            exclude={"email", "password", "doctor_id", "hospital_id"}
        ),
    )
    db.add(user)
    db.flush()

    try:
        if doctor_id is not None:
            db.add(DoctorPatient(doctor_id=doctor_id, patient_id=user.id))
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(user)
    return user
