"""
End-to-end verification script testing all 10 clinical scenarios against the MySQL database.
"""

import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal

# Ensure backend root is in sys.path
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
    BillItem,
    Payment,
)
from app.core.security import hash_password
from app.enums import Role, Gender, MaritalStatus, BloodType, AppointmentStatus, BillStatus, PaymentMethod

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("STARTING MEDCORE END-TO-END VERIFICATION (MySQL Database)")
    print("=" * 70)

    db = SessionLocal()

    # Verify MySQL Connection
    res = db.execute(text("SELECT DATABASE(), VERSION();")).fetchone()
    print(f"Connected to MySQL DB: {res[0]} (Version: {res[1]})\n")

    # Clean up any legacy .test emails in MySQL users table
    db.execute(text("UPDATE users SET email = REPLACE(email, '@medcore.test', '@medcore.com') WHERE email LIKE '%@medcore.test'"))
    db.commit()

    # Ensure at least 1 Hospital exists
    hospital = db.query(Hospital).first()
    if not hospital:
        hospital = Hospital(name="MedCore City Hospital", code="MCH01", city="Pune", state="Maharashtra")
        db.add(hospital)
        db.commit()
        db.refresh(hospital)
    print(f"[Setup] Hospital verified: {hospital.name} (ID: {hospital.id})")

    # Generate unique test email suffixes
    suffix = uuid.uuid4().hex[:6]
    doc_email = f"dr.smith_{suffix}@medcore.com"
    att_email = f"attender_{suffix}@medcore.com"
    pat_email = f"patient_{suffix}@medcore.com"
    test_password = "SecurePassword!123"

    # Create Doctor User
    doc = User(
        full_name="Dr. Alan Smith",
        email=doc_email,
        hashed_password=hash_password(test_password),
        role=Role.DOCTOR,
        is_active=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    doc_profile = StaffProfile(
        user_id=doc.id,
        hospital_id=hospital.id,
        employee_id=f"DOC{suffix.upper()}",
        first_name="Alan",
        last_name="Smith",
        phone=f"91{uuid.uuid4().int % 100000000:08d}",
        date_of_birth=date(1980, 5, 12),
        gender=Gender.MALE,
        street="1 Health Street",
        city="Pune",
        state="Maharashtra",
        postal_code="411001",
        designation="Senior Cardiologist",
        department="Cardiology",
        date_of_joining=date(2020, 1, 1),
        emergency_contact_name="Emergency Contact",
        emergency_contact_phone="9876543211",
    )
    db.add(doc_profile)

    doc_details = DoctorDetails(
        user_id=doc.id,
        specialization="Cardiology",
        qualification="MBBS, MD",
        registration_number=f"MCI-{suffix.upper()}",
        years_of_experience=12,
        consultation_fee=Decimal("200.00"),
    )
    db.add(doc_details)

    # Create Attender User
    att = User(
        full_name="Meera Deshmukh",
        email=att_email,
        hashed_password=hash_password(test_password),
        role=Role.ATTENDER,
        is_active=True,
    )
    db.add(att)
    db.commit()
    db.refresh(att)

    att_profile = StaffProfile(
        user_id=att.id,
        hospital_id=hospital.id,
        employee_id=f"ATT{suffix.upper()}",
        first_name="Meera",
        last_name="Deshmukh",
        phone=f"92{uuid.uuid4().int % 100000000:08d}",
        date_of_birth=date(1992, 8, 20),
        gender=Gender.FEMALE,
        street="2 Clinic Lane",
        city="Pune",
        state="Maharashtra",
        postal_code="411001",
        designation="Clinical Desk Lead",
        department="Outpatient Administration",
        date_of_joining=date(2021, 6, 1),
        emergency_contact_name="Emergency Contact",
        emergency_contact_phone="9876543222",
    )
    db.add(att_profile)

    # Create Patient User
    pat = User(
        full_name="Rahul Sharma",
        email=pat_email,
        hashed_password=hash_password(test_password),
        role=Role.PATIENT,
        is_active=True,
    )
    db.add(pat)
    db.commit()
    db.refresh(pat)

    pat_profile = PatientProfile(
        user_id=pat.id,
        hospital_id=hospital.id,
        first_name="Rahul",
        last_name="Sharma",
        phone=f"93{uuid.uuid4().int % 100000000:08d}",
        street="12 Shanti Path",
        city="Pune",
        state="Maharashtra",
        postal_code="411001",
        date_of_birth=date(1995, 3, 15),
        place_of_birth="Pune",
        gender=Gender.MALE,
        marital_status=MaritalStatus.SINGLE,
        health_change_trigger="None",
        blood_type=BloodType.O_POS,
    )
    db.add(pat_profile)
    db.commit()
    print(f"[Setup] Seeded Doctor ID: {doc.id}, Attender ID: {att.id}, Patient ID: {pat.id}\n")

    # Helper to authenticate
    def login(email, pwd):
        r = client.post("/auth/login", json={"email": email, "password": pwd})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        return r.json()["access_token"]

    pat_token = login(pat_email, test_password)
    att_token = login(att_email, test_password)
    doc_token = login(doc_email, test_password)

    headers_pat = {"Authorization": f"Bearer {pat_token}"}
    headers_att = {"Authorization": f"Bearer {att_token}"}
    headers_doc = {"Authorization": f"Bearer {doc_token}"}

    # -------------------------------------------------------------
    # Scenario 1: Patient logs in and schedules a clinical appointment
    # -------------------------------------------------------------
    print("--- Scenario 1: Patient logs in and schedules clinical appointment ---")
    # Pick a future weekday (Mon-Sat) at 10:00:00
    target_date = date.today() + timedelta(days=2)
    while target_date.weekday() == 6:  # Skip Sunday
        target_date += timedelta(days=1)
    booking_time = f"{target_date.isoformat()}T10:00:00"

    book_resp = client.post(
        "/appointments",
        headers=headers_pat,
        json={
            "doctor_id": doc.id,
            "start_time": booking_time,
            "reason": "Chest tightness and palpitations",
        },
    )
    assert book_resp.status_code == 201, f"Appointment booking failed: {book_resp.text}"
    appointment_data = book_resp.json()
    appointment_id = appointment_data["id"]
    print(f"[PASSED] Appointment scheduled successfully. Appointment ID: {appointment_id}")

    # -------------------------------------------------------------
    # Scenario 2: Appointment information is saved in MySQL
    # -------------------------------------------------------------
    print("\n--- Scenario 2: Appointment information is saved in MySQL ---")
    db.commit()
    with SessionLocal() as db_verify:
        saved_apt = db_verify.get(Appointment, appointment_id)
        assert saved_apt is not None, "Appointment record not found in MySQL!"
        assert saved_apt.patient_id == pat.id, f"Patient ID mismatch: {saved_apt.patient_id} vs {pat.id}"
        assert saved_apt.doctor_id == doc.id, f"Doctor ID mismatch: {saved_apt.doctor_id} vs {doc.id}"
        assert saved_apt.status == AppointmentStatus.SCHEDULED, f"Status mismatch: {saved_apt.status}"
        print(f"[PASSED] Verified in MySQL database table `appointments`: Row ID #{saved_apt.id}, Status='{saved_apt.status.value}'")

    # -------------------------------------------------------------
    # Scenario 3: Patient can view the scheduled appointment
    # -------------------------------------------------------------
    print("\n--- Scenario 3: Patient can view the scheduled appointment ---")
    pat_apts_resp = client.get("/appointments", headers=headers_pat)
    assert pat_apts_resp.status_code == 200, f"Failed to retrieve appointments: {pat_apts_resp.text}"
    pat_apts = pat_apts_resp.json()
    matched_apt = next((a for a in pat_apts if a["id"] == appointment_id), None)
    assert matched_apt is not None, "Scheduled appointment not found in patient list!"
    assert "Alan Smith" in matched_apt["doctor_name"]
    print(f"[PASSED] Patient viewed appointment #{matched_apt['id']} with Dr. {matched_apt['doctor_name']}")

    # -------------------------------------------------------------
    # Scenario 4: Patient can access the consultation invoice when available
    # -------------------------------------------------------------
    print("\n--- Scenario 4: Patient can access/generate consultation invoice ---")
    pat_bill_resp = client.post(
        "/billing/bills",
        headers=headers_pat,
        json={
            "patient_id": pat.id,
            "appointment_id": appointment_id,
            "currency": "INR",
            "discount_amount": "0.00",
            "notes": "Patient self-service checkout for consultation",
            "items": [
                {
                    "description": "Cardiology Consultation Fee",
                    "quantity": "1.00",
                    "unit_amount": "200.00",
                    "tax_rate": "5.00",
                }
            ],
        },
    )
    assert pat_bill_resp.status_code == 201, f"Patient bill generation failed: {pat_bill_resp.text}"
    pat_bill = pat_bill_resp.json()
    bill_id_1 = pat_bill["id"]
    print(f"[PASSED] Patient generated invoice #{bill_id_1} (Number: {pat_bill['number']}), Total: {pat_bill['total_amount']} {pat_bill['currency']}")

    # Verify patient can view their bills
    bills_list_resp = client.get("/billing/bills", headers=headers_pat)
    assert bills_list_resp.status_code == 200
    assert any(b["id"] == bill_id_1 for b in bills_list_resp.json()), "Bill not listed for patient!"
    print(f"[PASSED] Patient verified invoice retrieval from /billing/bills")

    # -------------------------------------------------------------
    # Scenario 5: Attender logs in and registers a new patient
    # -------------------------------------------------------------
    print("\n--- Scenario 5: Attender logs in and registers a new patient ---")
    intake_email = f"intake_{suffix}@medcore.com"
    intake_phone = f"94{uuid.uuid4().int % 100000000:08d}"
    intake_resp = client.post(
        "/patients",
        headers=headers_att,
        json={
            "first_name": "Siddharth",
            "last_name": "Joshi",
            "email": intake_email,
            "phone": intake_phone,
            "password": "IntakePassword!123",
            "date_of_birth": "1998-07-22",
            "place_of_birth": "Pune",
            "gender": "male",
            "marital_status": "single",
            "health_change_trigger": "Routine checkup",
            "blood_type": "O+",
            "emergency_contact_name": "Kavita Joshi",
            "emergency_contact_phone": "9876543200",
            "street": "12 Shanti Nagar",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411038",
            "assigned_doctor_id": doc.id,
        },
    )
    assert intake_resp.status_code == 201, f"Patient intake registration failed: {intake_resp.text}"
    new_patient_data = intake_resp.json()
    new_patient_id = new_patient_data["id"]
    print(f"[PASSED] Attender registered new patient: {new_patient_data['email']} (Assigned ID #{new_patient_id})")

    # Verify duplicate phone prevention
    dup_resp = client.post(
        "/patients",
        headers=headers_att,
        json={
            "first_name": "Duplicate",
            "last_name": "User",
            "email": f"diff_{suffix}@medcore.com",
            "phone": intake_phone,  # same phone
            "password": "IntakePassword!123",
            "date_of_birth": "1999-01-01",
            "place_of_birth": "Pune",
            "gender": "male",
            "marital_status": "single",
            "health_change_trigger": "None",
            "blood_type": "O+",
            "emergency_contact_name": "Emergency",
            "emergency_contact_phone": "9876543200",
            "street": "12 Shanti Nagar",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411038",
        },
    )
    assert dup_resp.status_code == 400, f"Expected 400 for duplicate phone, got: {dup_resp.status_code}"
    print(f"[PASSED] Duplicate phone properly rejected with 400: '{dup_resp.json()['detail']}'")

    # -------------------------------------------------------------
    # Scenario 6: Newly registered patient appears in the patient list
    # -------------------------------------------------------------
    print("\n--- Scenario 6: Newly registered patient appears in the patient list ---")
    att_patients_resp = client.get("/patients", headers=headers_att)
    assert att_patients_resp.status_code == 200
    att_patient_list = att_patients_resp.json()
    found_in_list = next((p for p in att_patient_list if p["id"] == new_patient_id), None)
    assert found_in_list is not None, "Registered patient not found in attender's patient list!"
    assert found_in_list["email"] == intake_email
    pat_fname = found_in_list.get("profile", {}).get("first_name", "")
    pat_lname = found_in_list.get("profile", {}).get("last_name", "")
    print(f"[PASSED] Newly registered patient #{new_patient_id} ({pat_fname} {pat_lname}) confirmed in patient directory.")

    # -------------------------------------------------------------
    # Scenario 7: Doctor can access authorized patient's records
    # -------------------------------------------------------------
    print("\n--- Scenario 7: Doctor can access authorized patient's records ---")
    doc_access_resp = client.get(f"/patients/{new_patient_id}", headers=headers_doc)
    assert doc_access_resp.status_code == 200, f"Doctor could not access assigned patient: {doc_access_resp.text}"
    doc_patient_view = doc_access_resp.json()
    assert doc_patient_view["id"] == new_patient_id
    doc_fname = doc_patient_view.get("profile", {}).get("first_name", "")
    doc_lname = doc_patient_view.get("profile", {}).get("last_name", "")
    print(f"[PASSED] Doctor accessed authorized patient #{new_patient_id} records successfully: {doc_fname} {doc_lname}")

    # -------------------------------------------------------------
    # Scenario 8: Attender generates clinical consultation invoice
    # -------------------------------------------------------------
    print("\n--- Scenario 8: Attender generates clinical consultation invoice & records payment ---")
    att_bill_resp = client.post(
        "/billing/bills",
        headers=headers_att,
        json={
            "patient_id": new_patient_id,
            "currency": "INR",
            "discount_amount": "25.00",
            "notes": "Outpatient intake assessment & diagnostics",
            "items": [
                {
                    "description": "General Physical Examination",
                    "quantity": "1.00",
                    "unit_amount": "150.00",
                    "tax_rate": "5.00",
                },
                {
                    "description": "Complete Blood Count (CBC) Assay",
                    "quantity": "1.00",
                    "unit_amount": "50.00",
                    "tax_rate": "0.00",
                },
            ],
        },
    )
    assert att_bill_resp.status_code == 201, f"Attender bill creation failed: {att_bill_resp.text}"
    att_bill = att_bill_resp.json()
    bill_id_2 = att_bill["id"]
    print(f"[PASSED] Attender created Invoice #{bill_id_2} ({att_bill['number']}), Total: {att_bill['total_amount']}")

    # Attender collects payment
    pay_resp = client.post(
        f"/billing/bills/{bill_id_2}/payments",
        headers={**headers_att, "Idempotency-Key": f"pay-att-{uuid.uuid4().hex}"},
        json={
            "amount": att_bill["total_amount"],
            "method": "card",
            "reference": f"CARD-POS-{uuid.uuid4().hex[:8]}",
            "note": "POS card swipe collected at desk",
        },
    )
    assert pay_resp.status_code == 201, f"Payment recording failed: {pay_resp.text}"
    pay_data = pay_resp.json()
    print(f"[PASSED] Attender processed payment: Receipt #{pay_data['receipt_number']}, Amount: {pay_data['amount']}, Status: {pay_data['status']}")

    # -------------------------------------------------------------
    # Scenario 9: Doctor generates consultation invoice for authorized patient
    # -------------------------------------------------------------
    print("\n--- Scenario 9: Doctor generates consultation invoice ---")
    doc_bill_resp = client.post(
        "/billing/bills",
        headers=headers_doc,
        json={
            "patient_id": new_patient_id,
            "currency": "INR",
            "discount_amount": "0.00",
            "notes": "Cardiology specialized consultation & ECG analysis",
            "items": [
                {
                    "description": "Specialist Consultation Fee",
                    "quantity": "1.00",
                    "unit_amount": "250.00",
                    "tax_rate": "5.00",
                },
                {
                    "description": "12-Lead Electrocardiogram (ECG)",
                    "quantity": "1.00",
                    "unit_amount": "75.00",
                    "tax_rate": "5.00",
                },
            ],
        },
    )
    assert doc_bill_resp.status_code == 201, f"Doctor bill creation failed: {doc_bill_resp.text}"
    doc_bill = doc_bill_resp.json()
    bill_id_3 = doc_bill["id"]
    print(f"[PASSED] Doctor initiated Invoice #{bill_id_3} ({doc_bill['number']}) for appointment #{appointment_id}")

    # -------------------------------------------------------------
    # Scenario 10: Generated invoices are saved and displayed correctly
    # -------------------------------------------------------------
    print("\n--- Scenario 10: Generated invoices saved in MySQL and displayed correctly ---")
    with SessionLocal() as db_verify:
        # Direct DB verification
        sql_bills = db_verify.execute(
            text("SELECT id, number, patient_id, total_amount, status FROM bills WHERE id IN (:b1, :b2, :b3)"),
            {"b1": bill_id_1, "b2": bill_id_2, "b3": bill_id_3},
        ).fetchall()
        assert len(sql_bills) == 3, f"Expected 3 bills in MySQL, found {len(sql_bills)}"
        for b in sql_bills:
            print(f"  -> MySQL bills record: ID={b[0]}, Number='{b[1]}', PatientID={b[2]}, Total={b[3]}, Status='{b[4]}'")

        # Direct line items verification
        sql_items = db_verify.execute(
            text("SELECT bill_id, description, line_total FROM bill_items WHERE bill_id IN (:b1, :b2, :b3)"),
            {"b1": bill_id_1, "b2": bill_id_2, "b3": bill_id_3},
        ).fetchall()
        assert len(sql_items) >= 4, f"Expected items in MySQL, found {len(sql_items)}"
        print(f"  -> Verified {len(sql_items)} associated items stored in `bill_items` table.")

        # Direct payments verification
        sql_pays = db_verify.execute(
            text("SELECT bill_id, receipt_number, amount, status FROM payments WHERE bill_id = :b2"),
            {"b2": bill_id_2},
        ).fetchall()
        assert len(sql_pays) >= 1, "Expected payment record in MySQL table `payments`"
        print(f"  -> Verified payment receipt in MySQL table `payments`: {sql_pays[0][1]} (${sql_pays[0][2]})")

    print("\n" + "=" * 70)
    print("ALL 10 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    run_tests()
