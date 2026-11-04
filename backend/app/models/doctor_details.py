from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class DoctorDetails(Base):
    __tablename__ = "doctor_details"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    specialization = Column(String(255), nullable=False)
    qualification = Column(String(255), nullable=False)
    registration_number = Column(String(255), unique=True, nullable=False)
    years_of_experience = Column(Integer, nullable=False)
    consultation_fee = Column(Numeric(10, 2), nullable=True)
    languages_spoken = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)

    user = relationship("User", back_populates="doctor_details")
