-- Baseline schema for a new MedCore PostgreSQL database.
-- Apply files in this directory in filename order using the deploy account.

BEGIN;

DO $$ BEGIN CREATE TYPE role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ATTENDER', 'PATIENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gender AS ENUM ('MALE', 'FEMALE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maritalstatus AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'LONG_TERM_PARTNERSHIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE bloodtype AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shift AS ENUM ('MORNING', 'EVENING', 'NIGHT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointmentstatus AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    role role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NULL REFERENCES users(id),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    token_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    employee_id VARCHAR NOT NULL UNIQUE,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender NOT NULL,
    street VARCHAR NOT NULL,
    street2 VARCHAR NULL,
    city VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    designation VARCHAR NOT NULL,
    department VARCHAR NULL,
    date_of_joining DATE NOT NULL,
    emergency_contact_name VARCHAR NOT NULL,
    emergency_contact_phone VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_staff_profiles_id ON staff_profiles(id);

CREATE TABLE IF NOT EXISTS doctor_details (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    specialization VARCHAR NOT NULL,
    qualification VARCHAR NOT NULL,
    registration_number VARCHAR NOT NULL UNIQUE,
    years_of_experience INTEGER NOT NULL,
    consultation_fee NUMERIC(10, 2) NULL,
    languages_spoken VARCHAR NULL,
    bio TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_doctor_details_id ON doctor_details(id);

CREATE TABLE IF NOT EXISTS attender_details (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    doctor_id INTEGER NULL REFERENCES users(id),
    shift shift NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_attender_details_id ON attender_details(id);

CREATE TABLE IF NOT EXISTS patient_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    hospital_id INTEGER NULL REFERENCES hospitals(id),
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    filler_first_name VARCHAR NULL,
    filler_last_name VARCHAR NULL,
    phone VARCHAR NOT NULL,
    street VARCHAR NOT NULL,
    street2 VARCHAR NULL,
    city VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    date_of_birth DATE NOT NULL,
    place_of_birth VARCHAR NOT NULL,
    gender gender NOT NULL,
    marital_status maritalstatus NOT NULL,
    health_change_trigger TEXT NOT NULL,
    blood_type bloodtype NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_patient_profiles_id ON patient_profiles(id);
CREATE INDEX IF NOT EXISTS ix_patient_profiles_hospital_id ON patient_profiles(hospital_id);

CREATE TABLE IF NOT EXISTS doctor_patient (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    assigned_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (doctor_id, patient_id)
);
CREATE INDEX IF NOT EXISTS ix_doctor_patient_id ON doctor_patient(id);
CREATE INDEX IF NOT EXISTS ix_doctor_patient_doctor_id ON doctor_patient(doctor_id);
CREATE INDEX IF NOT EXISTS ix_doctor_patient_patient_id ON doctor_patient(patient_id);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status appointmentstatus NOT NULL DEFAULT 'SCHEDULED',
    reason TEXT NULL,
    cancel_reason TEXT NULL,
    booked_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_appointments_id ON appointments(id);
CREATE INDEX IF NOT EXISTS ix_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS ix_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_start_time ON appointments(start_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_slot
    ON appointments(doctor_id, start_time) WHERE status = 'SCHEDULED';

CREATE TABLE IF NOT EXISTS consultation_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    appointment_id INTEGER NULL REFERENCES appointments(id),
    note TEXT NOT NULL,
    diagnosis TEXT NULL,
    prescription JSON NULL,
    advice TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_consultation_records_id ON consultation_records(id);
CREATE INDEX IF NOT EXISTS ix_consultation_records_patient_id ON consultation_records(patient_id);
CREATE INDEX IF NOT EXISTS ix_consultation_records_hospital_id ON consultation_records(hospital_id);
CREATE INDEX IF NOT EXISTS ix_consultation_records_created_at ON consultation_records(created_at);

CREATE TABLE IF NOT EXISTS lab_files (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    appointment_id INTEGER NULL REFERENCES appointments(id),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    original_name VARCHAR NOT NULL,
    stored_name VARCHAR NOT NULL UNIQUE,
    content_type VARCHAR NOT NULL,
    size_bytes INTEGER NOT NULL,
    description VARCHAR NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_lab_files_id ON lab_files(id);
CREATE INDEX IF NOT EXISTS ix_lab_files_patient_id ON lab_files(patient_id);
CREATE INDEX IF NOT EXISTS ix_lab_files_hospital_id ON lab_files(hospital_id);
CREATE INDEX IF NOT EXISTS ix_lab_files_created_at ON lab_files(created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    hospital_id INTEGER NULL REFERENCES hospitals(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NULL,
    method VARCHAR(10) NULL,
    path VARCHAR(500) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_id ON audit_logs(id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);

COMMIT;
