import logging
from datetime import datetime

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()


async def _check_database() -> str:
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return "healthy"
    except Exception as exc:
        logger.warning("Database health check failed: %s", exc)
        return "unhealthy"


async def _check_pgvector() -> str:
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            result = await db.execute(
                text(
                    "SELECT udt_name FROM information_schema.columns "
                    "WHERE table_name = 'chunks' AND column_name = 'embedding'"
                )
            )
            row = result.scalar()
            if row is None:
                logger.warning("pgvector check: chunks.embedding column not found")
                return "degraded"
            if "vector" not in str(row).lower():
                logger.warning(
                    "pgvector check: chunks.embedding type is %s, expected vector",
                    row,
                )
                return "degraded"
            result2 = await db.execute(
                text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL")
            )
            count = result2.scalar()
            logger.info("pgvector check: %d chunks with embeddings", count or 0)
        return "healthy"
    except Exception as exc:
        logger.warning("pgvector health check failed: %s", exc)
        return "unhealthy"


async def _check_embedding_model() -> str:
    try:
        from sentence_transformers import SentenceTransformer
        from app.core.config import settings

        model = SentenceTransformer(settings.EMBEDDING_MODEL)
        _ = model.encode(["health check"])
        return "healthy"
    except Exception as exc:
        logger.warning("Embedding model health check failed: %s", exc)
        return "degraded"


@router.get("/health")
async def health_check():
    database = await _check_database()
    pgvector = await _check_pgvector()
    embedding_model = await _check_embedding_model()

    checks = {
        "database": database,
        "pgvector": pgvector,
        "embedding_model": embedding_model,
    }

    all_healthy = all(v == "healthy" for v in checks.values())
    status = (
        "ok"
        if all_healthy
        else "degraded"
        if "unhealthy" not in checks.values()
        else "unhealthy"
    )

    return {
        "status": status,
        "checks": checks,
    }
