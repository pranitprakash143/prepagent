import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    provider = Column(String(length=20), nullable=False)
    provider_payment_id = Column(String(length=255), nullable=True)
    provider_order_id = Column(String(length=255), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(length=10), default="INR", nullable=False)
    status = Column(String(length=20), default="pending", nullable=False)
    plan = Column(String(length=20), nullable=False)
    interval = Column(String(length=10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
