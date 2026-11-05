from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session

from app.enums import BillStatus, PaymentStatus, Role
from app.models.appointment import Appointment
from app.models.billing import Bill, BillItem, Payment
from app.models.doctor_patient import DoctorPatient
from app.models.hospital import Hospital
from app.models.user import User
from app.schemas.billing import BillCreate, PaymentCreate
from app.services.access_service import patient_in_scope, user_hospital_id
from app.services.audit_service import log_action

MONEY = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def bills_query_for_user(db: Session, viewer: User) -> Query:
    query = db.query(Bill)
    if viewer.role == Role.SUPER_ADMIN:
        return query
    if viewer.role in (Role.ADMIN, Role.ATTENDER):
        return query.filter(Bill.hospital_id == user_hospital_id(viewer))
    if viewer.role == Role.PATIENT:
        return query.filter(Bill.patient_id == viewer.id)

    # Role.DOCTOR: assigned patients, appointment patients, or hospital bills
    assigned_patients = db.query(DoctorPatient.patient_id).filter(
        DoctorPatient.doctor_id == viewer.id
    )
    apt_patients = db.query(Appointment.patient_id).filter(
        Appointment.doctor_id == viewer.id
    )
    doc_hospital = user_hospital_id(viewer)
    return query.filter(
        or_(
            Bill.patient_id.in_(assigned_patients),
            Bill.patient_id.in_(apt_patients),
            Bill.hospital_id == doc_hospital,
        )
    )


def get_bill_for_user(db: Session, viewer: User, bill_id: int) -> Bill:
    bill = bills_query_for_user(db, viewer).filter(Bill.id == bill_id).first()
    if bill is None:
        raise HTTPException(404, "Bill not found")
    return bill


def get_bill_for_payment(db: Session, viewer: User, bill_id: int) -> Bill:
    """Lock the bill row so two concurrent payments cannot over-collect."""
    bill = (
        bills_query_for_user(db, viewer)
        .filter(Bill.id == bill_id)
        .with_for_update()
        .first()
    )
    if bill is None:
        raise HTTPException(404, "Bill not found")
    return bill


def create_bill(
    db: Session,
    current: User,
    patient: User,
    data: BillCreate,
    request: Request | None = None,
) -> Bill:
    if not patient_in_scope(db, current, patient):
        raise HTTPException(404, "Patient not found")
    
    hospital_id = user_hospital_id(patient) or user_hospital_id(current)

    if data.appointment_id is not None:
        appointment = db.get(Appointment, data.appointment_id)
        if appointment is not None and hospital_id is None:
            hospital_id = appointment.hospital_id
        if (
            appointment is None
            or appointment.patient_id != patient.id
            or (hospital_id is not None and appointment.hospital_id != hospital_id)
            or (current.role == Role.DOCTOR and appointment.doctor_id != current.id)
            or (current.role == Role.PATIENT and appointment.patient_id != current.id)
        ):
            raise HTTPException(400, "appointment_id does not match this patient")
        if hospital_id is None:
            hospital_id = appointment.hospital_id

    if hospital_id is None:
        first_hosp = db.query(Hospital).first()
        hospital_id = first_hosp.id if first_hosp else 1

    if patient.profile is not None and patient.profile.hospital_id is None:
        patient.profile.hospital_id = hospital_id

    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    calculated_items: list[tuple[object, Decimal]] = []
    for item in data.items:
        before_tax = money(item.quantity * item.unit_amount)
        item_tax = money(before_tax * item.tax_rate / Decimal("100"))
        subtotal += before_tax
        tax_amount += item_tax
        calculated_items.append((item, money(before_tax + item_tax)))
    subtotal = money(subtotal)
    tax_amount = money(tax_amount)
    discount = money(data.discount_amount)
    total = money(subtotal + tax_amount - discount)
    if total < 0:
        raise HTTPException(422, "Discount cannot exceed the bill total")

    bill = Bill(
        number=f"MC-{datetime.now(timezone.utc):%Y%m%d}-{uuid4().hex[:10].upper()}",
        hospital_id=hospital_id,
        patient_id=patient.id,
        appointment_id=data.appointment_id,
        created_by=current.id,
        status=BillStatus.ISSUED,
        currency=data.currency,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total_amount=total,
        amount_paid=Decimal("0"),
        due_date=data.due_date,
        notes=data.notes,
        issued_at=datetime.now(timezone.utc),
    )
    try:
        db.add(bill)
        db.flush()
        for item, line_total in calculated_items:
            db.add(
                BillItem(
                    bill_id=bill.id,
                    description=item.description,
                    service_code=item.service_code,
                    quantity=item.quantity,
                    unit_amount=item.unit_amount,
                    tax_rate=item.tax_rate,
                    line_total=line_total,
                )
            )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if data.appointment_id is not None:
            raise HTTPException(409, "This appointment already has a bill") from exc
        raise HTTPException(409, "Could not create bill") from exc
    db.refresh(bill)
    log_action(
        db,
        current,
        "bill.create",
        "bill",
        bill.id,
        hospital_id=bill.hospital_id,
        request=request,
    )
    return bill


def void_bill(
    db: Session, current: User, bill: Bill, request: Request | None = None
) -> Bill:
    if bill.status == BillStatus.VOID:
        raise HTTPException(400, "Bill is already void")
    if bill.amount_paid > 0:
        raise HTTPException(400, "A bill with payments cannot be voided")
    bill.status = BillStatus.VOID
    db.commit()
    db.refresh(bill)
    log_action(
        db,
        current,
        "bill.void",
        "bill",
        bill.id,
        hospital_id=bill.hospital_id,
        request=request,
    )
    return bill


def record_payment(
    db: Session,
    current: User,
    bill: Bill,
    data: PaymentCreate,
    idempotency_key: str,
    request: Request | None = None,
) -> Payment:
    existing = (
        db.query(Payment).filter(Payment.idempotency_key == idempotency_key).first()
    )
    if existing is not None:
        if existing.bill_id != bill.id:
            raise HTTPException(409, "Idempotency key was already used")
        return existing
    if bill.status in (BillStatus.DRAFT, BillStatus.VOID):
        raise HTTPException(400, "Payments cannot be recorded against this bill")
    remaining = money(bill.total_amount - bill.amount_paid)
    amount = money(data.amount)
    if amount > remaining:
        raise HTTPException(422, "Payment exceeds the outstanding balance")
    payment = Payment(
        bill_id=bill.id,
        received_by=current.id,
        receipt_number=f"TMP-{uuid4().hex}",
        amount=amount,
        method=data.method,
        status=PaymentStatus.SUCCEEDED,
        reference=data.reference,
        idempotency_key=idempotency_key,
        note=data.note,
    )
    try:
        db.add(payment)
        db.flush()
        payment.receipt_number = f"MCP-{payment.id:08d}"
        bill.amount_paid = money(bill.amount_paid + amount)
        bill.status = (
            BillStatus.PAID
            if bill.amount_paid == bill.total_amount
            else BillStatus.PARTIALLY_PAID
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Payment reference already exists") from exc
    db.refresh(payment)
    log_action(
        db,
        current,
        "payment.record",
        "payment",
        payment.id,
        hospital_id=bill.hospital_id,
        request=request,
    )
    return payment
