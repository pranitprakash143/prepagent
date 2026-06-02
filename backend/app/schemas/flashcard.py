from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FlashcardCreate(BaseModel):
    front: str
    back: str
    subject_id: Optional[str] = None


class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    subject_id: Optional[str] = None


class FlashcardResponse(BaseModel):
    id: str
    front: str
    back: str
    subject_id: Optional[str] = None
    difficulty: int = 0
    next_review: Optional[datetime] = None
    repetitions: int = 0
    interval_days: int = 0
    ease_factor: float = 2.5
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=5)
