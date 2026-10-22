from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.permissions import Permission, has_permission
from app.core.security import hash_password
from app.enums import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services.audit_service import log_action

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_my_users(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[User]:
    return db.query(User).filter(User.created_by == current.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    if data.role in (Role.ADMIN, Role.DOCTOR):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /admins or POST /doctors",
        )
    if data.role != Role.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the role-specific creation endpoint",
        )
    if not has_permission(current.role, Permission.SUPER_ADMIN_CREATE):
        log_action(
            db,
            current,
            "super_admin_create_denied",
            "user",
            None,
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a super admin can create a super admin",
        )
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=Role.SUPER_ADMIN,
        created_by=current.id,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(
        db,
        current,
        "staff.create",
        Role.SUPER_ADMIN.value,
        user.id,
        request=request,
    )
    return user
