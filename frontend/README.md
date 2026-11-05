# MedCore — Clinical & Hospital Management Platform (Frontend)

A modern, responsive, and accessible Single Page Application (SPA) built using **React.js**, **JavaScript**, and **Plain CSS** (no TypeScript, Tailwind CSS, Bootstrap, or external styling frameworks).

---

## 1. Tech Stack
- **Library**: React 19 (JavaScript)
- **Routing**: React Router 7 (`react-router-dom`)
- **HTTP Client**: Axios with JWT Bearer interceptor, 401 handling, and backend proxy
- **Icons**: Lucide React
- **Styling**: Pure CSS Design System (`src/index.css`) with CSS custom properties, responsive flexbox & grid utilities, clinical badges, modals, and accessible focus states

---

## 2. Live Backend Integration
The frontend is pre-configured in `vite.config.js` to proxy all API requests to the running FastAPI backend at `http://127.0.0.1:8000`:
- `/auth/*` -> `http://127.0.0.1:8000/auth/*`
- `/patients/*` -> `http://127.0.0.1:8000/patients/*`
- `/appointments/*` -> `http://127.0.0.1:8000/appointments/*`
- `/doctors/*` -> `http://127.0.0.1:8000/doctors/*`
- `/hospitals/*` -> `http://127.0.0.1:8000/hospitals/*`
- `/admins/*` -> `http://127.0.0.1:8000/admins/*`
- `/attenders/*` -> `http://127.0.0.1:8000/attenders/*`
- `/users/*` -> `http://127.0.0.1:8000/users/*`
- `/audit-logs/*` -> `http://127.0.0.1:8000/audit-logs/*`
- `/lab-files/*` -> `http://127.0.0.1:8000/lab-files/*`

---

## 3. Implemented Modules & Features

### Module A: Dashboard & Role-Based Home (`/`)
- Dynamic clinical KPIs (Total Appointments, Scheduled/Pending, Completed, Clinicians count).
- Real-time Patient Queue with status indicators and quick action buttons.
- Quick action shortcuts (Schedule Appointment, Patient Directory, EMR, Upload Labs).
- Recent Audit stream & available clinicians cards.

### Module B: Patient Management (`/patients` & `/patients/:id`)
- Searchable patient directory filtering by name, email, phone, or ID.
- Full Patient Registration modal (`POST /patients`) with complete demographic and contact fields.
- Detailed Patient EMR View (`/patients/:id`):
  - Clinical Consultation notes and assessment timeline.
  - Active Prescriptions overview table.
  - Attached Diagnostic Lab Files with download links.
  - Modal to record new consultations with interactive prescription builder.
  - Modal to upload lab reports directly for that patient.

### Module C: Appointment Scheduling (`/appointments`)
- Multi-filter table (by Status: `scheduled`, `completed`, `cancelled`, `no_show` and by Doctor).
- "Book Appointment" modal:
  - Doctor selector (shows specialization and consultation fee).
  - Dynamic slot retrieval (`GET /doctors/{id}/slots?date=YYYY-MM-DD`).
  - Patient directory selection and visit reason.
  - Submits to `POST /appointments`.
- Status Workflow Actions:
  - Transition Status to `completed` with 1-click.
  - Reschedule modal (`PATCH /appointments/{id}/reschedule`) with date & time picker.
  - Cancel modal (`PATCH /appointments/{id}/cancel`) with reason prompt.

### Module D: Consultations & Medical Records (`/records`)
- EMR Consultation workspace.
- Patient chart selector.
- New Consultation Modal:
  - Chief examination findings & assessment notes.
  - Primary diagnosis (ICD-ready).
  - Interactive multi-row Prescription Builder (Drug name, dosage, frequency, duration, instructions) with dynamic Add/Remove medication items.
  - Doctor's advice and follow-up guidance.
  - Submits to `POST /patients/{id}/records`.

### Module E: Diagnostic Files & Labs (`/records/files`)
- Document repository displaying radiology scans, blood tests, and lab assays.
- Upload Report modal (`multipart/form-data` to `POST /patients/{id}/lab-files`).
- In-browser file preview modal supporting image and PDF display.

### Module F: Staff Administration (`/admin/staff`)
- Onboard Doctor modal (`POST /doctors`) with specialization, license number, consultation fee, shift, and personal details.
- Onboard Attender / Triage Nurse modal (`POST /attenders`) with shift schedules and assigned department.
- Active clinician and specialist directory table.

### Module G: Hospital Facilities (`/admin/hospitals`)
- Registered hospital facility cards with license accreditation status.
- "Register New Hospital" modal (`POST /hospitals`).

### Module H: Audit Logs (`/audit`)
- HIPAA compliance audit trail table (`GET /audit-logs`).
- Filter by action type (e.g. `LOGIN`, `CREATE`, `UPDATE`) or User ID.
- 1-click export to formatted JSON.

### Module I: Authentication & Access Control
- Login page (`/login`) with email/password authentication and patient self-registration modal (`POST /auth/register-patient`).
- Protected route guards redirecting unauthenticated users and blocking unauthorized roles.

---

## 4. Running the Application

### 1. Ensure the FastAPI Backend is Running:
In your backend directory:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend Dev Server:
In `MedCoreProject/frontend`:
```bash
npm run dev
```
Open your browser at:
```
http://localhost:3000
```

### 3. Production Build:
```bash
npm run build
```
Generates an optimized bundle in the `dist/` directory.
