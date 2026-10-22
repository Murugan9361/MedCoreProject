from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def log_action(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: Optional[int],
    hospital_id: Optional[int] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id,
        hospital_id=hospital_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        method=request.method if request is not None else None,
        path=request.url.path if request is not None else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
