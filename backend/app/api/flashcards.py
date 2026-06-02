from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.flashcard import Flashcard
from app.models.user import User
from app.schemas.flashcard import FlashcardResponse, ReviewRequest
from app.services.sm2 import apply_sm2

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

_MAX_DAILY_REVIEWS = 100


def _flashcard_to_response(f: Flashcard) -> FlashcardResponse:
    return FlashcardResponse(
        id=f.id,
        front=f.front,
        back=f.back,
        subject_id=f.subject_id,
        difficulty=f.difficulty,
        next_review=f.next_review,
        repetitions=f.repetitions,
        interval_days=f.interval_days,
        ease_factor=f.ease_factor,
        created_at=f.created_at,
        updated_at=f.updated_at,
    )


async def _update_streak(db: AsyncSession, user: User) -> None:
    today = date.today()
    if user.study_streak_last_date == today:
        return

    if user.study_streak_last_date and (today - user.study_streak_last_date).days == 1:
        user.study_streak = (user.study_streak or 0) + 1
    else:
        user.study_streak = 1

    user.study_streak_last_date = today
    await db.commit()


@router.post("/{flashcard_id}/review", response_model=FlashcardResponse)
async def review_flashcard(
    flashcard_id: str,
    review: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    if (
        hasattr(current_user, "study_streak_last_date")
        and current_user.study_streak_last_date == today
    ):
        from sqlalchemy import func as sqlfunc

        count_result = await db.execute(
            select(sqlfunc.count(Flashcard.id)).where(
                Flashcard.user_id == current_user.id,
                sqlfunc.date(Flashcard.updated_at) == today,
            )
        )
        daily_count = count_result.scalar() or 0
        if daily_count >= _MAX_DAILY_REVIEWS:
            raise HTTPException(
                status_code=429,
                detail=f"Daily review limit of {_MAX_DAILY_REVIEWS} reached.",
            )

    result = await db.execute(
        select(Flashcard).where(
            Flashcard.id == flashcard_id,
            Flashcard.tenant_id == current_user.id,
            Flashcard.user_id == current_user.id,
        )
    )
    f = result.scalars().first()
    if f is None:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    apply_sm2(f, review.quality)

    await _update_streak(db, current_user)

    await db.commit()
    await db.refresh(f)
    return _flashcard_to_response(f)


@router.get("/streak")
async def get_streak(current_user: User = Depends(get_current_user)):
    return {
        "streak": current_user.study_streak or 0,
        "last_study_date": (
            str(current_user.study_streak_last_date)
            if hasattr(current_user, "study_streak_last_date")
            and current_user.study_streak_last_date
            else None
        ),
    }
