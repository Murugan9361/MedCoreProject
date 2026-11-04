ALTER TABLE patient_profiles
ADD COLUMN hospital_id INTEGER NULL,
ADD CONSTRAINT fk_patient_profiles_hospital_id
    FOREIGN KEY (hospital_id) REFERENCES hospitals (id);

CREATE INDEX ix_patient_profiles_hospital_id
ON patient_profiles (hospital_id);
