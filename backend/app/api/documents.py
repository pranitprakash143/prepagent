import asyncio
import json
import os
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.chunk import Chunk
from app.models.user import User
from app.graphs.fact_verifier_node import (
    compute_hallucination_score,
    verify_content_claims,
)
from app.schemas.ai import (
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    QuizGenerateRequest,
    QuizGenerateResponse,
)
from app.schemas.document import DocumentRead
from app.services.ai_service import generate_flashcards, generate_quiz
from app.services.document_service import (
    create_document,
    delete_document,
    get_document,
    get_user_documents,
    process_document_task,
)
from app.services.progress_tracker import tracker
from app.services.storage_service import save_upload_file

router = APIRouter()


def is_allowed_file(file_name: str) -> bool:
    allowed = [
        ext.strip().lower()
        for ext in settings.ALLOWED_DOCUMENT_TYPES.split(",")
        if ext.strip()
    ]
    extension = os.path.splitext(file_name)[1].lower().strip(".")
    return extension in allowed


@router.post("/upload", response_model=DocumentRead, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    subject_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported document type.")

    saved_path = await save_upload_file(file)
    file_size = file.size
    document = await create_document(
        db,
        file_name=file.filename,
        file_path=saved_path,
        file_size=file_size,
        title=title,
        user_id=current_user.id,
        tenant_id=current_user.id,
        subject_id=subject_id,
    )
    background_tasks.add_task(
        process_document_task, document.id, saved_path, current_user.id
    )
    return document


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = await get_user_documents(
        db, current_user.id, current_user.id, skip=skip, limit=limit
    )
    return documents


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document_by_id(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.tenant_id != current_user.id or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


@router.delete("/{document_id}")
async def delete_document_by_id(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.tenant_id != current_user.id or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    await delete_document(db, document_id)
    return {"detail": "Document deleted"}


@router.get("/{document_id}/progress")
async def document_progress(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.tenant_id != current_user.id or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

    async def event_stream():
        history = tracker.get_history(document_id)
        for event in history:
            yield f"data: {event.model_dump_json()}\n\n"
            if event.stage in ("done", "failed"):
                return

        try:
            queue = await tracker.subscribe(document_id)
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                    if event.stage in ("done", "failed"):
                        return
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'stage': 'heartbeat', 'progress': -1, 'message': ''})}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post(
    "/{document_id}/generate-flashcards", response_model=FlashcardGenerateResponse
)
async def generate_flashcards_endpoint(
    document_id: str,
    body: FlashcardGenerateRequest = FlashcardGenerateRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.tenant_id != current_user.id or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = await db.execute(
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .where(Chunk.tenant_id == current_user.id)
        .order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no processed chunks.")

    full_text = "\n\n".join(c.content for c in chunks)
    flashcards = await generate_flashcards(full_text, count=body.count)

    source_chunks = [{"id": c.id, "content": c.content} for c in chunks]
    content_items = [
        {"question": fc.question, "answer": fc.answer} for fc in flashcards
    ]
    claims = await verify_content_claims(content_items, full_text, source_chunks)
    hallucination_score = compute_hallucination_score(claims)
    for fc in flashcards:
        if fc.verification is None:
            from app.schemas.ai import VerificationResult

            fc.verification = VerificationResult()
        fc.verification.claims = claims
        fc.verification.hallucination_score = hallucination_score
        if hallucination_score > 0.3:
            fc.verification.warnings.append(
                "High hallucination score — flagged for human review"
            )

    filtered = [
        fc
        for fc in flashcards
        if fc.verification
        and fc.verification.confidence >= body.confidence_threshold
        and hallucination_score <= 0.7
    ]
    return FlashcardGenerateResponse(flashcards=filtered)


@router.post("/{document_id}/generate-quiz", response_model=QuizGenerateResponse)
async def generate_quiz_endpoint(
    document_id: str,
    body: QuizGenerateRequest = QuizGenerateRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.tenant_id != current_user.id or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = await db.execute(
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .where(Chunk.tenant_id == current_user.id)
        .order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no processed chunks.")

    full_text = "\n\n".join(c.content for c in chunks)
    questions = await generate_quiz(full_text, count=body.count)

    source_chunks = [{"id": c.id, "content": c.content} for c in chunks]
    content_items = [
        {
            "question": q.question,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
        }
        for q in questions
    ]
    claims = await verify_content_claims(content_items, full_text, source_chunks)
    hallucination_score = compute_hallucination_score(claims)
    for q in questions:
        if q.verification is None:
            from app.schemas.ai import VerificationResult

            q.verification = VerificationResult()
        q.verification.claims = claims
        q.verification.hallucination_score = hallucination_score
        if hallucination_score > 0.3:
            q.verification.warnings.append(
                "High hallucination score — flagged for human review"
            )

    filtered = [
        q
        for q in questions
        if q.verification
        and q.verification.confidence >= body.confidence_threshold
        and hallucination_score <= 0.7
    ]
    return QuizGenerateResponse(questions=filtered)
