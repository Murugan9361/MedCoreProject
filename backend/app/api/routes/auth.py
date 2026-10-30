from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    token_digest,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import PasswordChangeRequest, RefreshRequest, TokenPairOut
from app.schemas.user import LoginRequest, PatientOut, PatientRegister, UserOut
from app.services.access_service import user_hospital_id
from app.services.audit_service import log_action
from app.services.patient_service import create_patient_user

router = APIRouter(prefix="/auth", tags=["authentication"])


def _issue_token_pair(db: Session, user: User) -> TokenPairOut:
    access_token = create_access_token(user.id, user.role.value, user.token_version)
    refresh_token, expires_at = create_refresh_token(
        user.id, user.role.value, user.token_version
    )
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_digest(refresh_token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return TokenPairOut(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        must_change_password=user.must_change_password,
    )


def _refresh_payload(token: str) -> dict[str, object]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
        if payload.get("typ") != "refresh":
            raise JWTError("Not a refresh token")
        int(payload["sub"])
        int(payload["ver"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from None
    return payload


def _as_utc(value: datetime) -> datetime:
    """SQLite returns naive datetimes in tests; PostgreSQL returns aware ones."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


@router.post("/login", response_model=TokenPairOut)
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenPairOut:
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
    result = _issue_token_pair(db, user)
    log_action(
        db,
        user,
        "auth.login",
        "user",
        user.id,
        hospital_id=user_hospital_id(user),
        request=request,
    )
    return result


@router.post("/refresh", response_model=TokenPairOut)
def refresh_tokens(data: RefreshRequest, db: Session = Depends(get_db)) -> TokenPairOut:
    payload = _refresh_payload(data.refresh_token)
    user_id = int(payload["sub"])
    token_version = int(payload["ver"])
    token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_digest(data.refresh_token))
        .with_for_update()
        .first()
    )
    user = db.get(User, user_id)
    now = datetime.now(timezone.utc)
    if (
        token is None
        or token.user_id != user_id
        or token.revoked_at is not None
        or _as_utc(token.expires_at) < now
        or user is None
        or not user.is_active
        or user.token_version != token_version
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )
    token.revoked_at = now
    try:
        result = _issue_token_pair(db, user)
    except Exception:
        db.rollback()
        raise
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    """Revoke every session for the current user, including access tokens."""
    now = datetime.now(timezone.utc)
    current.token_version += 1
    (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == current.id, RefreshToken.revoked_at.is_(None))
        .update({RefreshToken.revoked_at: now}, synchronize_session=False)
    )
    db.commit()
    log_action(
        db,
        current,
        "auth.logout_all",
        "user",
        current.id,
        hospital_id=user_hospital_id(current),
        request=request,
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    if not verify_password(data.current_password, current.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if verify_password(data.new_password, current.hashed_password):
        raise HTTPException(
            status_code=400, detail="New password must differ from the current password"
        )
    now = datetime.now(timezone.utc)
    current.hashed_password = hash_password(data.new_password)
    current.must_change_password = False
    current.token_version += 1
    (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == current.id, RefreshToken.revoked_at.is_(None))
        .update({RefreshToken.revoked_at: now}, synchronize_session=False)
    )
    db.commit()
    log_action(
        db,
        current,
        "auth.password_changed",
        "user",
        current.id,
        hospital_id=user_hospital_id(current),
        request=request,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/register-patient", response_model=PatientOut, status_code=201)
def register_patient(data: PatientRegister, db: Session = Depends(get_db)) -> User:
    return create_patient_user(db, data)
