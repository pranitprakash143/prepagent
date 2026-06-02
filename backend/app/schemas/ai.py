from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CitationSpan(BaseModel):
    chunk_id: str = ""
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    confidence: float = 0.0


class VerificationResult(BaseModel):
    verified: bool = False
    confidence: float = 0.0
    source_verified: bool = False
    fact_verified: bool = False
    warnings: List[str] = Field(default_factory=list)
    claims: List[Dict[str, Any]] = Field(default_factory=list)
    hallucination_score: float = 0.0


class FlashcardItem(BaseModel):
    question: str
    answer: str
    source_chunk: Optional[str] = None
    source_chunk_id: Optional[str] = None
    verification: Optional[VerificationResult] = None


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    source_chunk: Optional[str] = None
    source_chunk_id: Optional[str] = None
    verification: Optional[VerificationResult] = None


class FlashcardGenerateRequest(BaseModel):
    count: int = Field(
        default=5, ge=1, le=50, description="Number of flashcards to generate"
    )
    confidence_threshold: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Minimum confidence score (0-1). Items below this are excluded.",
    )


class FlashcardGenerateResponse(BaseModel):
    flashcards: List[FlashcardItem] = Field(default_factory=list)


class QuizGenerateRequest(BaseModel):
    count: int = Field(
        default=10, ge=1, le=50, description="Number of quiz questions to generate"
    )
    confidence_threshold: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Minimum confidence score (0-1). Items below this are excluded.",
    )


class QuizGenerateResponse(BaseModel):
    questions: List[QuizQuestion] = Field(default_factory=list)
