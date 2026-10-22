ALTER TABLE public.patient_profiles
ADD COLUMN IF NOT EXISTS hospital_id INTEGER NULL
REFERENCES public.hospitals (id);

CREATE INDEX IF NOT EXISTS ix_patient_profiles_hospital_id
ON public.patient_profiles (hospital_id);
