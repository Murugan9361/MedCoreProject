from typing import Optional

from pydantic import BaseModel

from app.enums import Role


class DirectoryUserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: Role
    is_active: bool
    hospital_id: Optional[int]
    department: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None


class RoleListOut(BaseModel):
    roles: list[Role]
