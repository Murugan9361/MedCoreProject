from typing import Optional

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.models.billing import Bill, Payment
from app.models.user import User
from app.schemas.billing import BillCreate, BillOut, PaymentCreate, PaymentOut
from app.services.access_service import get_patient_for_user
from app.services.billing_service import (
    bills_query_for_user,
    create_bill,
    get_bill_for_payment,
    get_bill_for_user,
    record_payment,
    void_bill,
)
from app.services.audit_service import log_action

router = APIRouter(prefix="/billing", tags=["billing"])


def _with_details(query):
    return query.options(joinedload(Bill.patient), joinedload(Bill.items), joinedload(Bill.payments))


@router.post("/bills", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def create_bill_endpoint(
    data: BillCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.BILLING_MANAGE)),
) -> Bill:
    patient = get_patient_for_user(
        db, current, data.patient_id, request, action="bill.patient_access", log_success=False
    )
    return create_bill(db, current, patient, data, request)


@router.get("/bills", response_model=list[BillOut])
def list_bills(
    patient_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.BILLING_VIEW)),
) -> list[Bill]:
    query = bills_query_for_user(db, current)
    if patient_id is not None:
        query = query.filter(Bill.patient_id == patient_id)
    return (
        _with_details(query)
        .order_by(Bill.created_at.desc(), Bill.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/bills/{bill_id}", response_model=BillOut)
def get_bill(
    bill_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.BILLING_VIEW)),
) -> Bill:
    bill = _with_details(bills_query_for_user(db, current)).filter(Bill.id == bill_id).first()
    if bill is None:
        return get_bill_for_user(db, current, bill_id)
    if current.role.value != "patient":
        log_action(db, current, "bill.view", "bill", bill.id, bill.hospital_id, request)
    return bill


@router.post("/bills/{bill_id}/void", response_model=BillOut)
def void_bill_endpoint(
    bill_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.BILLING_MANAGE)),
) -> Bill:
    return void_bill(db, current, get_bill_for_user(db, current, bill_id), request)


@router.post("/bills/{bill_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment_endpoint(
    bill_id: int,
    data: PaymentCreate,
    request: Request,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=255),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.PAYMENT_RECORD)),
) -> Payment:
    return record_payment(
        db,
        current,
        get_bill_for_payment(db, current, bill_id),
        data,
        idempotency_key,
        request,
    )
