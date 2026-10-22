from sqlalchemy import Column, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.enums import Shift


class AttenderDetails(Base):
    __tablename__ = "attender_details"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    shift = Column(Enum(Shift), nullable=False)

    user = relationship(
        "User",
        back_populates="attender_details",
        foreign_keys=[user_id],
    )
