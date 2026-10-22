from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password,
)
from app.enums import Role
from app.models.user import User
from app.schemas.user import LoginRequest, PatientOut, PatientRegister, UserOut
from app.services.patient_service import create_patient_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )
    token = create_access_token(user.id, user.role.value)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "must_change_password": user.must_change_password,
    }


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/register-patient", response_model=PatientOut, status_code=201)
def register_patient(data: PatientRegister, db: Session = Depends(get_db)):
    return create_patient_user(db, data)
