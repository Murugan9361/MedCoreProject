from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.doctor_details import DoctorDetails
from app.models.patient_profile import PatientProfile
from app.models.staff_profile import StaffProfile
from app.models.user import User
from app.schemas.directory import DirectoryUserOut, RoleListOut
from app.services.access_service import user_hospital_id

router = APIRouter(prefix="/directory", tags=["directory"])


@router.get("/roles", response_model=RoleListOut)
def available_roles(
    current: User = Depends(require_permission(Permission.ROLE_DIRECTORY_VIEW)),
) -> RoleListOut:
    return RoleListOut(roles=list(Role))


@router.get("/users", response_model=list[DirectoryUserOut])
def list_role_directory(
    role: Optional[Role] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.ROLE_DIRECTORY_VIEW)),
) -> list[DirectoryUserOut]:
    query = db.query(User).options(
        joinedload(User.staff_profile),
        joinedload(User.profile),
        joinedload(User.doctor_details),
    )
    if role is not None:
        query = query.filter(User.role == role)
    if current.role != Role.SUPER_ADMIN:
        hospital_id = user_hospital_id(current)
        if hospital_id is None:
            return []
        query = (
            query.outerjoin(StaffProfile, StaffProfile.user_id == User.id)
            .outerjoin(PatientProfile, PatientProfile.user_id == User.id)
            .filter(
                or_(
                    StaffProfile.hospital_id == hospital_id,
                    PatientProfile.hospital_id == hospital_id,
                )
            )
        )
    users = query.order_by(User.role, User.full_name).offset(offset).limit(limit).all()
    return [
        DirectoryUserOut(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            hospital_id=user_hospital_id(user),
            department=user.staff_profile.department if user.staff_profile else None,
            designation=user.staff_profile.designation if user.staff_profile else None,
            specialization=(
                user.doctor_details.specialization if user.doctor_details else None
            ),
            phone=(
                user.staff_profile.phone
                if user.staff_profile
                else (user.profile.phone if user.profile else None)
            ),
        )
        for user in users
    ]
