"""Create the initial hospital and super-admin after migrations have run.

This command is intentionally explicit: it never contains a usable default
administrator password and it does not create a schema.
"""

import os

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.enums import Role
from app.models.hospital import Hospital
from app.models.user import User


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"{name} must be set before bootstrapping an administrator")
    return value


def main() -> None:
    email = required_env("BOOTSTRAP_SUPER_ADMIN_EMAIL").strip().lower()
    password = required_env("BOOTSTRAP_SUPER_ADMIN_PASSWORD")
    if len(password) < 12:
        raise SystemExit("BOOTSTRAP_SUPER_ADMIN_PASSWORD must be at least 12 characters")
    hospital_name = os.environ.get("BOOTSTRAP_HOSPITAL_NAME", "MedCore Hospital").strip()
    if not hospital_name:
        raise SystemExit("BOOTSTRAP_HOSPITAL_NAME cannot be empty")

    with SessionLocal() as db:
        hospital = db.query(Hospital).filter(Hospital.name == hospital_name).first()
        if hospital is None:
            hospital = Hospital(name=hospital_name)
            db.add(hospital)
        if db.query(User).filter(User.email == email).first() is not None:
            db.rollback()
            print("Bootstrap user already exists; no changes made.")
            return
        db.add(
            User(
                full_name="Super Admin",
                email=email,
                hashed_password=hash_password(password),
                role=Role.SUPER_ADMIN,
                must_change_password=True,
            )
        )
        db.commit()
    print("Bootstrap super-admin created; change the password on first login.")


if __name__ == "__main__":
    main()
