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

## First deployment

1. Create a PostgreSQL database and a dedicated application role.
2. Copy [app/.env.example](app/.env.example) to `app/.env`, set a unique
   48-byte `SECRET_KEY`, and use a `postgresql+psycopg2://` URL.
3. Apply every SQL file in `migrations/` in filename order using a temporary
   deploy role, not the runtime application role.
4. Set `BOOTSTRAP_SUPER_ADMIN_EMAIL` and
   `BOOTSTRAP_SUPER_ADMIN_PASSWORD` in the shell, then run:

   ```powershell
   .\myenv\Scripts\python.exe seed.py
   ```

5. Run the service behind TLS:

   ```powershell
   .\myenv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --proxy-headers
   ```

The API is documented at `/docs`; disable public docs in your production
ingress unless the network is restricted to trusted operators.

## Authentication

`POST /auth/login` returns a 15-minute access token and a rotating refresh
token. Send the access token as `Authorization: Bearer <token>`. Store refresh
tokens only in an HttpOnly, Secure, SameSite cookie (or an equivalent protected
native-client store); do not persist them in browser local storage. First-login
accounts must call `/auth/change-password` before protected business endpoints
are available. `POST /auth/logout` revokes every active session for that user.

## Payments and speech-to-text

The implemented billing API records internal cash/card/bank-transfer
reconciliation. `POST /billing/bills/{bill_id}/payments` requires an
`Idempotency-Key` header to prevent duplicate collection on retries. It does
not accept or store card numbers.

A real payment gateway needs a chosen provider, merchant account, webhook
signing secret, settlement currency, tax/invoice requirements, and a PCI
responsibility decision. Speech-to-text needs a provider with a healthcare data
processing agreement, retention/region decision, and an approved audio storage
policy. Those external contracts and credentials are intentionally not guessed
or embedded in the application.

## Verification

The self-contained workflow suite uses a temporary SQLite database and never
contacts a real database or payment provider:

```powershell
.\myenv\Scripts\python.exe -B -m unittest tests.test_api -v
```

It verifies creation and login for all roles, forced password change, least
privilege, patient self-service, appointments, clinical records, protected
upload, bills, idempotent payments, scoped reports, and refresh-token replay
rejection.
