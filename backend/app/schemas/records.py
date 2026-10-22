from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PrescriptionItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=100)
    instructions: Optional[str] = Field(default=None, max_length=500)


class RecordCreate(BaseModel):
    appointment_id: Optional[int] = None
    note: str = Field(min_length=1, max_length=10000)
    diagnosis: Optional[str] = Field(default=None, max_length=2000)
    prescription: Optional[list[PrescriptionItem]] = Field(
        default=None, max_length=50
    )
    advice: Optional[str] = Field(default=None, max_length=2000)


class RecordOut(BaseModel):
    id: int
    patient_id: int
    appointment_id: Optional[int]
    author_id: int
    author_name: str
    note: str
    diagnosis: Optional[str]
    prescription: Optional[list[PrescriptionItem]]
    advice: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class LabFileOut(BaseModel):
    id: int
    patient_id: int
    appointment_id: Optional[int]
    uploaded_by: int
    original_name: str
    content_type: str
    size_bytes: int
    description: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
