from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import Permission, has_permission
from app.models.user import User
from app.services.access_service import user_hospital_id
from app.services.audit_service import log_action

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
        user_id = int(payload["sub"])
        if payload.get("typ") != "access":
            raise JWTError("Not an access token")
        token_version = int(payload["ver"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None

    user = db.get(User, user_id)
    if not user or not user.is_active or user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def require_permission(permission: Permission):
    def check_permission(
        request: Request,
        current: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not has_permission(current.role, permission):
            entity_type = "permission"
            entity_id = None
            for parameter, resource in (
                ("patient_id", "patient"),
                ("file_id", "lab_file"),
                ("appointment_id", "appointment"),
                ("doctor_id", "user"),
            ):
                value = request.path_params.get(parameter)
                if value is not None:
                    entity_type = resource
                    entity_id = int(value) if value.isdecimal() else None
                    break
            log_action(
                db,
                current,
                f"{permission.value.replace('.', '_')}_denied",
                entity_type,
                entity_id,
                hospital_id=user_hospital_id(current),
                request=request,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        if current.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change is required before accessing this resource",
            )
        return current

    return check_permission
