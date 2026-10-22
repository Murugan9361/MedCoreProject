from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_id: int
    hospital_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    method: Optional[str]
    path: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
