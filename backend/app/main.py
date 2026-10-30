from sqlalchemy import text
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session

from app.models import (
    attender_details,
    appointment,
    audit_log,
    billing,
    consultation_record,
    doctor_details,
    doctor_patient,
    hospital,
    lab_file,
    patient_profile,
    refresh_token,
    staff_profile,
    user,
)

from app.api.routes import (
    admins,
    appointments,
    audit,
    attenders,
    auth,
    billing,
    directory,
    doctors,
    hospitals,
    patients,
    records,
    reports,
    users,
)
from app.core.config import settings
from app.core.database import get_db

app = FastAPI(title="MedCore", version="1.0.0")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS if settings.ENVIRONMENT == "production" else ["*"],
)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.get("/livez", tags=["health"])
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/healthz", tags=["health"])
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(directory.router)
app.include_router(admins.router)
app.include_router(doctors.router)
app.include_router(attenders.router)
app.include_router(patients.router)
app.include_router(hospitals.router)
app.include_router(audit.router)
app.include_router(appointments.router)
app.include_router(records.router)
app.include_router(records.files_router)
app.include_router(billing.router)
app.include_router(reports.router)
