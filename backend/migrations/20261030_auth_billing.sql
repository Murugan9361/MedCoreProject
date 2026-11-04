BEGIN;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_revoked_at ON public.refresh_tokens(revoked_at);

CREATE TABLE IF NOT EXISTS public.bills (
    id SERIAL PRIMARY KEY,
    number VARCHAR(40) NOT NULL UNIQUE,
    hospital_id INTEGER NOT NULL REFERENCES public.hospitals(id),
    patient_id INTEGER NOT NULL REFERENCES public.users(id),
    appointment_id INTEGER NULL UNIQUE REFERENCES public.appointments(id),
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    CONSTRAINT ck_bills_paid_not_over_total CHECK (amount_paid <= total_amount),
    due_date DATE NULL,
    notes TEXT NULL,
    issued_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_bills_hospital_id ON public.bills(hospital_id);
CREATE INDEX IF NOT EXISTS ix_bills_patient_id ON public.bills(patient_id);
CREATE INDEX IF NOT EXISTS ix_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS ix_bills_due_date ON public.bills(due_date);

CREATE TABLE IF NOT EXISTS public.bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    service_code VARCHAR(64) NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_amount NUMERIC(12, 2) NOT NULL CHECK (unit_amount >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX IF NOT EXISTS ix_bill_items_bill_id ON public.bill_items(bill_id);

CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES public.bills(id),
    received_by INTEGER NOT NULL REFERENCES public.users(id),
    receipt_number VARCHAR(40) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(32) NOT NULL CHECK (method IN ('CASH', 'CARD', 'BANK_TRANSFER')),
    status VARCHAR(32) NOT NULL DEFAULT 'succeeded'
        CHECK (status IN ('SUCCEEDED', 'REFUNDED')),
    reference VARCHAR(100) NULL UNIQUE,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    note VARCHAR(500) NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_payments_bill_id ON public.payments(bill_id);

COMMIT;
