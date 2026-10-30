from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import AppointmentStatus, BillStatus
from app.models.appointment import Appointment
from app.models.billing import Bill, Payment
from app.models.user import User
from app.schemas.reports import (
    AppointmentReportOut,
    BillingReportOut,
    ReportSummaryOut,
)
from app.services.appointment_service import appointments_query_for_user
from app.services.billing_service import bills_query_for_user

router = APIRouter(prefix="/reports", tags=["reports"])


def _decimal_or_zero(value: Decimal | None) -> Decimal:
    return value if value is not None else Decimal("0")


@router.get("/summary", response_model=ReportSummaryOut)
def summary(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.REPORT_VIEW)),
) -> ReportSummaryOut:
    if to_date < from_date:
        raise HTTPException(422, "to must be on or after from")
    starts_at = datetime.combine(from_date, time.min)
    ends_at = datetime.combine(to_date + timedelta(days=1), time.min)

    appointments = appointments_query_for_user(db, current).filter(
        Appointment.start_time >= starts_at, Appointment.start_time < ends_at
    )
    counts = {
        item.value: appointments.filter(Appointment.status == item).count()
        for item in AppointmentStatus
    }

    period_bills = bills_query_for_user(db, current).filter(
        Bill.created_at >= starts_at,
        Bill.created_at < ends_at,
        Bill.status != BillStatus.VOID,
    )
    issued_total = _decimal_or_zero(
        period_bills.with_entities(func.sum(Bill.total_amount)).scalar()
    )
    outstanding_total = _decimal_or_zero(
        period_bills.with_entities(func.sum(Bill.total_amount - Bill.amount_paid)).scalar()
    )
    visible_bill_ids = bills_query_for_user(db, current).with_entities(Bill.id)
    collected_total = _decimal_or_zero(
        db.query(func.sum(Payment.amount))
        .filter(
            Payment.bill_id.in_(visible_bill_ids),
            Payment.received_at >= starts_at,
            Payment.received_at < ends_at,
        )
        .scalar()
    )
    return ReportSummaryOut(
        from_date=from_date,
        to_date=to_date,
        appointments=AppointmentReportOut(
            scheduled=counts[AppointmentStatus.SCHEDULED.value],
            completed=counts[AppointmentStatus.COMPLETED.value],
            cancelled=counts[AppointmentStatus.CANCELLED.value],
            no_show=counts[AppointmentStatus.NO_SHOW.value],
        ),
        billing=BillingReportOut(
            issued_total=issued_total,
            collected_total=collected_total,
            outstanding_total=max(Decimal("0"), outstanding_total),
        ),
    )
