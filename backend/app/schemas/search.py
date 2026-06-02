from typing import Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    query: str
    source: Optional[str] = None
    document_id: Optional[str] = None
    subject_id: Optional[str] = None
    limit: int = 10


class SearchResultItem(BaseModel):
    id: str
    source: str
    title: str
    snippet: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
    total: int
