from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConsultationRecord(Base):
    __tablename__ = "consultation_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hospital_id = Column(
        Integer, ForeignKey("hospitals.id"), nullable=False, index=True
    )
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    note = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=True)
    prescription = Column(JSON(none_as_null=True), nullable=True)
    advice = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )

    author = relationship("User", foreign_keys=[author_id])

    @property
    def author_name(self) -> str:
        return self.author.full_name
