from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class PYQResponse(BaseModel):
    id: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    year: Optional[int] = None
    exam_type: Optional[str] = None
    explanation: Optional[str] = None
    subject_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GapItem(BaseModel):
    pyq_id: str
    question: str
    topic: str
    year: Optional[int] = None
    exam_type: Optional[str] = None
    coverage_score: float
    is_gap: bool
    matched_chunks: List[str] = []


class GapAnalysisResponse(BaseModel):
    subject_id: Optional[str] = None
    total_pyqs: int = 0
    covered_pyqs: int = 0
    gap_pyqs: int = 0
    coverage_percentage: float = 0.0
    gaps: List[GapItem] = []
    strengths: List[str] = []
    weak_areas: List[str] = []
    recommendations: List[str] = []
