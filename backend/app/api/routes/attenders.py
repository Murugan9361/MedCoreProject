from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.attender_details import AttenderDetails
from app.models.user import User
from app.schemas.staff import AttenderCreate, AttenderExtra, AttenderOut
from app.services.staff_service import create_staff_user

router = APIRouter(prefix="/attenders", tags=["attenders"])


@router.post("", response_model=AttenderOut, status_code=status.HTTP_201_CREATED)
def create_attender(
    data: AttenderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.ATTENDER_CREATE)),
) -> User:
    if current.role == Role.DOCTOR:
        data.doctor_id = current.id
        if data.hospital_id is None and current.staff_profile:
            data.hospital_id = current.staff_profile.hospital_id
    elif current.role == Role.ADMIN:
        if data.hospital_id is None and current.staff_profile:
            data.hospital_id = current.staff_profile.hospital_id
    elif current.role == Role.SUPER_ADMIN and data.hospital_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hospital_id is required",
        )

    def add_details(session: Session, user: User) -> None:
        if data.doctor_id is not None:
            doctor = session.get(User, data.doctor_id)
            same_hospital = (
                doctor is not None
                and doctor.staff_profile is not None
                and doctor.staff_profile.hospital_id == data.hospital_id
            )
            if not doctor or doctor.role != Role.DOCTOR or not same_hospital:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="doctor_id must be a doctor in the same hospital",
                )
        session.add(
            AttenderDetails(
                user_id=user.id,
                **data.model_dump(include=set(AttenderExtra.model_fields)),
            )
        )

    return create_staff_user(
        db,
        current,
        Role.ATTENDER,
        data,
        extra=add_details,
        request=request,
    )
