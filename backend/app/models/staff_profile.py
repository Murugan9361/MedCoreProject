from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.enums import Gender


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    employee_id = Column(String(255), unique=True, nullable=False)

    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    phone = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=False)

    street = Column(String(255), nullable=False)
    street2 = Column(String(255), nullable=True)
    city = Column(String(255), nullable=False)
    state = Column(String(255), nullable=False)
    postal_code = Column(String(255), nullable=False)

    designation = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    date_of_joining = Column(Date, nullable=False)

    emergency_contact_name = Column(String(255), nullable=False)
    emergency_contact_phone = Column(String(255), nullable=False)

    user = relationship("User", back_populates="staff_profile")
