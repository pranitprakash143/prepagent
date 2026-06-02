from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: Optional[str] = None


class DocumentRead(BaseModel):
    id: str
    title: Optional[str]
    file_name: str
    file_size: Optional[str]
    status: str
    subject_id: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
