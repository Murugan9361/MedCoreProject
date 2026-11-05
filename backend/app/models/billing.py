from datetime import date, datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.enums import BillStatus, PaymentMethod, PaymentStatus


class Bill(Base):
    __tablename__ = "bills"
    __table_args__ = (
        CheckConstraint("amount_paid <= total_amount", name="ck_bills_paid_not_over_total"),
    )

    id = Column(Integer, primary_key=True)
    number = Column(String(40), unique=True, nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, unique=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(
        Enum(BillStatus, native_enum=False, length=32),
        nullable=False,
        default=BillStatus.ISSUED,
        index=True,
    )
    currency = Column(String(3), nullable=False, default="INR")
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    due_date = Column(Date, nullable=True, index=True)
    notes = Column(Text, nullable=True)
    issued_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    patient = relationship("User", foreign_keys=[patient_id])
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
    items = relationship(
        "BillItem", back_populates="bill", cascade="all, delete-orphan", order_by="BillItem.id"
    )
    payments = relationship("Payment", back_populates="bill", order_by="Payment.id")

    @property
    def patient_name(self) -> str:
        return self.patient.full_name if self.patient else "Patient"

    @property
    def doctor_name(self) -> str | None:
        if self.appointment and self.appointment.doctor:
            return self.appointment.doctor.full_name
        return None

    @property
    def doctor_id(self) -> int | None:
        if self.appointment:
            return self.appointment.doctor_id
        return None


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(Integer, primary_key=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    service_code = Column(String(64), nullable=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_amount = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False)

    bill = relationship("Bill", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False, index=True)
    received_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    receipt_number = Column(String(40), unique=True, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(Enum(PaymentMethod, native_enum=False, length=32), nullable=False)
    status = Column(
        Enum(PaymentStatus, native_enum=False, length=32),
        nullable=False,
        default=PaymentStatus.SUCCEEDED,
    )
    reference = Column(String(100), unique=True, nullable=True)
    idempotency_key = Column(String(255), unique=True, nullable=False)
    note = Column(String(500), nullable=True)
    received_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    bill = relationship("Bill", back_populates="payments")
