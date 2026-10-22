from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.hospital import Hospital
from app.models.user import User
from app.schemas.hospital import HospitalCreate, HospitalOut
from app.services.access_service import user_hospital_id
from app.services.audit_service import log_action

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("", response_model=list[HospitalOut])
def list_hospitals(
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.HOSPITAL_VIEW)),
) -> list[Hospital]:
    query = db.query(Hospital)
    if current.role != Role.SUPER_ADMIN:
        hospital_id = user_hospital_id(current)
        if hospital_id is None:
            return []
        query = query.filter(Hospital.id == hospital_id)
    return query.order_by(Hospital.name).all()


@router.post("", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    data: HospitalCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.HOSPITAL_MANAGE)),
) -> Hospital:
    if db.query(Hospital).filter(Hospital.name == data.name).first():
        raise HTTPException(status_code=400, detail="Hospital already exists")
    hospital = Hospital(name=data.name)
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    log_action(
        db,
        current,
        "hospital.create",
        "hospital",
        hospital.id,
        hospital_id=hospital.id,
        request=request,
    )
    return hospital
