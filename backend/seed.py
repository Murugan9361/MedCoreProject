from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.enums import Role
from app.models.hospital import Hospital
from app.models import (
    attender_details,
    doctor_details,
    doctor_patient,
    patient_profile,
    staff_profile,
)
from app.models.user import User

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    if not db.query(Hospital).first():
        db.add(Hospital(name="MedCore Hospital"))
        db.commit()

    existing = db.query(User).filter(User.role == Role.SUPER_ADMIN).first()
    if existing:
        print("Super admin already exists")
    else:
        db.add(
            User(
                full_name="Super Admin",
                email="superadmin@medcore.com",
                hashed_password=hash_password("ChangeMe@123"),
                role=Role.SUPER_ADMIN,
            )
        )
        db.commit()
        print("Super admin created")
