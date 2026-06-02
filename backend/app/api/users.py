from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get the current authenticated user's profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name or "",
        is_active=current_user.is_active,
        plan=current_user.plan,
        tenant_id=current_user.tenant_id,
        created_at=current_user.created_at,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_update: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the current authenticated user's profile."""
    if "full_name" in profile_update:
        current_user.full_name = profile_update["full_name"]

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name or "",
        is_active=current_user.is_active,
        plan=current_user.plan,
        tenant_id=current_user.tenant_id,
        created_at=current_user.created_at,
    )
