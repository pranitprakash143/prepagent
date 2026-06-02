from fastapi import Depends, HTTPException

from app.core.security import get_current_user
from app.models.user import User


def require_pro_plan(current_user: User = Depends(get_current_user)) -> User:
    if current_user.plan != "PRO":
        raise HTTPException(
            status_code=403,
            detail="This feature requires a PRO subscription. Please upgrade your plan.",
        )
    return current_user
