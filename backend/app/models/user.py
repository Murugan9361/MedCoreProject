from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.enums import Role

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    must_change_password = Column(Boolean, default=False)
    profile = relationship("PatientProfile", back_populates="user", uselist=False)
    staff_profile = relationship("StaffProfile", back_populates="user", uselist=False)
    doctor_details = relationship("DoctorDetails", back_populates="user", uselist=False)
    attender_details = relationship(
        "AttenderDetails",
        back_populates="user",
        uselist=False,
        foreign_keys="AttenderDetails.user_id",
    )
