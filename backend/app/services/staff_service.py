from collections.abc import Callable
from typing import Optional

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.enums import CREATABLE_ROLES, EMPLOYEE_PREFIX, Role
from app.models.hospital import Hospital
from app.models.staff_profile import StaffProfile
from app.models.user import User
from app.schemas.staff import StaffBase
from app.services.audit_service import log_action


def create_staff_user(
    db: Session,
    creator: User,
    role: Role,
    data: StaffBase,
    extra: Optional[Callable[[Session, User], None]] = None,
    request: Optional[Request] = None,
) -> User:
    if role not in CREATABLE_ROLES[creator.role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"A {creator.role.value} cannot create a {role.value}",
        )

    if creator.role != Role.SUPER_ADMIN:
        own_hospital = (
            creator.staff_profile.hospital_id if creator.staff_profile else None
        )
        if data.hospital_id != own_hospital:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add staff to your own hospital",
            )

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if not db.get(Hospital, data.hospital_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found",
        )

    user = User(
        full_name=f"{data.first_name} {data.last_name}",
        email=data.email,
        hashed_password=hash_password(data.password),
        role=role,
        created_by=creator.id,
        must_change_password=True,
    )
    try:
        db.add(user)
        db.flush()

        staff_fields = set(StaffBase.model_fields) - {"email", "password"}
        db.add(
            StaffProfile(
                user_id=user.id,
                employee_id=f"{EMPLOYEE_PREFIX[role]}-{user.id:04d}",
                **data.model_dump(include=staff_fields),
            )
        )

        if extra:
            extra(db, user)

        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    log_action(
        db,
        creator,
        "staff.create",
        role.value,
        user.id,
        hospital_id=data.hospital_id,
        request=request,
    )
    return user
