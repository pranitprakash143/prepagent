from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    Token,
    TokenRefresh,
    UserCreate,
    UserRead,
)
from app.services.auth_service import authenticate_user, create_user

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


def _rate_limit(key: str):
    if settings.RATE_LIMIT_ENABLED:
        return limiter.limit(key)
    return limiter.limit("10000/minute")


@router.post("/signup", response_model=UserRead, status_code=201)
@_rate_limit(settings.AUTH_RATE_LIMIT)
async def signup(
    request: Request,
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    existing_user = await db.execute(
        select(User).where(User.email == user_create.email)
    )
    if existing_user.scalars().first() is not None:
        raise ConflictException("A user with this email already exists.")

    user = await create_user(db, user_create)
    return user


@router.post("/login", response_model=Token)
@_rate_limit(settings.AUTH_RATE_LIMIT)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, credentials.email, credentials.password)
    if user is None:
        raise UnauthorizedException("Invalid email or password")

    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenRefresh)
@_rate_limit(settings.AUTH_RATE_LIMIT)
async def refresh_token(
    request: Request,
    body: RefreshRequest,
):
    from jose import JWTError, jwt

    from app.core.config import settings

    credentials_exception = UnauthorizedException("Invalid or expired refresh token")
    try:
        payload = jwt.decode(
            body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    new_access_token = create_access_token(subject=email)
    new_refresh_token = create_refresh_token(subject=email)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/change-password")
@_rate_limit(settings.AUTH_RATE_LIMIT)
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise UnauthorizedException("Current password is incorrect")

    current_user.hashed_password = get_password_hash(body.new_password)
    db.add(current_user)
    await db.commit()

    return {"detail": "Password changed successfully"}
