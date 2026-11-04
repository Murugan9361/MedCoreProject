from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.enums import Gender, MaritalStatus, BloodType

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True, index=True)

    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)

    # person filling out the form, if not the patient
    filler_first_name = Column(String(255), nullable=True)
    filler_last_name = Column(String(255), nullable=True)

    phone = Column(String(255), nullable=False)

    street = Column(String(255), nullable=False)
    street2 = Column(String(255), nullable=True)
    city = Column(String(255), nullable=False)
    state = Column(String(255), nullable=False)
    postal_code = Column(String(255), nullable=False)

    date_of_birth = Column(Date, nullable=False)
    place_of_birth = Column(String(255), nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    marital_status = Column(Enum(MaritalStatus), nullable=False)
    health_change_trigger = Column(Text, nullable=False)
    blood_type = Column(Enum(BloodType), nullable=False)

    user = relationship("User", back_populates="profile")