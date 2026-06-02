import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    email = Column(String(length=255), unique=True, index=True, nullable=False)
    full_name = Column(String(length=255), nullable=True)
    hashed_password = Column(String(length=255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    plan = Column(String(length=20), default="FREE", nullable=False)
    stripe_id = Column(String(length=255), nullable=True, unique=True)
    study_streak = Column(Integer, default=0, nullable=False)
    study_streak_last_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
