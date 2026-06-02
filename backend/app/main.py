"""
FastAPI main application entry point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.api import (
    auth,
    dashboard,
    documents,
    flashcards,
    health,
    notes,
    payments,
    pyq,
    search,
    socratic,
    subjects,
    users,
)
from app.api.auth import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.database import Base, engine
from sqlalchemy import text
from app.core.exceptions import (
    AppException,
    ConflictException,
    ForbiddenException,
    InternalServerException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.observability import RequestLoggingMiddleware
from app.core.cache import init_redis, close_redis

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting PrepAgent SaaS - Environment: {settings.ENVIRONMENT}")
    async with engine.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await connection.run_sync(Base.metadata.create_all)
    await init_redis()
    yield
    await close_redis()
    logger.info("Shutting down PrepAgent SaaS")


def create_app() -> FastAPI:
    app = FastAPI(
        title="PrepAgent SaaS API",
        description="AI-powered study assistant for competitive exams",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code, "field": exc.field},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        errors = exc.errors()
        first_error = errors[0] if errors else {}
        field = (
            ".".join(str(p) for p in first_error.get("loc", []))
            if first_error.get("loc")
            else None
        )
        return JSONResponse(
            status_code=422,
            content={
                "detail": first_error.get("msg", "Validation error"),
                "code": "VALIDATION_ERROR",
                "field": field,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "code": "INTERNAL_ERROR",
                "field": None,
            },
        )

    app.include_router(
        auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"]
    )
    app.include_router(users.router, prefix=settings.API_V1_PREFIX, tags=["users"])
    app.include_router(health.router, prefix=settings.API_V1_PREFIX, tags=["health"])
    app.include_router(
        documents.router,
        prefix=f"{settings.API_V1_PREFIX}/documents",
        tags=["documents"],
    )
    app.include_router(search.router, prefix=settings.API_V1_PREFIX, tags=["search"])
    app.include_router(pyq.router, prefix=settings.API_V1_PREFIX, tags=["pyq"])
    app.include_router(
        socratic.router, prefix=settings.API_V1_PREFIX, tags=["socratic"]
    )
    app.include_router(
        dashboard.router, prefix=settings.API_V1_PREFIX, tags=["dashboard"]
    )
    app.include_router(
        subjects.router, prefix=settings.API_V1_PREFIX, tags=["subjects"]
    )
    app.include_router(notes.router, prefix=settings.API_V1_PREFIX, tags=["notes"])
    app.include_router(
        flashcards.router, prefix=settings.API_V1_PREFIX, tags=["flashcards"]
    )
    app.include_router(
        payments.router, prefix=settings.API_V1_PREFIX, tags=["payments"]
    )

    logger.info("FastAPI application created successfully")
    return app


app = create_app()
