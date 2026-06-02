import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Mapping, Optional, Union

import numpy as np
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "prepagent_documents"

_executor = ThreadPoolExecutor(max_workers=1)
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


async def _embed(texts: List[str]) -> List[List[float]]:
    loop = asyncio.get_event_loop()
    model = await loop.run_in_executor(_executor, _get_model)
    embeddings = await loop.run_in_executor(
        _executor, model.encode, texts, False, None, 64, False
    )
    return [emb.tolist() for emb in embeddings]


async def create_collection_if_needed() -> None:
    logger.info("pgvector enabled — no collection setup needed.")


async def add_documents_to_chroma(
    texts: List[str],
    metadatas: List[Mapping[str, Union[str, int, float, bool]]],
    ids: List[str],
) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.chunk import Chunk

    start = time.monotonic()
    try:
        embeddings = await _embed(texts)
        async with AsyncSessionLocal() as db:
            for i, text in enumerate(texts):
                md = metadatas[i] if i < len(metadatas) else {}
                chunk_id = ids[i] if i < len(ids) else str(uuid.uuid4())
                existing = (
                    (await db.execute(select(Chunk).where(Chunk.id == chunk_id)))
                    .scalars()
                    .first()
                )

                emb_array = np.array(embeddings[i], dtype=np.float32)
                if existing:
                    existing.content = text
                    existing.chunk_index = md.get("chunk_index", 0)
                    existing.embedding = emb_array
                else:
                    chunk = Chunk(
                        id=chunk_id,
                        tenant_id=str(md.get("tenant_id", "")),
                        user_id=str(md.get("user_id", "")),
                        document_id=str(md.get("document_id", "")),
                        content=text,
                        chunk_index=md.get("chunk_index", 0),
                        embedding=emb_array,
                    )
                    db.add(chunk)
            await db.commit()
        elapsed = time.monotonic() - start
        if elapsed > 1.0:
            logger.warning(
                "Slow vector ingestion: %.2fs for %d documents",
                elapsed,
                len(texts),
            )
        else:
            logger.info("Vector ingestion: %.2fs for %d documents", elapsed, len(texts))
    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.warning("Vector document ingestion failed after %.2fs: %s", elapsed, exc)


async def query_chroma(
    query_text: str,
    n_results: int = 10,
    where_filter: Optional[Dict[str, Any]] = None,
) -> Optional[List[Dict[str, Any]]]:
    from app.core.database import AsyncSessionLocal
    from app.models.chunk import Chunk
    from app.models.document import Document

    start = time.monotonic()
    try:
        query_embedding = (await _embed([query_text]))[0]
        emb_array = np.array(query_embedding, dtype=np.float32)

        async with AsyncSessionLocal() as db:
            stmt = (
                select(Chunk, Document.file_name)
                .join(Document, Chunk.document_id == Document.id)
                .order_by(Chunk.embedding.cosine_distance(emb_array))
                .limit(n_results)
            )

            if where_filter:
                for key, value in where_filter.items():
                    if key not in Chunk.__table__.columns:
                        logger.warning(
                            "where_filter key '%s' not found on Chunk model — skipping filter",
                            key,
                        )
                        continue
                    col = getattr(Chunk, key, None)
                    if col is not None:
                        stmt = stmt.where(col == value)

            rows = (await db.execute(stmt)).all()

            results = []
            for chunk, file_name in rows:
                results.append(
                    {
                        "id": chunk.id,
                        "document_id": chunk.document_id,
                        "file_name": file_name or "",
                        "chunk_index": chunk.chunk_index,
                        "text": chunk.content,
                        "score": 1.0,
                    }
                )
            return results
    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.warning("Vector query failed after %.2fs: %s", elapsed, exc)
        return None
    finally:
        elapsed = time.monotonic() - start
        if elapsed > 1.0:
            logger.warning(
                "Slow vector query: %.2fs for %d results", elapsed, n_results
            )
        else:
            logger.info("Vector query: %.2fs for %d results", elapsed, n_results)
