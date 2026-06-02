from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.socratic import SocraticRequest, SocraticResponse
from app.services.socratic_service import socratic_tutor

router = APIRouter(prefix="/socratic", tags=["socratic"])


@router.post("/tutor", response_model=SocraticResponse)
async def socratic_tutor_endpoint(
    body: SocraticRequest,
    current_user: User = Depends(get_current_user),
):
    result = await socratic_tutor(
        question=body.question,
        correct_answer=body.correct_answer,
        context=body.context,
        history=body.history,
    )
    return result
