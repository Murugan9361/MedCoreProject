"""
Generates the comprehensive, executive-quality Word document:
MedCore_Project_Workflow_Documentation.docx
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_shading(cell, color_hex):
    """Set background color of a table cell."""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner cell padding in twips."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout_box(doc, text, title="KEY TAKEAWAY", bg_hex="F0FDF4", border_hex="0D9488"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    # Set left border thick
    tcPr = cell._tc.get_or_add_tcPr()
    borders_xml = f"""
    <w:tcBorders {nsdecls("w")}>
        <w:top w:val="none"/>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
    </w:tcBorders>
    """
    tcPr.append(parse_xml(borders_xml))

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_t = p.add_run(f"[{title}] ")
    run_t.bold = True
    run_t.font.name = "Segoe UI"
    run_t.font.size = Pt(10)
    run_t.font.color.rgb = RGBColor(13, 148, 136)

    run_b = p.add_run(text)
    run_b.font.name = "Segoe UI"
    run_b.font.size = Pt(9.5)
    run_b.font.color.rgb = RGBColor(30, 41, 59)

def format_table(tbl, col_widths, headers, data, alt_shading=True):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    # Header row
    hdr_row = tbl.rows[0]
    for i, title in enumerate(headers):
        cell = hdr_row.cells[i]
        cell.width = Inches(col_widths[i])
        set_cell_shading(cell, "1B365D")  # Deep Navy
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(title)
        run.bold = True
        run.font.name = "Segoe UI"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)

    # Data rows
    for r_idx, row_data in enumerate(data):
        row = tbl.add_row()
        bg_color = "F8FAFC" if (r_idx % 2 == 1 and alt_shading) else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = Inches(col_widths[c_idx])
            set_cell_shading(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(str(val))
            run.font.name = "Segoe UI"
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(51, 65, 85)

def build_document():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Title & Header
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    title_run = title_p.add_run("MedCore Healthcare Management System")
    title_run.font.name = "Segoe UI"
    title_run.font.size = Pt(24)
    title_run.bold = True
    title_run.font.color.rgb = RGBColor(27, 54, 93)  # #1B365D Navy

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(14)
    sub_run = sub_p.add_run("End-to-End Technical Architecture, Clinical Workflows, & Production Implementation Documentation")
    sub_run.font.name = "Segoe UI"
    sub_run.font.size = Pt(12)
    sub_run.font.color.rgb = RGBColor(13, 148, 136)  # Teal

    # Metadata Table
    meta_tbl = doc.add_table(rows=2, cols=4)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_cols = [1.5, 1.75, 1.5, 1.75]
    meta_data = [
        [("Role Track", True), ("Full Stack Developer", False), ("Application Version", True), ("v2.4.0 (Enterprise)", False)],
        [("Architecture", True), ("React.js + FastAPI + MySQL", False), ("Security Spec", True), ("JWT RBAC + Argon2/Bcrypt", False)],
    ]
    for r_idx, row in enumerate(meta_data):
        for c_idx, (text_val, is_bold) in enumerate(row):
            cell = meta_tbl.cell(r_idx, c_idx)
            cell.width = Inches(meta_cols[c_idx])
            set_cell_shading(cell, "F1F5F9" if is_bold else "FFFFFF")
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(text_val)
            run.font.name = "Segoe UI"
            run.font.size = Pt(8.5)
            run.bold = is_bold
            run.font.color.rgb = RGBColor(27, 54, 93) if is_bold else RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Helper function for Section Headings
    def add_h1(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(title)
        run.font.name = "Segoe UI"
        run.font.size = Pt(16)
        run.bold = True
        run.font.color.rgb = RGBColor(27, 54, 93)
        return p

    def add_h2(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(title)
        run.font.name = "Segoe UI"
        run.font.size = Pt(12.5)
        run.bold = True
        run.font.color.rgb = RGBColor(13, 148, 136)
        return p

    def add_body(text, bold_prefix=""):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            run_bp = p.add_run(bold_prefix)
            run_bp.font.name = "Segoe UI"
            run_bp.font.size = Pt(10)
            run_bp.bold = True
            run_bp.font.color.rgb = RGBColor(30, 41, 59)
        run_t = p.add_run(text)
        run_t.font.name = "Segoe UI"
        run_t.font.size = Pt(10)
        run_t.font.color.rgb = RGBColor(51, 65, 85)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            run_bp = p.add_run(bold_prefix)
            run_bp.font.name = "Segoe UI"
            run_bp.font.size = Pt(9.5)
            run_bp.bold = True
            run_bp.font.color.rgb = RGBColor(30, 41, 59)
        run_t = p.add_run(text)
        run_t.font.name = "Segoe UI"
        run_t.font.size = Pt(9.5)
        run_t.font.color.rgb = RGBColor(51, 65, 85)
        return p

    # Table of Contents Summary
    add_h1("Table of Contents")
    toc_items = [
        "1. Executive Project Overview & Scope",
        "2. Production Technology Stack & Architecture",
        "3. Role-Based Access Control (RBAC) Specification",
        "4. End-to-End Clinical Workflows (Role by Role)",
        "5. Deep Module-Wise Technical Breakdown",
        "6. System Architecture & Information Flow Diagrams",
        "7. Relational Database Schema & Foreign Key Map",
        "8. Full Stack Developer Responsibilities",
        "9. Real-World Engineering Challenges & Architectural Solutions",
        "10. Naukri Profile Content & 2-Minute Interview Pitch",
    ]
    for item in toc_items:
        add_bullet(item)

    doc.add_page_break()

    # SECTION 1
    add_h1("1. Project Overview & Scope")
    add_body("MedCore is an enterprise-grade, multi-tenant clinical healthcare management platform architected to streamline outpatient operations, medical recordkeeping (EMR), clinician scheduling, and billing lifecycles across modern hospitals.", "Project Introduction: ")
    add_body("Modern hospitals frequently struggle with fragmented patient registration, scheduling bottlenecks, disconnected consultation ledgers, and privacy vulnerabilities across paper and siloed systems. MedCore delivers a unified, HIPAA-compliant digital ecosystem that integrates four core user roles—Super Admin, Doctor, Attender, and Patient—into an end-to-end clinical operational pipeline.", "Project Abstract: ")
    
    add_h2("Business Objectives & Problem Statement")
    add_bullet(" Eliminate Patient Intake Redundancy: Digitize outpatient clinical registration, validate mandatory identity documents, and automatically assign unique demographic Patient IDs.", "Intake Automation: ")
    add_bullet(" Prevent Double-Booking & Slot Collisions: Enforce real-time doctor availability checks, schedule appointments in strict 30-minute intervals within clinic operational hours (Mon-Sat, 09:00-17:00), and eliminate double-booking at the database level.", "Conflict Prevention: ")
    add_bullet(" Centralize Electronic Medical Records (EMR): Allow licensed clinicians to log consultation findings, structured diagnoses, advice, multi-item drug prescriptions, and diagnostic lab assays.", "EMR Integration: ")
    add_bullet(" Synchronize Relational Financial Ledgers: Auto-link clinical consultations with invoice generation, calculate diagnostic charges, taxes, and discounts, and record verifiable payment receipts with idempotency keys.", "Billing & Revenue Cycle: ")

    add_callout_box(doc, "All documented capabilities in this specification represent verified, live codebase features running on React 18, Python FastAPI, and MySQL InnoDB.", "CODEBASE VERIFIED")

    # SECTION 2
    add_h1("2. Production Technology Stack")
    add_body("The MedCore application strictly utilizes modern full-stack technologies grounded in asynchronous Python, relational database constraints, and single-page application (SPA) patterns:")

    tech_headers = ["Layer", "Technology / Framework", "Version / Driver", "Core Production Purpose"]
    tech_widths = [1.2, 1.8, 1.4, 2.1]
    tech_data = [
        ["Frontend UI", "React.js (SPA)", "v18.x (Vite v6.4.5)", "Component-driven clinical workspace with responsive dashboards and real-time state."],
        ["Styling & Icons", "Modern CSS + Tailwind", "Lucide React", "Clinical theme variables, responsive grids, KPI status badges, and iconography."],
        ["Routing & State", "React Router DOM", "v6.x", "Client-side routing, protected navigation guards, and role-based redirect matrix."],
        ["HTTP Client", "Axios", "v1.7.x", "Configured instance with Bearer JWT interceptors and centralized 401 error dispatch."],
        ["Voice EMR", "Web Speech API", "Native Browser API", "Speech-to-text dictation widget for doctors transcribing live consultation notes."],
        ["Backend API", "Python FastAPI", "v0.128.0 (ASGI)", "High-performance asynchronous REST endpoints, dependency injection, and Pydantic schemas."],
        ["ASGI Web Server", "Uvicorn", "v0.40.0", "Asynchronous worker process handling high-concurrency clinical requests."],
        ["ORM & Engine", "SQLAlchemy", "v2.0.x", "Declarative relational modeling, joinedload query optimization, and transactions."],
        ["Database", "MySQL Enterprise", "v8.0.x InnoDB", "Relational ACID storage, foreign keys, compound indices, and token revocation."],
        ["DB Connector", "PyMySQL + Cryptography", "v1.2.3 / v43.0.x", "Pure-Python DB-API driver with automatic SSL/TLS and charset normalization."],
        ["Authentication", "OAuth2 / JWT (jose)", "python-jose v3.5.0", "Signed JSON Web Tokens containing sub, role, token_version, and expiration."],
        ["Security / Hash", "Passlib (Argon2 / Bcrypt)", "v1.7.4", "Adaptive password hashing with salt generation and password complexity validators."],
        ["Data Validation", "Pydantic v2", "v2.10.x", "Strict type-checking, phone number normalization, ISO datetime parsing, and sanitization."],
    ]
    t_table = doc.add_table(rows=1, cols=4)
    format_table(t_table, tech_widths, tech_headers, tech_data)

    # SECTION 3
    add_h1("3. Role-Based Access Control (RBAC) Specification")
    add_body("Security and patient confidentiality in MedCore are governed by a multi-tiered permission matrix defined in app/core/permissions.py. Every incoming HTTP request is checked at the FastAPI route level via the require_permission dependency.")

    rbac_headers = ["User Role", "Granted Permissions (Enums)", "Clinical & Administrative Responsibilities"]
    rbac_widths = [1.3, 2.2, 3.0]
    rbac_data = [
        [
            "Super Admin",
            "HOSPITAL_MANAGE, STAFF_MANAGE, AUDIT_VIEW, SUPER_ADMIN_CREATE",
            "Cross-hospital administration, multi-facility provisioning, top-level clinician onboarding, system-wide audit trail inspection, and administrative governance."
        ],
        [
            "Doctor",
            "PATIENT_VIEW, PATIENT_ASSIGNED_RECORDS, APPOINTMENT_VIEW, APPOINTMENT_MANAGE, BILLING_VIEW, BILLING_MANAGE",
            "Access assigned and hospital patient charts, document clinical consultations, prescribe medication regimes, upload lab files, manage clinic slots, and issue consultation bills."
        ],
        [
            "Attender",
            "PATIENT_CREATE, PATIENT_VIEW, PATIENT_ASSIGN, APPOINTMENT_VIEW, BILLING_VIEW, BILLING_MANAGE, PAYMENT_RECORD",
            "Front-desk patient intake registration, assigning clinicians, coordinating clinic appointments queue, generating consultation invoices, collecting cash/card payments, and printing receipts."
        ],
        [
            "Patient",
            "APPOINTMENT_VIEW, APPOINTMENT_BOOK, BILLING_VIEW, BILLING_MANAGE, PAYMENT_RECORD",
            "Self-service medical portal, doctor browsing by specialty/department, real-time appointment booking, viewing scheduled visits, generating consultation invoices, and downloading receipts."
        ],
    ]
    r_table = doc.add_table(rows=1, cols=3)
    format_table(r_table, rbac_widths, rbac_headers, rbac_data)

    # SECTION 4
    add_h1("4. End-to-End Clinical Workflows")
    add_body("The MedCore application handles complete lifecycles across each role from initial intake to revenue settlement:")

    add_h2("A. Attender Workflow: Patient Intake Registration & Billing")
    add_bullet(" Attender logs into MedCore using verified email and password. If the account was provisioned with a temporary password, the system intercepts the session and redirects to the Mandatory Password Change screen.", "1. Authentication: ")
    add_bullet(" Navigates to Patient Management & EMR -> Register New Patient. Fills mandatory fields: Name, Phone (10 digits), Email, DOB, Gender, Blood Type, Emergency Contact, and assigns an initial Consulting Doctor.", "2. Intake Entry: ")
    add_bullet(" Backend validates email uniqueness and phone number uniqueness (preventing duplicate registrations) and persists the record into MySQL tables `users` and `patient_profiles`.", "3. Relational Save: ")
    add_bullet(" Attender links the patient to a scheduled appointment or consultation, opens Patient Billing & Invoicing, selects doctor consultation fee ($150-$250), optional lab charges, pharmacy items, and tax.", "4. Invoice Generation: ")
    add_bullet(" Clicks Collect Payment, selects payment method (Card, Cash, Bank Transfer), and confirms transaction. MySQL creates a verified `payments` row and transitions invoice status to PAID.", "5. Settlement & Receipt: ")

    add_h2("B. Patient Workflow: Appointment Booking & Self-Service Invoicing")
    add_bullet(" Patient logs into the patient portal or registers publicly via `/login` modal.", "1. Portal Access: ")
    add_bullet(" Navigates to Appointment Scheduling, browses active clinicians, filters by Medical Department (Cardiology, Neurology, Pediatrics, etc.), and views real-time consultation fees.", "2. Doctor Selection: ")
    add_bullet(" Selects an upcoming clinic date (Mon-Sat, 09:00-17:00). The system computes valid available 30-minute time slots (e.g. 10:00, 10:30, 11:00) excluding booked slots.", "3. Slot Selection: ")
    add_bullet(" Confirms visit reason and books appointment. MySQL creates an `appointments` record with status SCHEDULED.", "4. Booking Confirmation: ")
    add_bullet(" In the appointments table, the patient clicks 'Invoice' to review consultation fees, line-item breakdowns, taxes, and download an official clinical receipt.", "5. Consultation Invoice: ")

    add_h2("C. Doctor Workflow: Clinical Consultation & EMR Records")
    add_bullet(" Doctor accesses Doctor Portal and reviews Today's Appointments queue.", "1. Daily Queue Review: ")
    add_bullet(" Selects scheduled patient to open their comprehensive Electronic Medical Record (EMR) chart at `/patients/:id`.", "2. EMR Chart Access: ")
    add_bullet(" Clicks 'Record Consultation' and documents clinical findings: Chief Complaint, Objective Diagnosis, Clinical Advice, and structured Rx prescription (Drug name, dosage, frequency, duration, instructions).", "3. Clinical Documentation: ")
    add_bullet(" Uses the integrated Speech-to-Text widget for hands-free clinical transcription.", "4. Voice Dictation: ")
    add_bullet(" Uploads diagnostic lab assays (PDF/JPEG) to `lab_files` and generates or reviews the final consultation bill.", "5. Diagnostics & Billing: ")

    # SECTION 5
    add_h1("5. Deep Module-Wise Technical Breakdown")
    mod_headers = ["Module Name", "Primary Role", "Frontend Page", "FastAPI Endpoints", "Database Tables Involved"]
    mod_widths = [1.3, 1.0, 1.3, 1.4, 1.5]
    mod_data = [
        ["Authentication & Session", "All Roles", "LoginPage.jsx, ChangePasswordPage.jsx", "POST /auth/login, POST /auth/change-password, GET /auth/me", "users, refresh_tokens, audit_logs"],
        ["Patient Intake & Directory", "Attender, Admin", "PatientsPage.jsx", "GET /patients, POST /patients, GET /patients/{id}", "users, patient_profiles, doctor_patient"],
        ["Appointment Scheduling", "Patient, Doctor, Attender", "AppointmentsPage.jsx", "GET /appointments, POST /appointments, PATCH /appointments/{id}/status", "appointments, users, staff_profiles"],
        ["EMR Consultation Records", "Doctor, Attender", "PatientDetailPage.jsx, ConsultationsPage.jsx", "GET /patients/{id}/records, POST /patients/{id}/records", "consultation_records, users"],
        ["Diagnostics & Lab Vault", "Doctor, Attender", "DiagnosticsFilesPage.jsx", "POST /patients/{id}/files, GET /patients/{id}/files", "lab_files, hospitals"],
        ["Billing, Ledger & Payments", "Attender, Doctor, Patient", "BillingPage.jsx", "GET /billing/bills, POST /billing/bills, POST /billing/bills/{id}/payments", "bills, bill_items, payments, appointments"],
        ["Hospital Administration", "Super Admin, Admin", "AdminStaffPage.jsx, AdminHospitalsPage.jsx", "POST /users/staff, GET /hospitals, POST /hospitals", "hospitals, users, staff_profiles, doctor_details"],
        ["Audit Logging & Compliance", "Super Admin", "AuditLogsPage.jsx", "GET /audit-logs", "audit_logs, users"],
    ]
    m_table = doc.add_table(rows=1, cols=5)
    format_table(m_table, mod_widths, mod_headers, mod_data)

    # SECTION 6
    add_h1("6. System Architecture & Information Flow")
    add_body("MedCore is built around a decoupled 3-tier architecture with clean separation of presentation, business logic, and transactional persistence:")
    
    arch_mermaid = """
    React.js Client (SPA)
        │
        ├── [1] Bearer JWT Header ──> [FastAPI Middleware: CORS & TrustedHost]
        │                                       │
        ├── [2] Axios HTTP Request ──> [OAuth2 Dependency: get_current_user]
        │                                       │
        │                             [RBAC Dependency: require_permission]
        │                                       │
        │                             [Pydantic v2 Schema Validation]
        │                                       │
        │                             [SQLAlchemy 2.0 ORM Session Engine]
        │                                       │
        └<── [3] JSON API Response <── [MySQL 8.0 InnoDB (ACID Relational Storage)]
    """
    add_body(arch_mermaid, "High-Level Architectural Flow: ")

    add_bullet(" Stateless Authentication: Access tokens use signed JWT payloads with 30-minute expiry; refresh tokens are hashed and stored in MySQL table `refresh_tokens` for controlled renewal.", "JWT Security: ")
    add_bullet(" Idempotent Transactions: Financial operations (payment collection) accept an Idempotency-Key header to prevent duplicate debiting on network retries.", "Idempotency: ")
    add_bullet(" Data Isolation: Clinicians only retrieve patients assigned to them or booked in their hospital schedule; attenders are scoped strictly to their facility.", "Tenant Isolation: ")

    # SECTION 7
    add_h1("7. Relational Database Schema & Table Relationships")
    add_body("The MedCore relational database runs on MySQL 8.0 InnoDB engine with full ACID compliance, foreign key constraints, and cascading integrity rules:")

    db_headers = ["Table Name", "Primary Key", "Foreign Keys", "Key Attributes & Purpose"]
    db_widths = [1.2, 0.9, 1.8, 2.6]
    db_data = [
        ["users", "id", "created_by -> users.id", "full_name, email (unique), hashed_password, role (enum), is_active, must_change_password, token_version."],
        ["patient_profiles", "id", "user_id -> users.id, hospital_id -> hospitals.id", "first_name, last_name, phone (unique), DOB, gender, blood_type, emergency contact, street, city."],
        ["staff_profiles", "id", "user_id -> users.id, hospital_id -> hospitals.id", "employee_id (unique), designation, department, shift, date_of_joining, phone, emergency contact."],
        ["doctor_details", "id", "user_id -> users.id", "specialization, qualification, registration_number (unique), consultation_fee, years_of_experience."],
        ["doctor_patient", "(doctor_id, patient_id)", "doctor_id -> users.id, patient_id -> users.id", "Composite primary key establishing formal clinical assignment between doctor and patient."],
        ["appointments", "id", "hospital_id, doctor_id, patient_id, booked_by -> users.id", "start_time, end_time, status (SCHEDULED, COMPLETED, CANCELLED), reason, cancel_reason."],
        ["consultation_records", "id", "patient_id, author_id -> users.id, hospital_id", "note, diagnosis, advice, prescription (JSON serialized array of medications), created_at."],
        ["bills", "id", "patient_id, appointment_id, hospital_id", "number (unique, e.g. MC-20261104-XXXX), status (DRAFT, ISSUED, PAID, VOID), subtotal, tax, discount, total, amount_paid."],
        ["bill_items", "id", "bill_id -> bills.id", "description, service_code, quantity, unit_amount, tax_rate, line_total."],
        ["payments", "id", "bill_id -> bills.id, hospital_id", "receipt_number (unique, e.g. MCP-00000001), amount, method (CASH, CARD, BANK_TRANSFER), status, idempotency_key."],
        ["refresh_tokens", "id", "user_id -> users.id", "token_hash (unique SHA-256), expires_at, revoked_at, created_at."],
        ["audit_logs", "id", "user_id -> users.id, hospital_id", "action, resource_type, resource_id, ip_address, user_agent, timestamp."],
    ]
    db_table = doc.add_table(rows=1, cols=4)
    format_table(db_table, db_widths, db_headers, db_data)

    # SECTION 8
    add_h1("8. Full Stack Developer Responsibilities")
    add_body("Summary of hands-on technical ownership and development contributions implemented in MedCore:")
    add_bullet(" Designed and developed responsive, modular React.js interfaces utilizing custom CSS themes, status badges, and interactive modals for clinical workflows.", "Frontend Component Architecture: ")
    add_bullet(" Implemented high-performance asynchronous RESTful APIs using Python FastAPI, adhering to OpenAPI / Swagger specifications and REST standards.", "Backend REST API Development: ")
    add_bullet(" Engineered strict Role-Based Access Control (RBAC) across 4 roles (Super Admin, Doctor, Attender, Patient) using FastAPI dependencies and React ProtectedRoutes.", "Authentication & RBAC: ")
    add_bullet(" Designed normalized relational schemas in MySQL with foreign key constraints, cascading deletes, unique indices, and optimized queries via SQLAlchemy 2.0 ORM.", "Database Architecture & Optimization: ")
    add_bullet(" Replaced client-side localStorage billing mockups with a persistent, relational invoicing engine supporting dynamic tax calculation, itemized fees, and idempotency.", "Financial Ledger & Billing Engine: ")
    add_bullet(" Implemented conflict-free appointment scheduling preventing double-booking through compound database indexing and 30-minute operational clinic slot filters.", "Slot Scheduling Algorithms: ")
    add_bullet(" Integrated Web Speech API for voice-driven clinician dictation and structured JSON prescription models for electronic medical records (EMR).", "Voice & EMR Innovation: ")
    add_bullet(" Built comprehensive unit and end-to-end test suites verifying 10 critical clinical scenarios including intake, booking, password rotation, and payment collection.", "Automated Testing & QA: ")

    # SECTION 9
    add_h1("9. Key Technical Challenges & Engineering Solutions")
    challenges_headers = ["Challenge / Bug Encountered", "Technical Root Cause", "Engineering Solution Implemented"]
    ch_widths = [1.8, 2.2, 2.5]
    challenges_data = [
        [
            "Mandatory Password Change 403 Error on Patient Intake",
            "Staff provisioned with temporary passwords had must_change_password=True in MySQL, but frontend lacked a change-password route, locking users out.",
            "Created dedicated ChangePasswordPage.jsx, enhanced ProtectedRoute to intercept and redirect flagged sessions, and automated credential re-authentication via POST /auth/change-password."
        ],
        [
            "Dual Database Driver Compatibility (MySQL & PostgreSQL)",
            "Configuration strictly expected postgresql+psycopg2, failing startup when deployed against enterprise MySQL instances.",
            "Implemented dynamic driver scheme normalization in app/core/config.py supporting both mysql+pymysql and postgresql+psycopg2 seamlessly."
        ],
        [
            "Appointment Double-Booking Under High Concurrency",
            "Patients concurrently booking the same clinician on the same time slot created overlapping schedule collisions.",
            "Added compound database index Index('uq_doctor_slot', 'doctor_id', 'start_time', unique=True) and added atomic conflict checks in appointment_service.py."
        ],
        [
            "Client-Side vs Database Billing Disconnect",
            "Early prototype stored invoices in browser localStorage, making them unretrievable across logins or by other authorized roles.",
            "Engineered full relational tables (bills, bill_items, payments), created billingApi.js, and connected real-time ledger generation to appointment records."
        ],
        [
            "SQLAlchemy Circular Model Registry Errors",
            "Empty models/__init__.py prevented cross-model relationship resolution (User <-> PatientProfile <-> Bill) during mapper configuration.",
            "Consolidated and explicitly exported all 15 declarative models in app/models/__init__.py, guaranteeing clean ORM registry initialization."
        ],
    ]
    ch_table = doc.add_table(rows=1, cols=3)
    format_table(ch_table, ch_widths, challenges_headers, challenges_data)

    doc.add_page_break()

    # SECTION 10
    add_h1("10. Naukri Profile Content & Technical Interview Prep")
    
    add_h2("A. Project Title for Resume & Portfolios")
    add_body("MedCore – Enterprise Healthcare Management & Clinical Workflow System (React.js, FastAPI, MySQL)")

    add_h2("B. Professional Project Description (120 Words for Naukri ATS)")
    add_body("MedCore is an enterprise-grade Clinical Healthcare Management Platform built using React.js (Vite), Python FastAPI, and MySQL InnoDB to streamline hospital outpatient intake, Electronic Medical Records (EMR), doctor scheduling, and billing workflows. The application enforces fine-grained Role-Based Access Control (RBAC) across four distinct roles: Super Admin, Doctor, Attender, and Patient. Core capabilities include conflict-free 30-minute appointment booking, speech-to-text consultation dictation, structured JSON prescription management, real-time relational invoice generation, and idempotent payment processing with receipt generation. Features secure JWT authentication, Argon2/Bcrypt password hashing, token versioning, and comprehensive SQLAlchemy 2.0 ORM integration.")

    add_h2("C. Roles and Responsibilities (8 Bullet Points for Job Portals)")
    add_bullet(" Architected and developed a full-stack healthcare management web application using React.js, Python FastAPI, and MySQL with full ACID compliance.")
    add_bullet(" Built responsive clinical dashboards and modular UI components with React Router, Lucide icons, and modern Tailwind-compatible styling.")
    add_bullet(" Designed and deployed RESTful micro-endpoints utilizing FastAPI dependency injection, Pydantic v2 validation, and Swagger OpenAPI documentation.")
    add_bullet(" Implemented stateless JWT authentication with token versioning for instant session revocation and mandatory password change workflows.")
    add_bullet(" Engineered conflict-free appointment booking algorithms with compound unique database indices preventing doctor slot collisions.")
    add_bullet(" Developed an end-to-end relational billing engine replacing client-side mockups with persistent MySQL invoices, line-item taxes, and payments.")
    add_bullet(" Built an integrated speech-to-text dictation module using the Web Speech API enabling clinicians to transcribe patient consultation notes hands-free.")
    add_bullet(" Authored automated unit and integration test suites achieving 100% pass rates across patient registration, clinical billing, and RBAC matrix scenarios.")

    add_h2("D. Technical Skills & Keywords (ATS Optimized)")
    add_body("React.js, JavaScript (ES6+), Vite, Python 3.11+, FastAPI, Uvicorn, RESTful API Design, MySQL, SQLAlchemy 2.0, Database Normalization, JWT (JSON Web Tokens), OAuth2, RBAC (Role-Based Access Control), Argon2, Bcrypt, Web Speech API, Tailwind CSS, HTML5/CSS3, Axios Interceptors, Pydantic v2, PyMySQL, Software Testing, Full Stack Development.")

    add_h2("E. Short Project Summary (3-5 Lines for Resume Header)")
    add_body("• Built MedCore, an enterprise clinical management platform integrating React 18, Python FastAPI, and MySQL across 4 role-based portals.\n• Automated outpatient intake registration, eliminating duplicate patient records via unique constraint validations.\n• Developed conflict-free appointment scheduling and a persistent billing engine with automated tax calculation and receipt issuance.\n• Strengthened clinical security with JWT token versioning, RBAC permission dependencies, and HIPAA-compliant audit trails.")

    add_h2("F. 2-Minute Technical Interview Pitch (Natural Script)")
    pitch_text = (
        "\"MedCore is an enterprise healthcare management system that I developed using React.js on the frontend, Python FastAPI on the backend, and MySQL as the relational database. "
        "The problem it solves is the operational fragmentation in outpatient clinics—specifically around patient intake bottlenecks, double-booked appointments, and disconnected consultation billing. "
        "\n\n"
        "I implemented a strict Role-Based Access Control system for four distinct stakeholders: Super Admin, Doctor, Attender, and Patient. "
        "For the Patient role, I built a self-service appointment scheduler where patients can browse doctors by specialty, view real-time fees, and book 30-minute clinic slots that are validated against clinician working hours. "
        "To prevent schedule collisions, I enforced unique compound indexing at the database level on doctor ID and appointment timestamp. "
        "\n\n"
        "For Attenders, I built the Clinical Patient Intake Registration module which assigns unique demographic patient IDs and prevents duplicate registrations by validating both email and phone numbers. "
        "I also engineered a complete relational billing and invoicing engine—migrating mock localStorage records to full MySQL tables with line-item charges, medical taxes, discounts, and idempotent payment recording with receipt numbers. "
        "\n\n"
        "On the security side, I implemented JWT authentication with token versioning, meaning if a staff member's password is rotated or an account is compromised, previous sessions are instantly invalidated. "
        "When an issue arose where newly provisioned attenders with mandatory password changes were blocked with a 403 error, I resolved the architecture by building a dedicated Change Password workflow with frontend route guards and automated credential renewal. "
        "The entire system has been thoroughly tested with end-to-end automation scripts validating all 10 clinical user scenarios with zero errors.\""
    )
    add_body(pitch_text)

    # Save document
    output_filename = "MedCore_Project_Workflow_Documentation.docx"
    output_path = os.path.join(os.getcwd(), output_filename)
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")
    return output_path

if __name__ == "__main__":
    build_document()

