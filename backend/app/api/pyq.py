from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.pyq import GapAnalysisResponse
from app.services.pyq_service import analyze_gap

router = APIRouter(prefix="/pyq", tags=["pyq"])


@router.get("/gap-analysis", response_model=GapAnalysisResponse)
async def gap_analysis(
    subject_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await analyze_gap(
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.id,
        subject_id=subject_id,
    )
    return result
