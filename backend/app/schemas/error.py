from pydantic import BaseModel
from typing import Optional


class ErrorResponse(BaseModel):
    detail: str
    code: str
    field: Optional[str] = None
