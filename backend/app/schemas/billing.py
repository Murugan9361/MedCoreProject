from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import BillStatus, PaymentMethod, PaymentStatus


class BillItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    service_code: Optional[str] = Field(default=None, max_length=64)
    quantity: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    unit_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100, max_digits=5, decimal_places=2)


class BillCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    currency: str = Field(default="INR", min_length=3, max_length=3)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    due_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    items: list[BillItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        if not value.isalpha():
            raise ValueError("currency must be a three-letter ISO code")
        return value.upper()


class BillItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    service_code: Optional[str]
    quantity: Decimal
    unit_amount: Decimal
    tax_rate: Decimal
    line_total: Decimal


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    method: PaymentMethod
    reference: Optional[str] = Field(default=None, min_length=2, max_length=100)
    note: Optional[str] = Field(default=None, max_length=500)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_number: str
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    reference: Optional[str]
    note: Optional[str]
    received_at: datetime


class BillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    hospital_id: int
    patient_id: int
    patient_name: str
    appointment_id: Optional[int]
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    status: BillStatus
    currency: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    due_date: Optional[date]
    notes: Optional[str]
    issued_at: Optional[datetime]
    created_at: datetime
    items: list[BillItemOut]
    payments: list[PaymentOut]
