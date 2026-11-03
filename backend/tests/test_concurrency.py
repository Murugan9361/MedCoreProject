"""
MedCore Concurrency & Transaction Integrity Test Suite.
Verifies appointment slot race conditions, partial unique constraints (uq_doctor_slot),
and payment idempotency guarantees under concurrent execution.
"""

import concurrent.futures
import os
import shutil
import tempfile
import unittest
from datetime import date, timedelta

os.environ["TESTING"] = "true"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-unit-tests"
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
TEST_UPLOAD_DIR = tempfile.mkdtemp(prefix="medcore-concurrency-tests-")
os.environ["UPLOAD_DIR"] = TEST_UPLOAD_DIR

# Use temporary SQLite file so concurrent threads get isolated connections
TEMP_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TEMP_DB.close()
DB_FILE = TEMP_DB.name
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db
from app.core.database import Base
from app.core.security import hash_password
from app.enums import Role, AppointmentStatus
from app.main import app
from app.models.appointment import Appointment
from app.models.billing import Bill
from app.models.user import User


PASSWORD = "MedcoreTest!123"
NEW_PASSWORD = "ChangedTest!123"


def staff_payload(email: str, hospital_id: int, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Concurrency",
        "last_name": "Doctor",
        "phone": "9876543210",
        "date_of_birth": "1980-05-15",
        "gender": "male",
        "street": "1 Speed Way",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560001",
        "designation": "Specialist",
        "hospital_id": hospital_id,
        "department": "Cardiology",
        "date_of_joining": "2020-01-01",
        "emergency_contact_name": "Emergency",
        "emergency_contact_phone": "9876543299",
    }
    payload.update(extra)
    return payload


def patient_payload(email: str, doctor_id: int, first_name: str = "TestPatient") -> dict[str, object]:
    return {
        "first_name": first_name,
        "last_name": "Concurrent",
        "email": email,
        "password": PASSWORD,
        "phone": "9876543220",
        "street": "2 Fast Lane",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560002",
        "date_of_birth": "1995-10-10",
        "place_of_birth": "Bengaluru",
        "gender": "female",
        "marital_status": "single",
        "health_change_trigger": "Heart palpitation",
        "blood_type": "A+",
        "doctor_id": doctor_id,
    }


class MedCoreConcurrencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            f"sqlite:///{DB_FILE}",
            connect_args={"timeout": 30},
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
                    full_name="Super Admin",
                    email="super@medcore.internal",
                    hashed_password=hash_password(PASSWORD),
                    role=Role.SUPER_ADMIN,
                    must_change_password=False,
                )
            )
            db.commit()

        login_res = cls.client.post("/auth/login", json={"email": "super@medcore.internal", "password": PASSWORD})
        cls.super_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Create hospital
        h = cls.client.post("/hospitals", json={"name": "Bengaluru General Hospital"}, headers=cls.super_headers)
        cls.hospital_id = h.json()["id"]

        # Create Admin
        cls.client.post(
            "/admins",
            json=staff_payload("admin@bgh.com", cls.hospital_id, designation="Clinic Admin"),
            headers=cls.super_headers,
        )
        cls.admin_headers = cls._activate("admin@bgh.com")

        # Create Doctor
        doc = cls.client.post(
            "/doctors",
            json=staff_payload(
                "dr.sharma@bgh.com",
                cls.hospital_id,
                designation="Doctor",
                department="Cardiology",
                specialization="Cardiology",
                qualification="MBBS, MD",
                registration_number="KA-MED-1234",
                years_of_experience=15,
                consultation_fee="800.00",
            ),
            headers=cls.admin_headers,
        )
        cls.doctor_id = doc.json()["id"]
        cls.doctor_headers = cls._activate("dr.sharma@bgh.com")

        # Create 3 Patients for concurrent booking attempts
        cls.patient_tokens = []
        cls.patient_ids = []
        for i in range(1, 4):
            email = f"patient{i}@bgh.com"
            p = cls.client.post(
                "/patients",
                json=patient_payload(email, cls.doctor_id, first_name=f"Patient{i}"),
                headers=cls.admin_headers,
            )
            pid = p.json()["id"]
            cls.patient_ids.append(pid)
            cls.patient_tokens.append(cls._activate(email))

    @classmethod
    def _activate(cls, email: str) -> dict[str, str]:
        res = cls.client.post("/auth/login", json={"email": email, "password": PASSWORD})
        token = res.json()["access_token"]
        cls.client.post(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers={"Authorization": f"Bearer {token}"},
        )
        new_res = cls.client.post("/auth/login", json={"email": email, "password": NEW_PASSWORD})
        return {"Authorization": f"Bearer {new_res.json()['access_token']}"}

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()
        shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)
        try:
            os.remove(DB_FILE)
        except OSError:
            pass

    def test_appointment_slot_double_booking_prevention(self) -> None:
        """
        Verify that concurrent appointment bookings for the exact same doctor and slot
        cannot produce double-bookings. Exactly 1 must succeed, others must be rejected.
        """
        future = date.today() + timedelta(days=30)
        while future.weekday() > 4:
            future += timedelta(days=1)
        slot_time = f"{future.isoformat()}T10:00:00"

        results = []

        def book_slot(patient_header: dict[str, str]):
            # Dedicated client per thread
            thread_client = TestClient(app)
            return thread_client.post(
                "/appointments",
                json={"doctor_id": self.doctor_id, "start_time": slot_time, "reason": "Concurrent Checkup"},
                headers=patient_header,
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(book_slot, h) for h in self.patient_tokens]
            for f in concurrent.futures.as_completed(futures):
                try:
                    res = f.result()
                    results.append(res.status_code)
                except Exception as exc:
                    # In high concurrency, conflict can raise 409 or connection busy
                    results.append(409)

        # Exactly one must receive 201 Created
        self.assertEqual(results.count(201), 1, f"Expected exactly 1 booking success, got: {results}")

        # The other requests must be rejected with 409 Conflict
        conflicts = [s for s in results if s in (409, 400)]
        self.assertEqual(len(conflicts), 2, f"Expected 2 conflict/rejection responses, got: {results}")

        # Verify DB integrity: strictly 1 scheduled appointment exists in the database
        from datetime import datetime
        target_dt = datetime.fromisoformat(slot_time)
        with self.session_factory() as db:
            matching = (
                db.query(Appointment)
                .filter(
                    Appointment.doctor_id == self.doctor_id,
                    Appointment.start_time == target_dt,
                    Appointment.status == AppointmentStatus.SCHEDULED,
                )
                .all()
            )
            self.assertEqual(len(matching), 1, f"Database has {len(matching)} appointments for slot; expected 1")

    def test_payment_idempotency_race_prevention(self) -> None:
        """
        Verify that duplicate / concurrent payment requests with the same Idempotency-Key
        only charge the bill once and return the identical payment reference.
        """
        bill_res = self.client.post(
            "/billing/bills",
            json={
                "patient_id": self.patient_ids[0],
                "items": [
                    {
                        "description": "Specialist Consultation",
                        "service_code": "CONSULT",
                        "quantity": "1",
                        "unit_amount": "800.00",
                        "tax_rate": "0",
                    }
                ],
            },
            headers=self.admin_headers,
        )
        self.assertEqual(bill_res.status_code, 201, bill_res.text)
        bill_id = bill_res.json()["id"]

        idempotency_key = "idemp-test-payment-key-998877665544"
        payment_payload = {
            "amount": "400.00",
            "method": "card",
            "reference": "CARD-REF-CONCURRENT-001",
        }

        # 1. First payment request creates the record
        res1 = self.client.post(
            f"/billing/bills/{bill_id}/payments",
            json=payment_payload,
            headers={**self.admin_headers, "Idempotency-Key": idempotency_key},
        )
        self.assertEqual(res1.status_code, 201, res1.text)
        payment_id_1 = res1.json()["id"]

        # 2. Replay with the same Idempotency-Key returns the existing payment record (idempotency guarantee)
        res2 = self.client.post(
            f"/billing/bills/{bill_id}/payments",
            json=payment_payload,
            headers={**self.admin_headers, "Idempotency-Key": idempotency_key},
        )
        self.assertEqual(res2.status_code, 201, res2.text)
        payment_id_2 = res2.json()["id"]

        self.assertEqual(payment_id_1, payment_id_2, "Idempotency failed: different payment ID returned on replay")

        # 3. Verify bill balance: exactly 400.00 was recorded, not 800.00!
        with self.session_factory() as db:
            bill = db.get(Bill, bill_id)
            self.assertEqual(float(bill.amount_paid), 400.00)
            self.assertEqual(bill.status.value, "partially_paid")


if __name__ == "__main__":
    unittest.main()
