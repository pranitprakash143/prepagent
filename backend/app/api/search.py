import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.services.chroma_service import query_chroma

from app.models.note import Note

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = body.query.strip()
    if not query:
        return SearchResponse(results=[], total=0)

    results: List[SearchResultItem] = []
    seen_ids: set = set()

    if body.source in (None, "document"):
        where_filter = {
            "tenant_id": current_user.id,
            "user_id": current_user.id,
        }
        if body.document_id:
            where_filter["document_id"] = body.document_id
        elif body.subject_id:
            where_filter["subject_id"] = body.subject_id

        chroma_results = await query_chroma(
            query, n_results=body.limit, where_filter=where_filter
        )

        if chroma_results is not None and len(chroma_results) == 0:
            logger.warning(
                "Vector search returned 0 results for query '%s'. "
                "Check chunks.embedding column — may need re-indexing.",
                query[:50],
            )

        if chroma_results is not None:
            for r in chroma_results:
                doc_id = r["document_id"]
                if doc_id in seen_ids:
                    continue
                seen_ids.add(doc_id)
                results.append(
                    SearchResultItem(
                        id=r["id"],
                        source="document",
                        title=r["file_name"],
                        snippet=r["text"][:300],
                        score=r["score"],
                    )
                )
        else:
            stmt = (
                select(Chunk, Document)
                .join(Document, Chunk.document_id == Document.id)
                .where(Document.tenant_id == current_user.id)
                .where(Document.user_id == current_user.id)
                .where(Chunk.content.ilike(f"%{query}%"))
                .limit(body.limit)
            )
            if body.document_id:
                stmt = stmt.where(Chunk.document_id == body.document_id)
            elif body.subject_id:
                stmt = stmt.where(Document.subject_id == body.subject_id)

            rows = await db.execute(stmt)
            for chunk, doc in rows.unique().all():
                if doc.id in seen_ids:
                    continue
                seen_ids.add(doc.id)
                results.append(
                    SearchResultItem(
                        id=chunk.id,
                        source="document",
                        title=doc.file_name,
                        snippet=chunk.content[:300],
                        score=0.5,
                    )
                )

    if body.source in (None, "note"):
        note_stmt = (
            select(Note)
            .where(Note.tenant_id == current_user.id)
            .where(Note.user_id == current_user.id)
            .where(Note.title.ilike(f"%{query}%") | Note.content.ilike(f"%{query}%"))
            .limit(body.limit)
        )
        note_rows = await db.execute(note_stmt)
        for note in note_rows.scalars().all():
            if note.id in seen_ids:
                continue
            seen_ids.add(note.id)
            content = note.content or ""
            idx = content.lower().find(query.lower())
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(content), idx + len(query) + 100)
                snippet = (
                    ("..." if start > 0 else "")
                    + content[start:end]
                    + ("..." if end < len(content) else "")
                )
            else:
                snippet = content[:300]
            results.append(
                SearchResultItem(
                    id=note.id,
                    source="note",
                    title=note.title or "Untitled",
                    snippet=snippet,
                    score=0.8,
                )
            )

    results.sort(key=lambda r: r.score, reverse=True)
    return SearchResponse(results=results[: body.limit], total=len(results))
