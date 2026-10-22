from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import ensure_past_date, normalize_phone
from app.enums import Gender, Role, Shift


class StaffBase(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str
    date_of_birth: date
    gender: Gender
    street: str
    street2: Optional[str] = None
    city: str
    state: str
    postal_code: str

    designation: str
    hospital_id: int
    department: Optional[str] = None
    date_of_joining: date

    emergency_contact_name: str
    emergency_contact_phone: str

    @field_validator("phone", "emergency_contact_phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, value: date) -> date:
        return ensure_past_date(value)


class AdminCreate(StaffBase):
    pass


class DoctorExtra(BaseModel):
    specialization: str = Field(min_length=1)
    qualification: str = Field(min_length=1)
    registration_number: str = Field(min_length=3)
    years_of_experience: int = Field(ge=0, le=70)
    consultation_fee: Optional[Decimal] = Field(default=None, ge=0)
    languages_spoken: Optional[str] = None
    bio: Optional[str] = None


class DoctorCreate(StaffBase, DoctorExtra):
    department: str = Field(min_length=1)


class StaffProfileOut(BaseModel):
    employee_id: str
    hospital_id: int
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date
    gender: Gender
    street: str
    street2: Optional[str]
    city: str
    state: str
    postal_code: str
    designation: str
    department: Optional[str]
    date_of_joining: date
    emergency_contact_name: str
    emergency_contact_phone: str

    class Config:
        from_attributes = True


class DoctorDetailsOut(BaseModel):
    specialization: str
    qualification: str
    registration_number: str
    years_of_experience: int
    consultation_fee: Optional[Decimal]
    languages_spoken: Optional[str]
    bio: Optional[str]

    class Config:
        from_attributes = True


class AdminOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    is_active: bool
    must_change_password: bool
    staff_profile: StaffProfileOut

    class Config:
        from_attributes = True


class DoctorOut(AdminOut):
    doctor_details: DoctorDetailsOut


class AttenderExtra(BaseModel):
    shift: Shift
    doctor_id: Optional[int] = None


class AttenderCreate(StaffBase, AttenderExtra):
    hospital_id: Optional[int] = None


class AttenderDetailsOut(BaseModel):
    shift: Shift
    doctor_id: Optional[int]

    class Config:
        from_attributes = True


class AttenderOut(AdminOut):
    attender_details: AttenderDetailsOut


class DoctorDirectoryOut(BaseModel):
    id: int
    name: str
    hospital_id: int
    specialization: str
    department: Optional[str]
    consultation_fee: Optional[Decimal]
    languages_spoken: Optional[str]
    bio: Optional[str]
