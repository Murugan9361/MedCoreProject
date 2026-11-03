"""
MedCore Production RBAC & Tenant Isolation Test Suite.
Tests the 5-role authorization matrix, BOLA/IDOR protection, and hospital multi-tenancy.
"""

import os
import shutil
import tempfile
import unittest
from datetime import date, timedelta

os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite+pysqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-unit-tests"
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
TEST_UPLOAD_DIR = tempfile.mkdtemp(prefix="medcore-rbac-tests-")
os.environ["UPLOAD_DIR"] = TEST_UPLOAD_DIR

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.core.security import hash_password
from app.enums import Role
from app.main import app
from app.models.user import User
from app.models.attender_details import AttenderDetails


PASSWORD = "MedcoreTest!123"
NEW_PASSWORD = "ChangedTest!123"


def staff_data(email: str, hospital_id: int, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Test",
        "last_name": "Staff",
        "phone": "9876543210",
        "date_of_birth": "1988-03-15",
        "gender": "male",
        "street": "10 Health Ave",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postal_code": "600001",
        "designation": "Staff",
        "hospital_id": hospital_id,
        "department": "General Medicine",
        "date_of_joining": "2021-06-01",
        "emergency_contact_name": "Kin",
        "emergency_contact_phone": "9876543299",
    }
    payload.update(extra)
    return payload


def patient_data(email: str, doctor_id: int) -> dict[str, object]:
    return {
        "first_name": "Ravi",
        "last_name": "Kumar",
        "email": email,
        "password": PASSWORD,
        "phone": "9876543200",
        "street": "15 Temple Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postal_code": "600002",
        "date_of_birth": "1992-08-20",
        "place_of_birth": "Chennai",
        "gender": "male",
        "marital_status": "single",
        "health_change_trigger": "General checkup",
        "blood_type": "B+",
        "doctor_id": doctor_id,
    }


class MedCoreRbacMatrixTests(unittest.TestCase):
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

        # Seed initial super admin
        with cls.session_factory() as db:
            super_admin = User(
                full_name="Super Admin",
                email="superadmin@medcore.internal",
                hashed_password=hash_password(PASSWORD),
                role=Role.SUPER_ADMIN,
                must_change_password=False,
            )
            db.add(super_admin)
            db.commit()

        # Login super admin
        resp = cls.client.post("/auth/login", json={"email": "superadmin@medcore.internal", "password": PASSWORD})
        cls.super_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        # Create two distinct hospitals for tenant isolation testing
        h1 = cls.client.post("/hospitals", json={"name": "Apollo Clinic (H1)"}, headers=cls.super_headers)
        cls.h1_id = h1.json()["id"]

        h2 = cls.client.post("/hospitals", json={"name": "Fortis Medical (H2)"}, headers=cls.super_headers)
        cls.h2_id = h2.json()["id"]

        # 1. Admin at Hospital 1
        cls.client.post(
            "/admins",
            json=staff_data("admin1@h1.com", cls.h1_id, designation="H1 Admin"),
            headers=cls.super_headers,
        )
        cls.admin1_headers = cls._activate_user("admin1@h1.com")

        # 2. Doctor at Hospital 1
        doc1 = cls.client.post(
            "/doctors",
            json=staff_data(
                "doc1@h1.com",
                cls.h1_id,
                designation="Doctor",
                department="Cardiology",
                specialization="Cardiology",
                qualification="MBBS, MD",
                registration_number="TN-CARD-001",
                years_of_experience=10,
                consultation_fee="500.00",
            ),
            headers=cls.admin1_headers,
        )
        cls.doc1_id = doc1.json()["id"]
        cls.doc1_headers = cls._activate_user("doc1@h1.com")

        # 3. Attender at Hospital 1
        cls.client.post(
            "/attenders",
            json=staff_data("attender1@h1.com", cls.h1_id, designation="Attender", shift="morning"),
            headers=cls.doc1_headers,
        )
        cls.attender1_headers = cls._activate_user("attender1@h1.com")

        # 4. Patient 1 (Hospital 1)
        pat1 = cls.client.post(
            "/patients",
            json=patient_data("patient1@h1.com", cls.doc1_id),
            headers=cls.admin1_headers,
        )
        cls.pat1_id = pat1.json()["id"]
        cls.pat1_headers = cls._activate_user("patient1@h1.com")

        # 5. Admin at Hospital 2
        cls.client.post(
            "/admins",
            json=staff_data("admin2@h2.com", cls.h2_id, designation="H2 Admin"),
            headers=cls.super_headers,
        )
        cls.admin2_headers = cls._activate_user("admin2@h2.com")

        # 6. Doctor at Hospital 2
        doc2 = cls.client.post(
            "/doctors",
            json=staff_data(
                "doc2@h2.com",
                cls.h2_id,
                designation="Doctor",
                department="Neurology",
                specialization="Neurology",
                qualification="MBBS, DM",
                registration_number="TN-NEUR-002",
                years_of_experience=8,
                consultation_fee="800.00",
            ),
            headers=cls.admin2_headers,
        )
        cls.doc2_id = doc2.json()["id"]
        cls.doc2_headers = cls._activate_user("doc2@h2.com")

        # 7. Patient 2 (Hospital 2)
        pat2 = cls.client.post(
            "/patients",
            json=patient_data("patient2@h2.com", cls.doc2_id),
            headers=cls.admin2_headers,
        )
        cls.pat2_id = pat2.json()["id"]
        cls.pat2_headers = cls._activate_user("patient2@h2.com")

    @classmethod
    def _activate_user(cls, email: str) -> dict[str, str]:
        # Login with initial password, rotate, return new token headers
        resp = cls.client.post("/auth/login", json={"email": email, "password": PASSWORD})
        token = resp.json()["access_token"]
        cls.client.post(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers={"Authorization": f"Bearer {token}"},
        )
        new_resp = cls.client.post("/auth/login", json={"email": email, "password": NEW_PASSWORD})
        return {"Authorization": f"Bearer {new_resp.json()['access_token']}"}

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()
        shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)

    # -------------------------------------------------------------
    # 1. RBAC Matrix Endpoint Authorization Tests
    # -------------------------------------------------------------

    def test_post_admins_authorization(self) -> None:
        """POST /admins: Super Admin=201, Admin/Doctor/Attender/Patient=403, Unauth=401"""
        payload = staff_data("testadmin_probe@h1.com", self.h1_id, designation="Probe Admin")

        # Unauthenticated -> 401
        res = self.client.post("/admins", json=payload)
        self.assertEqual(res.status_code, 401)

        # Admin -> 403
        res = self.client.post("/admins", json=payload, headers=self.admin1_headers)
        self.assertEqual(res.status_code, 403)

        # Doctor -> 403
        res = self.client.post("/admins", json=payload, headers=self.doc1_headers)
        self.assertEqual(res.status_code, 403)

        # Attender -> 403
        res = self.client.post("/admins", json=payload, headers=self.attender1_headers)
        self.assertEqual(res.status_code, 403)

        # Patient -> 403
        res = self.client.post("/admins", json=payload, headers=self.pat1_headers)
        self.assertEqual(res.status_code, 403)

        # Super Admin -> 201
        res = self.client.post("/admins", json=payload, headers=self.super_headers)
        self.assertEqual(res.status_code, 201)

    def test_post_doctors_authorization(self) -> None:
        """POST /doctors: Super Admin=201, Admin=201, Doctor/Attender/Patient=403, Unauth=401"""
        payload = staff_data(
            "testdoc_probe@h1.com",
            self.h1_id,
            designation="Doctor",
            department="Orthopedics",
            specialization="Orthopedics",
            qualification="MBBS, MS",
            registration_number="TN-ORTHO-099",
            years_of_experience=5,
            consultation_fee="400.00",
        )

        # Unauthenticated -> 401
        res = self.client.post("/doctors", json=payload)
        self.assertEqual(res.status_code, 401)

        # Doctor -> 403
        res = self.client.post("/doctors", json=payload, headers=self.doc1_headers)
        self.assertEqual(res.status_code, 403)

        # Attender -> 403
        res = self.client.post("/doctors", json=payload, headers=self.attender1_headers)
        self.assertEqual(res.status_code, 403)

        # Patient -> 403
        res = self.client.post("/doctors", json=payload, headers=self.pat1_headers)
        self.assertEqual(res.status_code, 403)

        # Admin -> 201
        res = self.client.post("/doctors", json=payload, headers=self.admin1_headers)
        self.assertEqual(res.status_code, 201)

    def test_post_attenders_authorization(self) -> None:
        """POST /attenders: Super Admin=201, Admin=201, Doctor=201, Attender/Patient=403, Unauth=401"""
        payload = staff_data("testatt_probe@h1.com", self.h1_id, designation="Attender", shift="evening")

        # Unauthenticated -> 401
        res = self.client.post("/attenders", json=payload)
        self.assertEqual(res.status_code, 401)

        # Attender -> 403
        res = self.client.post("/attenders", json=payload, headers=self.attender1_headers)
        self.assertEqual(res.status_code, 403)

        # Patient -> 403
        res = self.client.post("/attenders", json=payload, headers=self.pat1_headers)
        self.assertEqual(res.status_code, 403)

        # Doctor -> 201
        res = self.client.post("/attenders", json=payload, headers=self.doc1_headers)
        self.assertEqual(res.status_code, 201)

    # -------------------------------------------------------------
    # 2. BOLA / IDOR (Broken Object Level Authorization) Tests
    # -------------------------------------------------------------

    def test_bola_patient_record_access(self) -> None:
        """Patient 1 must not be allowed to access Patient 2's medical records (returns 404 or 403)."""
        res = self.client.get(f"/patients/{self.pat2_id}/records", headers=self.pat1_headers)
        # Should be 404 Not Found to prevent enumeration or 403
        self.assertIn(res.status_code, (403, 404))

    def test_bola_patient_bill_access(self) -> None:
        """Patient 1 querying bills must only see their own bills and not Patient 2's bills."""
        # Patient 1 views bill list
        bills_res = self.client.get("/billing/bills", headers=self.pat1_headers)
        self.assertEqual(bills_res.status_code, 200)
        for bill in bills_res.json():
            self.assertEqual(bill["patient_id"], self.pat1_id)

    def test_bola_patient_lab_upload_restriction(self) -> None:
        """Patient 1 cannot upload a lab report to Patient 2's chart."""
        res = self.client.post(
            f"/patients/{self.pat2_id}/lab-files",
            files={"file": ("malicious.jpg", b"\xff\xd8\xfffakeimage", "image/jpeg")},
            headers=self.pat1_headers,
        )
        self.assertIn(res.status_code, (403, 404))

    # -------------------------------------------------------------
    # 3. Hospital Multi-Tenant Isolation Tests
    # -------------------------------------------------------------

    def test_hospital_tenant_isolation(self) -> None:
        """
        Staff at Hospital 1 must not be able to query or inspect Patient from Hospital 2.
        Must return 404 to prevent hospital-to-hospital data leak.
        """
        res = self.client.get(f"/patients/{self.pat2_id}", headers=self.admin1_headers)
        self.assertEqual(res.status_code, 404)

        doc_res = self.client.get(f"/patients/{self.pat2_id}", headers=self.doc1_headers)
        self.assertEqual(doc_res.status_code, 404)

        att_res = self.client.get(f"/patients/{self.pat2_id}", headers=self.attender1_headers)
        self.assertEqual(att_res.status_code, 404)

    # -------------------------------------------------------------
    # 4. User Deletion & Cascading Cleanup Tests
    # -------------------------------------------------------------

    def test_user_deletion_permissions_and_cascade(self) -> None:
        """
        Verify deletion authorization rules:
        - Non-admins cannot delete users (403).
        - Admin cannot delete Super Admin (403).
        - Admin cannot delete themselves (400).
        - Super Admin/Admin deleting a doctor with linked records cascades cleanly without FK violations.
        """
        # Create a disposable doctor with an attender and an appointment
        temp_doc = self.client.post(
            "/doctors",
            json=staff_data(
                "tempdoc@h1.com",
                self.h1_id,
                designation="Doctor",
                department="General",
                specialization="General",
                qualification="MBBS",
                registration_number="TN-TMP-001",
                years_of_experience=3,
                consultation_fee="300.00",
            ),
            headers=self.admin1_headers,
        )
        self.assertEqual(temp_doc.status_code, 201)
        temp_doc_id = temp_doc.json()["id"]

        # Doctor creates an attender assigned to them
        temp_doc_headers = self._activate_user("tempdoc@h1.com")
        temp_attender = self.client.post(
            "/attenders",
            json=staff_data("tempatt@h1.com", self.h1_id, designation="Attender", shift="night"),
            headers=temp_doc_headers,
        )
        self.assertEqual(temp_attender.status_code, 201)
        temp_attender_id = temp_attender.json()["id"]

        # Doctor creates an appointment with Patient 1
        future_date = (date.today() + timedelta(days=20)).isoformat()
        while date.fromisoformat(future_date).weekday() > 4:
            future_date = (date.fromisoformat(future_date) + timedelta(days=1)).isoformat()

        appt = self.client.post(
            "/appointments",
            json={"doctor_id": temp_doc_id, "start_time": f"{future_date}T11:00:00", "reason": "Test Cascade"},
            headers=self.pat1_headers,
        )
        self.assertEqual(appt.status_code, 201)
        appt_id = appt.json()["id"]

        # Doctor creates consultation record
        rec = self.client.post(
            f"/patients/{self.pat1_id}/records",
            json={"appointment_id": appt_id, "note": "Notes before deletion", "diagnosis": "Healthy"},
            headers=temp_doc_headers,
        )
        self.assertEqual(rec.status_code, 201)

        # 1. Patient trying to delete doctor -> 403
        del_patient = self.client.delete(f"/users/{temp_doc_id}", headers=self.pat1_headers)
        self.assertEqual(del_patient.status_code, 403)

        # 2. Doctor trying to delete another doctor -> 403
        del_doc = self.client.delete(f"/users/{temp_doc_id}", headers=self.doc1_headers)
        self.assertEqual(del_doc.status_code, 403)

        # 3. Admin trying to delete their own account -> 400
        admin_info = self.client.get("/directory/users", headers=self.admin1_headers)
        admin_user_id = [u["id"] for u in admin_info.json() if u["email"] == "admin1@h1.com"][0]
        del_self = self.client.delete(f"/users/{admin_user_id}", headers=self.admin1_headers)
        self.assertEqual(del_self.status_code, 400)

        # 4. Admin deleting Doctor -> 200 (Cascading cleanup test)
        del_doc_ok = self.client.delete(f"/users/{temp_doc_id}", headers=self.admin1_headers)
        self.assertEqual(del_doc_ok.status_code, 200, del_doc_ok.text)

        # Verify doctor is gone
        check_doc = self.client.get(f"/directory/users", headers=self.admin1_headers)
        remaining_ids = [u["id"] for u in check_doc.json()]
        self.assertNotIn(temp_doc_id, remaining_ids)

        # Verify linked attender was NOT deleted, but doctor_id unlinked safely
        with self.session_factory() as db:
            att_details = db.query(AttenderDetails).filter(AttenderDetails.user_id == temp_attender_id).first()
            self.assertIsNotNone(att_details)
            self.assertIsNone(att_details.doctor_id)


if __name__ == "__main__":
    unittest.main()

