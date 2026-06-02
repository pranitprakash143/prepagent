import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    flashcard_id = Column(String(length=36), ForeignKey("flashcards.id"), nullable=True)
    statement = Column(Text, nullable=False)
    chunk_id = Column(String(length=36), ForeignKey("chunks.id"), nullable=True)
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    flashcard = relationship("Flashcard", backref="claims")
    chunk = relationship("Chunk", backref="claims")
