import uuid
from datetime import datetime

import numpy as np
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(length=36), index=True, nullable=False)
    user_id = Column(String(length=36), ForeignKey("users.id"), nullable=False)
    document_id = Column(String(length=36), ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(384), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = relationship("Document", backref="chunks")
