from pydantic import BaseModel, Field, field_validator

from app.core.validators import validate_password
from app.enums import Role


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: Role
    must_change_password: bool


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12)

    _validate_new_password = field_validator("new_password")(validate_password)
