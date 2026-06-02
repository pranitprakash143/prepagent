import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    subject_id = Column(String(length=36), ForeignKey("subjects.id"), nullable=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    difficulty = Column(Integer, default=0, nullable=False)
    next_review = Column(DateTime(timezone=True), nullable=True)
    repetitions = Column(Integer, default=0, nullable=False)
    interval_days = Column(Integer, default=0, nullable=False)
    ease_factor = Column(Float, default=2.5, nullable=False)
    verified_claims = Column(JSON, nullable=True)
    hallucination_score = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = relationship("User", backref="flashcards")
    subject = relationship("Subject", backref="flashcards")
