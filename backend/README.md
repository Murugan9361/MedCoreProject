# MedCore backend

FastAPI service for clinic administration, appointments, patient records,
document uploads, internal billing, payment reconciliation, reports, audit
trails, and role-scoped access.

## Roles

| Role | Main access |
| --- | --- |
| Super admin | All hospitals, staff creation, audit and reporting |
| Admin | Their hospital’s staff, patients, appointments, clinical records, billing and reports |
| Doctor | Assigned patients, clinical notes/prescriptions, appointments, documents, billing and reports |
| Attender | Their hospital’s patient registration, appointments, document uploads, billing/payment collection and reports |
| Patient | Their own profile, appointments, prescriptions/records, documents, bills and reports |

Attenders deliberately cannot author diagnoses or prescriptions. That is a
clinical-safety boundary; only doctors, admins, and super admins can do so.

## Database Configuration (MySQL & PostgreSQL)

The MedCore backend supports both **MySQL** and **PostgreSQL**. Configure the target database by setting `DATABASE_URL` in `app/.env`:

### 1. MySQL (Default Port 3306)
Ensure MySQL server is running and a database (e.g. `medcore`) exists:
```env
DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/medcore
```
*(Driver: `PyMySQL` is installed)*

### 2. PostgreSQL (Default Port 5432)
Ensure PostgreSQL server is running and a database (e.g. `medcore`) exists:
```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/medcore
```
*(Driver: `psycopg2-binary` is installed)*

---

## Deployment & Database Initialization

1. Create a MySQL or PostgreSQL database (`medcore`).
2. Copy `app/.env.example` to `app/.env` and update `SECRET_KEY` and `DATABASE_URL`.
3. Synchronize tables and schema:
   ```powershell
   .\env\Scripts\python.exe init_db.py
   ```
   *(Note: The FastAPI app will also auto-ensure required tables on startup via its application lifespan).*

4. (Optional) Bootstrap an initial administrator:
   ```powershell
   $env:BOOTSTRAP_SUPER_ADMIN_EMAIL = "admin@medcore.com"
   $env:BOOTSTRAP_SUPER_ADMIN_PASSWORD = "StrongAdminPassword123!"
   .\env\Scripts\python.exe seed.py
   ```

5. Run the service:
   ```powershell
   .\env\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

The API docs are available at: `http://127.0.0.1:8000/docs`

## Verification & Tests

Run the test suite:
```powershell
.\env\Scripts\python.exe -B -m unittest tests.test_api -v
```
