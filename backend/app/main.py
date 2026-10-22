from fastapi import FastAPI

from app.models import (
    attender_details,
    appointment,
    audit_log,
    consultation_record,
    doctor_details,
    doctor_patient,
    hospital,
    lab_file,
    patient_profile,
    staff_profile,
    user,
)

from app.api.routes import (
    admins,
    appointments,
    audit,
    attenders,
    auth,
    doctors,
    hospitals,
    patients,
    records,
    users,
)
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MedCore")
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admins.router)
app.include_router(doctors.router)
app.include_router(attenders.router)
app.include_router(patients.router)
app.include_router(hospitals.router)
app.include_router(audit.router)
app.include_router(appointments.router)
app.include_router(records.router)
app.include_router(records.files_router)
