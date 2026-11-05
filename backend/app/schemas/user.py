import re
from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.core.validators import validate_password
from app.enums import BloodType, Gender, MaritalStatus, Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=12)
    role: Role

    _validate_password = field_validator("password")(validate_password)

class PatientRegister(BaseModel):
    # name
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)

    # person filling out the form (only if not the patient)
    filler_first_name: Optional[str] = None
    filler_last_name: Optional[str] = None

    # login
    email: EmailStr
    password: str = Field(min_length=12)

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

    _validate_password = field_validator("password")(validate_password)

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


class PatientProfileUpdate(BaseModel):
    phone: Optional[str] = None
    street: Optional[str] = Field(default=None, min_length=1)
    street2: Optional[str] = None
    city: Optional[str] = Field(default=None, min_length=1)
    state: Optional[str] = Field(default=None, min_length=1)
    postal_code: Optional[str] = Field(default=None, min_length=1)
    health_change_trigger: Optional[str] = Field(default=None, min_length=1)
    blood_type: Optional[BloodType] = None
    marital_status: Optional[MaritalStatus] = None

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        digits = re.sub(r"\D", "", value)
        if len(digits) != 10:
            raise ValueError("Phone must have 10 digits")
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"


class PatientProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    hospital_id: Optional[int] = None
    first_name: str
    last_name: str
    filler_first_name: Optional[str] = None
    filler_last_name: Optional[str] = None
    phone: str
    street: str
    street2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    date_of_birth: date
    place_of_birth: str
    gender: Gender
    marital_status: MaritalStatus
    health_change_trigger: str
    blood_type: BloodType


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: Role
    is_active: bool
    profile: Optional[PatientProfileOut] = None


class PatientDirectoryProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    hospital_id: Optional[int] = None
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date
    gender: Gender
    blood_type: Optional[BloodType] = None


class PatientDirectoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    profile: Optional[PatientDirectoryProfileOut] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: Role
    is_active: bool
    must_change_password: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    consultation_fee: Optional[float] = None
    hospital_id: Optional[int] = None
