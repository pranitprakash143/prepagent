from typing import List, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class SocraticRequest(BaseModel):
    question: str
    correct_answer: Optional[str] = None
    context: Optional[str] = None
    history: List[Message] = Field(default_factory=list)


class SocraticResponse(BaseModel):
    reply: str
    reveal_answer: bool = False
    answer: Optional[str] = None
    hints_used: int = 0
