"""Database initialization and schema sync utility for MedCore.

Supports both MySQL and PostgreSQL.
Creates missing tables and ensures all columns exist.
"""

from sqlalchemy import inspect, text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
import app.main  # Ensures all models are registered on Base.metadata


def init_db() -> None:
    print(f"Connecting to database using: {engine.url.drivername} at {engine.url.host}:{engine.url.port or 'default'}")
    
    # 1. First, check if users table exists and if token_version is missing
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"Existing tables: {existing_tables}")

    with engine.begin() as conn:
        if "users" in existing_tables:
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "token_version" not in columns:
                print("Adding missing column 'token_version' to 'users' table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0"))
                print("Added 'token_version' column.")

        if "patient_profiles" in existing_tables:
            columns = [c["name"] for c in inspector.get_columns("patient_profiles")]
            if "hospital_id" not in columns:
                print("Adding missing column 'hospital_id' to 'patient_profiles' table...")
                conn.execute(text("ALTER TABLE patient_profiles ADD COLUMN hospital_id INT NULL"))
                print("Added 'hospital_id' column.")

    # 2. Create any missing tables (e.g. refresh_tokens, bills, bill_items, payments, etc.)
    print("Creating any missing tables via Base.metadata.create_all()...")
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    updated_tables = inspector.get_table_names()
    print(f"All database tables now present: {updated_tables}")
    print("Database initialization successful!")


if __name__ == "__main__":
    init_db()

