import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class PYQ(Base):
    __tablename__ = "pyqs"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    subject_id = Column(String(length=36), ForeignKey("subjects.id"), nullable=True)
    question = Column(Text, nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(String(length=500), nullable=False)
    year = Column(Integer, nullable=True)
    exam_type = Column(String(length=100), nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    subject = relationship("Subject", backref="pyqs")
