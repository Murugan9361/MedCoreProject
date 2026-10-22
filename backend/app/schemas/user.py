import re
from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ConfigDict, EmailStr
from app.enums import Role, Gender, MaritalStatus, BloodType
from app.enums import Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role

class PatientRegister(BaseModel):
    # name
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)

    # person filling out the form (only if not the patient)
    filler_first_name: Optional[str] = None
    filler_last_name: Optional[str] = None

    # login
    email: EmailStr
    password: str = Field(min_length=8)

    # contact
    phone: str
    street: str
    street2: Optional[str] = None
    city: str
    state: str
    postal_code: str

    # personal
    date_of_birth: date
    place_of_birth: str
    gender: Gender
    marital_status: MaritalStatus

    # health
    health_change_trigger: str
    blood_type: BloodType

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone must have 10 digits, e.g. (000) 000-0000")
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError("Date of birth must be in the past")
        return v

    @model_validator(mode="after")
    def validate_filler(self):
        if bool(self.filler_first_name) != bool(self.filler_last_name):
            raise ValueError("Provide both filler first name and last name, or neither")
        return self


class PatientCreate(PatientRegister):
    doctor_id: Optional[int] = None
    hospital_id: Optional[int] = None


class PatientProfileOut(BaseModel):
    first_name: str
    last_name: str
    filler_first_name: Optional[str]
    filler_last_name: Optional[str]
    phone: str
    street: str
    street2: Optional[str]
    city: str
    state: str
    postal_code: str
    date_of_birth: date
    place_of_birth: str
    gender: Gender
    marital_status: MaritalStatus
    health_change_trigger: str
    blood_type: BloodType

    class Config:
        from_attributes = True

class PatientOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    is_active: bool
    profile: PatientProfileOut

    class Config:
        from_attributes = True


class PatientDirectoryProfileOut(BaseModel):
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date
    gender: Gender

    model_config = ConfigDict(from_attributes=True)


class PatientDirectoryOut(BaseModel):
    id: int
    email: EmailStr
    profile: PatientDirectoryProfileOut

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: Role
    is_active: bool
