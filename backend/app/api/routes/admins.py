from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.user import User
from app.schemas.staff import AdminCreate, AdminOut
from app.services.staff_service import create_staff_user

router = APIRouter(prefix="/admins", tags=["admins"])


@router.post("", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def create_admin(
    data: AdminCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.ADMIN_CREATE)),
) -> User:
    return create_staff_user(db, current, Role.ADMIN, data, request=request)
