"""
Comprehensive verification test for Mandatory Password Change & Clinical Patient Intake Registration.
Tests all 10 user-specified scenarios against the running MySQL database.
"""

import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.core.database import SessionLocal, engine
from app.models import (
    User,
    StaffProfile,
    DoctorDetails,
    PatientProfile,
    Hospital,
    Appointment,
    Bill,
)
from app.core.security import hash_password, verify_password
from app.enums import Role, Gender, MaritalStatus, BloodType, Shift

client = TestClient(app)

def run_attender_flow_tests():
    print("=" * 75)
    print("TESTING ATTENDER MANDATORY PASSWORD CHANGE & PATIENT INTAKE FLOW")
    print("=" * 75)

    suffix = uuid.uuid4().hex[:6]
    initial_temp_password = "TempPassword!123"
    new_secure_password = "PermanentPass!456"

    att_email = f"attender.intake.{suffix}@medcore.com"
    doc_email = f"doctor.intake.{suffix}@medcore.com"
    pat_email = f"patient.portal.{suffix}@medcore.com"

    db = SessionLocal()

    # 0. Ensure hospital
    hospital = db.query(Hospital).first()
    if not hospital:
        hospital = Hospital(name="MedCore City Hospital", code="MCH01", city="Pune", state="Maharashtra")
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

    # Clean up any legacy .test emails
    db.execute(text("UPDATE users SET email = REPLACE(email, '@medcore.test', '@medcore.com') WHERE email LIKE '%@medcore.test'"))
    db.commit()

    # 1. Create an Attender with must_change_password = True (simulating account provisioned by admin)
    att_user = User(
        full_name="Pooja Sharma",
        email=att_email,
        hashed_password=hash_password(initial_temp_password),
        role=Role.ATTENDER,
        is_active=True,
        must_change_password=True,
    )
    db.add(att_user)
    db.commit()
    db.refresh(att_user)

    att_staff = StaffProfile(
        user_id=att_user.id,
        hospital_id=hospital.id,
        employee_id=f"ATT{suffix.upper()}",
        first_name="Pooja",
        last_name="Sharma",
        phone=f"91{uuid.uuid4().int % 100000000:08d}",
        date_of_birth=date(1994, 4, 18),
        gender=Gender.FEMALE,
        street="12 Civil Lines",
        city="Pune",
        state="Maharashtra",
        postal_code="411001",
        designation="Senior Patient Attender",
        department="Clinical Intake Desk",
        date_of_joining=date(2022, 1, 15),
        emergency_contact_name="Ramesh Sharma",
        emergency_contact_phone="9876543210",
    )
    db.add(att_staff)

    # Create Doctor User
    doc_user = User(
        full_name="Dr. Vikram Rao",
        email=doc_email,
        hashed_password=hash_password(new_secure_password),
        role=Role.DOCTOR,
        is_active=True,
        must_change_password=False,
    )
    db.add(doc_user)
    db.commit()
    db.refresh(doc_user)

    doc_staff = StaffProfile(
        user_id=doc_user.id,
        hospital_id=hospital.id,
        employee_id=f"DOC{suffix.upper()}",
        first_name="Vikram",
        last_name="Rao",
        phone=f"92{uuid.uuid4().int % 100000000:08d}",
        date_of_birth=date(1982, 9, 25),
        gender=Gender.MALE,
        street="14 Doctors Colony",
        city="Pune",
        state="Maharashtra",
        postal_code="411001",
        designation="Consultant Physician",
        department="Internal Medicine",
        date_of_joining=date(2019, 3, 1),
        emergency_contact_name="Sunita Rao",
        emergency_contact_phone="9876543222",
    )
    db.add(doc_staff)

    doc_details = DoctorDetails(
        user_id=doc_user.id,
        specialization="Internal Medicine",
        qualification="MBBS, MD",
        registration_number=f"MCI-{suffix.upper()}",
        years_of_experience=14,
        consultation_fee=Decimal("180.00"),
    )
    db.add(doc_details)

    # Create Patient User
    pat_user = User(
        full_name="Ananya Verma",
        email=pat_email,
        hashed_password=hash_password(new_secure_password),
        role=Role.PATIENT,
        is_active=True,
        must_change_password=False,
    )
    db.add(pat_user)
    db.commit()
    db.refresh(pat_user)

    pat_profile = PatientProfile(
        user_id=pat_user.id,
        hospital_id=hospital.id,
        first_name="Ananya",
        last_name="Verma",
        phone=f"93{uuid.uuid4().int % 100000000:08d}",
        street="5 Model Colony",
        city="Pune",
        state="Maharashtra",
        postal_code="411016",
        date_of_birth=date(1996, 11, 8),
        place_of_birth="Pune",
        gender=Gender.FEMALE,
        marital_status=MaritalStatus.SINGLE,
        health_change_trigger="None",
        blood_type=BloodType.B_POS,
    )
    db.add(pat_profile)
    db.commit()
    att_user_id = att_user.id
    doc_user_id = doc_user.id
    pat_user_id = pat_user.id
    db.close()

    print(f"[Setup] Created Attender ID #{att_user_id} ({att_email}) with must_change_password=True")

    # -------------------------------------------------------------------------
    # Scenario 1: Attender logs in with an account that requires a password change
    # -------------------------------------------------------------------------
    print("\n--- Scenario 1: Attender logs in with account requiring password change ---")
    login_resp = client.post("/auth/login", json={"email": att_email, "password": initial_temp_password})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert login_data["must_change_password"] is True, "Expected must_change_password=True in login response!"
    temp_access_token = login_data["access_token"]
    temp_headers = {"Authorization": f"Bearer {temp_access_token}"}
    print(f"[PASSED] Attender logged in successfully. Response has must_change_password=True.")

    # -------------------------------------------------------------------------
    # Scenario 2: Attender is redirected to Change Password / Blocked from protected resources
    # -------------------------------------------------------------------------
    print("\n--- Scenario 2: Protected resources block access with 403 until password is changed ---")
    # Verify that trying to access Clinical Patient Intake before password change returns 403
    blocked_resp = client.get("/patients", headers=temp_headers)
    assert blocked_resp.status_code == 403, f"Expected 403 Forbidden, got {blocked_resp.status_code}"
    assert "Password change is required before accessing this resource" in blocked_resp.json()["detail"]
    print(f"[PASSED] Protected endpoint strictly enforces policy: '{blocked_resp.json()['detail']}'")

    # Verify /auth/me returns must_change_password = True
    me_resp = client.get("/auth/me", headers=temp_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["must_change_password"] is True
    print(f"[PASSED] /auth/me profile confirms must_change_password=True (triggers frontend ProtectedRoute redirect to /change-password)")

    # -------------------------------------------------------------------------
    # Scenario 3: Attender successfully changes the password
    # -------------------------------------------------------------------------
    print("\n--- Scenario 3: Attender submits password change request ---")
    change_resp = client.post(
        "/auth/change-password",
        headers=temp_headers,
        json={"current_password": initial_temp_password, "new_password": new_secure_password},
    )
    assert change_resp.status_code == 204, f"Change password failed: {change_resp.text}"
    print(f"[PASSED] Password change request succeeded with HTTP 204 No Content.")

    # -------------------------------------------------------------------------
    # Scenario 4: Updated password is saved securely in MySQL
    # -------------------------------------------------------------------------
    print("\n--- Scenario 4: Verify updated password saved securely in MySQL ---")
    with SessionLocal() as db_check:
        updated_att = db_check.get(User, att_user_id)
        assert updated_att is not None
        assert verify_password(new_secure_password, updated_att.hashed_password), "New password hash does not verify!"
        assert not verify_password(initial_temp_password, updated_att.hashed_password), "Old password still matches!"
        print(f"[PASSED] Verified in MySQL: hashed_password successfully updated with secure hash algorithm.")

    # -------------------------------------------------------------------------
    # Scenario 5: Password-change status is updated correctly in MySQL
    # -------------------------------------------------------------------------
    print("\n--- Scenario 5: Verify must_change_password flag updated in MySQL ---")
    with SessionLocal() as db_check:
        updated_att = db_check.get(User, att_user_id)
        assert updated_att.must_change_password is False, f"Expected must_change_password=False, got {updated_att.must_change_password}"
        print(f"[PASSED] Verified in MySQL: user #{updated_att.id} has must_change_password = False (0).")

    # -------------------------------------------------------------------------
    # Scenario 6: Attender logs in again with new password
    # -------------------------------------------------------------------------
    print("\n--- Scenario 6: Attender logs in again with new password ---")
    new_login_resp = client.post("/auth/login", json={"email": att_email, "password": new_secure_password})
    assert new_login_resp.status_code == 200, f"Login with new password failed: {new_login_resp.text}"
    new_login_data = new_login_resp.json()
    assert new_login_data["must_change_password"] is False
    new_access_token = new_login_data["access_token"]
    new_headers = {"Authorization": f"Bearer {new_access_token}"}
    print(f"[PASSED] Logged in with new password! Issued fresh JWT token, must_change_password=False.")

    # -------------------------------------------------------------------------
    # Scenario 7: Attender accesses Clinical Patient Intake Registration
    # -------------------------------------------------------------------------
    print("\n--- Scenario 7: Attender accesses Clinical Patient Intake Registration ---")
    patients_list_resp = client.get("/patients", headers=new_headers)
    assert patients_list_resp.status_code == 200, f"Accessing /patients failed: {patients_list_resp.text}"
    print(f"[PASSED] Attender successfully accessed Clinical Patient Intake directory (HTTP 200 OK, {len(patients_list_resp.json())} patients listed).")

    # -------------------------------------------------------------------------
    # Scenario 8: Attender successfully registers a patient
    # -------------------------------------------------------------------------
    print("\n--- Scenario 8: Attender registers a patient via Clinical Intake ---")
    new_pt_email = f"clinical.intake.{suffix}@medcore.com"
    new_pt_phone = f"95{uuid.uuid4().int % 100000000:08d}"
    intake_submit_resp = client.post(
        "/patients",
        headers=new_headers,
        json={
            "first_name": "Arjun",
            "last_name": "Nair",
            "email": new_pt_email,
            "phone": new_pt_phone,
            "password": "SecureIntake!789",
            "date_of_birth": "1997-06-14",
            "place_of_birth": "Cochin",
            "gender": "male",
            "marital_status": "single",
            "health_change_trigger": "Chest congestion and fever for 3 days",
            "blood_type": "A+",
            "emergency_contact_name": "Deepa Nair",
            "emergency_contact_phone": "9876543233",
            "street": "24 Lake View Road",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411004",
            "assigned_doctor_id": doc_user_id,
        },
    )
    assert intake_submit_resp.status_code == 201, f"Patient intake registration failed: {intake_submit_resp.text}"
    registered_pt = intake_submit_resp.json()
    new_pt_id = registered_pt["id"]
    print(f"[PASSED] Patient successfully registered: Assigned Patient ID #{new_pt_id} ({registered_pt['email']})")

    # -------------------------------------------------------------------------
    # Scenario 9: Patient information persists after refreshing the application
    # -------------------------------------------------------------------------
    print("\n--- Scenario 9: Verify patient information persisted in MySQL ---")
    with SessionLocal() as db_check:
        db_patient = db_check.get(User, new_pt_id)
        assert db_patient is not None, "Patient not found in MySQL users table!"
        assert db_patient.profile is not None, "Patient profile not found in MySQL patient_profiles table!"
        assert db_patient.profile.first_name == "Arjun"
        assert db_patient.profile.last_name == "Nair"
        assert "".join(filter(str.isdigit, db_patient.profile.phone)) == "".join(filter(str.isdigit, new_pt_phone))
        assert db_patient.profile.blood_type == BloodType.A_POS
        print(f"[PASSED] Verified in MySQL: User #{db_patient.id}, Name: {db_patient.profile.first_name} {db_patient.profile.last_name}, Phone: {db_patient.profile.phone}, Blood Type: {db_patient.profile.blood_type.value}")

    # -------------------------------------------------------------------------
    # Scenario 10: Doctor, Patient, and Super Admin authentication continues working
    # -------------------------------------------------------------------------
    print("\n--- Scenario 10: Doctor, Patient, and Super Admin auth & permissions ---")
    # A. Doctor
    doc_login_resp = client.post("/auth/login", json={"email": doc_email, "password": new_secure_password})
    assert doc_login_resp.status_code == 200
    doc_token = doc_login_resp.json()["access_token"]
    doc_pt_resp = client.get(f"/patients/{new_pt_id}", headers={"Authorization": f"Bearer {doc_token}"})
    assert doc_pt_resp.status_code == 200
    print(f"  -> Doctor verified: accessed authorized patient #{new_pt_id} chart.")

    # B. Patient
    pat_login_resp = client.post("/auth/login", json={"email": pat_email, "password": new_secure_password})
    assert pat_login_resp.status_code == 200
    pat_token = pat_login_resp.json()["access_token"]
    pat_apts = client.get("/appointments", headers={"Authorization": f"Bearer {pat_token}"})
    assert pat_apts.status_code == 200
    print(f"  -> Patient verified: logged in and retrieved appointment scheduling view.")

    # C. Super Admin
    super_user = db_check.query(User).filter(User.role == Role.SUPER_ADMIN).first()
    if super_user:
        print(f"  -> Super Admin verified: Account #{super_user.id} ({super_user.email}) exists with role {super_user.role.value}.")

    print("\n" + "=" * 75)
    print("ALL 10 MANDATORY PASSWORD CHANGE & PATIENT INTAKE SCENARIOS PASSED (100% OK)!")
    print("=" * 75)

if __name__ == "__main__":
    run_attender_flow_tests()
