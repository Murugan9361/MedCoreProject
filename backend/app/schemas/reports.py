from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class AppointmentReportOut(BaseModel):
    scheduled: int
    completed: int
    cancelled: int
    no_show: int


class BillingReportOut(BaseModel):
    issued_total: Decimal
    collected_total: Decimal
    outstanding_total: Decimal


class ReportSummaryOut(BaseModel):
    from_date: date
    to_date: date
    appointments: AppointmentReportOut
    billing: BillingReportOut
