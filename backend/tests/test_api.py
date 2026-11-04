"""End-to-end role and data-isolation checks for the MedCore API."""

import os
import shutil
import tempfile
import unittest
from datetime import date, timedelta

os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite+pysqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-unit-tests"
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
TEST_UPLOAD_DIR = tempfile.mkdtemp(prefix="medcore-api-tests-")
os.environ["UPLOAD_DIR"] = TEST_UPLOAD_DIR

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api.deps import get_db  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.enums import Role  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402


PASSWORD = "MedcoreTest!123"
NEW_PASSWORD = "ChangedTest!123"


def staff_payload(email: str, hospital_id: int, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Asha",
        "last_name": "Kumar",
        "phone": "9876543210",
        "date_of_birth": "1985-01-10",
        "gender": "female",
        "street": "1 Health Street",
        "city": "Pune",
        "state": "Maharashtra",
        "postal_code": "411001",
        "designation": "Clinical Staff",
        "hospital_id": hospital_id,
        "department": "General",
        "date_of_joining": "2020-01-10",
        "emergency_contact_name": "Emergency Contact",
        "emergency_contact_phone": "9876543211",
    }
    payload.update(extra)
    return payload


def patient_payload(email: str, doctor_id: int) -> dict[str, object]:
    return {
        "first_name": "Priya",
        "last_name": "Patel",
        "email": email,
        "password": PASSWORD,
        "phone": "9876543222",
        "street": "2 Care Street",
        "city": "Pune",
        "state": "Maharashtra",
        "postal_code": "411002",
        "date_of_birth": "1990-05-12",
        "place_of_birth": "Pune",
        "gender": "female",
        "marital_status": "single",
        "health_change_trigger": "Annual checkup",
        "blood_type": "O+",
        "doctor_id": doctor_id,
    }


class MedCoreApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.session_factory = sessionmaker(bind=cls.engine, autoflush=False)
        Base.metadata.create_all(bind=cls.engine)

        def override_db():
            db = cls.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        cls.client = TestClient(app)
        with cls.session_factory() as db:
            db.add(
                User(
                    full_name="System Super Admin",
                    email="super@example.com",
                    hashed_password=hash_password(PASSWORD),
                    role=Role.SUPER_ADMIN,
                    must_change_password=False,
                )
            )
            db.commit()

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()
        shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)

    def auth(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def login(self, email: str, password: str = PASSWORD) -> dict[str, object]:
        response = self.client.post("/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def rotate_initial_password(self, email: str) -> dict[str, object]:
        tokens = self.login(email)
        changed = self.client.post(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers=self.auth(tokens["access_token"]),
        )
        self.assertEqual(changed.status_code, 204, changed.text)
        return self.login(email, NEW_PASSWORD)

    def next_weekday(self) -> date:
        value = date.today() + timedelta(days=45)
        while value.weekday() > 4:
            value += timedelta(days=1)
        return value

    def test_end_to_end_role_workflow(self) -> None:
        super_tokens = self.login("super@example.com")
        super_headers = self.auth(super_tokens["access_token"])

        hospital = self.client.post("/hospitals", json={"name": "Test Hospital"}, headers=super_headers)
        self.assertEqual(hospital.status_code, 201, hospital.text)
        hospital_id = hospital.json()["id"]

        admin = self.client.post(
            "/admins",
            json=staff_payload("admin@example.com", hospital_id, designation="Administrator"),
            headers=super_headers,
        )
        self.assertEqual(admin.status_code, 201, admin.text)
        admin_tokens = self.rotate_initial_password("admin@example.com")
        admin_headers = self.auth(admin_tokens["access_token"])

        doctor = self.client.post(
            "/doctors",
            json=staff_payload(
                "doctor@example.com",
                hospital_id,
                designation="Doctor",
                department="Cardiology",
                specialization="Cardiology",
                qualification="MBBS, MD",
                registration_number="REG-TEST-001",
                years_of_experience=12,
                consultation_fee="750.00",
            ),
            headers=admin_headers,
        )
        self.assertEqual(doctor.status_code, 201, doctor.text)
        doctor_id = doctor.json()["id"]
        doctor_tokens = self.rotate_initial_password("doctor@example.com")
        doctor_headers = self.auth(doctor_tokens["access_token"])

        attender = self.client.post(
            "/attenders",
            json=staff_payload(
                "attender@example.com", hospital_id, designation="Attender", shift="morning"
            ),
            headers=doctor_headers,
        )
        self.assertEqual(attender.status_code, 201, attender.text)

        patient = self.client.post(
            "/patients",
            json=patient_payload("patient@example.com", doctor_id),
            headers=admin_headers,
        )
        self.assertEqual(patient.status_code, 201, patient.text)
        patient_id = patient.json()["id"]
        patient_tokens = self.rotate_initial_password("patient@example.com")
        patient_headers = self.auth(patient_tokens["access_token"])

        profile = self.client.patch(
            "/patients/me", json={"street2": "Unit 3"}, headers=patient_headers
        )
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()["profile"]["street2"], "Unit 3")

        role_list = self.client.get("/directory/users", headers=doctor_headers)
        self.assertEqual(role_list.status_code, 200, role_list.text)
        self.assertGreaterEqual(len(role_list.json()), 4)

        starts = f"{self.next_weekday().isoformat()}T10:00:00"
        appointment = self.client.post(
            "/appointments",
            json={"doctor_id": doctor_id, "start_time": starts, "reason": "Review"},
            headers=patient_headers,
        )
        self.assertEqual(appointment.status_code, 201, appointment.text)
        appointment_id = appointment.json()["id"]

        denied_record = self.client.post(
            f"/patients/{patient_id}/records",
            json={"note": "Patient tries to write a clinical record"},
            headers=patient_headers,
        )
        self.assertEqual(denied_record.status_code, 403, denied_record.text)

        record = self.client.post(
            f"/patients/{patient_id}/records",
            json={
                "appointment_id": appointment_id,
                "note": "Stable condition",
                "diagnosis": "Routine review",
                "prescription": [
                    {
                        "name": "Medicine A",
                        "dosage": "10 mg",
                        "frequency": "daily",
                        "duration": "5 days",
                    }
                ],
            },
            headers=doctor_headers,
        )
        self.assertEqual(record.status_code, 201, record.text)
        prescriptions = self.client.get(
            f"/patients/{patient_id}/records?prescriptions_only=true", headers=patient_headers
        )
        self.assertEqual(prescriptions.status_code, 200, prescriptions.text)
        self.assertEqual(len(prescriptions.json()), 1)

        uploaded = self.client.post(
            f"/patients/{patient_id}/lab-files",
            files={"file": ("result.jpg", b"\xff\xd8\xffsample-jpeg", "image/jpeg")},
            headers=patient_headers,
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        self.assertEqual(uploaded.json()["original_name"], "result.jpg")

        bill = self.client.post(
            "/billing/bills",
            json={
                "patient_id": patient_id,
                "appointment_id": appointment_id,
                "items": [
                    {
                        "description": "Consultation",
                        "service_code": "CONSULT",
                        "quantity": "1",
                        "unit_amount": "750.00",
                        "tax_rate": "0",
                    }
                ],
            },
            headers=admin_headers,
        )
        self.assertEqual(bill.status_code, 201, bill.text)
        bill_id = bill.json()["id"]

        own_bills = self.client.get("/billing/bills", headers=patient_headers)
        self.assertEqual(own_bills.status_code, 200, own_bills.text)
        self.assertEqual([item["id"] for item in own_bills.json()], [bill_id])

        payment = self.client.post(
            f"/billing/bills/{bill_id}/payments",
            json={"amount": "750.00", "method": "cash", "reference": "CASH-TEST-001"},
            headers={**admin_headers, "Idempotency-Key": "payment-test-key-0001"},
        )
        self.assertEqual(payment.status_code, 201, payment.text)
        payment_retry = self.client.post(
            f"/billing/bills/{bill_id}/payments",
            json={"amount": "750.00", "method": "cash", "reference": "CASH-TEST-001"},
            headers={**admin_headers, "Idempotency-Key": "payment-test-key-0001"},
        )
        self.assertEqual(payment_retry.status_code, 201, payment_retry.text)
        self.assertEqual(payment_retry.json()["id"], payment.json()["id"])
        final_bill = self.client.get(f"/billing/bills/{bill_id}", headers=patient_headers)
        self.assertEqual(final_bill.status_code, 200, final_bill.text)
        self.assertEqual(final_bill.json()["status"], "paid")

        report = self.client.get(
            f"/reports/summary?from={date.today().isoformat()}&to={self.next_weekday().isoformat()}",
            headers=admin_headers,
        )
        self.assertEqual(report.status_code, 200, report.text)
        self.assertEqual(report.json()["billing"]["collected_total"], "750.00")

        refreshed = self.client.post(
            "/auth/refresh", json={"refresh_token": patient_tokens["refresh_token"]}
        )
        self.assertEqual(refreshed.status_code, 200, refreshed.text)
        replay = self.client.post(
            "/auth/refresh", json={"refresh_token": patient_tokens["refresh_token"]}
        )
        self.assertEqual(replay.status_code, 401, replay.text)


if __name__ == "__main__":
    unittest.main()
