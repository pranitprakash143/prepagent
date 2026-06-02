import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=True)
    title = Column(String(length=255), nullable=True)
    file_name = Column(String(length=255), nullable=False)
    file_path = Column(String(length=1024), nullable=False)
    file_size = Column(String(length=50), nullable=True)
    status = Column(String(length=50), nullable=False, default="queued")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    owner = relationship("User", backref="documents")
    subject_id = Column(String(length=36), ForeignKey("subjects.id"), nullable=True)
    subject = relationship("Subject", backref="documents")
