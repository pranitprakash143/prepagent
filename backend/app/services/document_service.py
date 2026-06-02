import logging
from pathlib import Path
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.chroma_service import add_documents_to_chroma
from app.services.ocr_service import extract_text_from_image
from app.services.progress_tracker import tracker
from app.services.text_cleaner import clean_text

logger = logging.getLogger(__name__)
UPLOAD_DIR = Path("/app/uploads")


async def create_document(
    db: AsyncSession,
    file_name: str,
    file_path: str,
    file_size: Optional[int] = None,
    title: Optional[str] = None,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    subject_id: Optional[str] = None,
) -> Document:
    document = Document(
        title=title,
        file_name=file_name,
        file_path=file_path,
        file_size=str(file_size) if file_size else None,
        status="queued",
        user_id=user_id,
        tenant_id=tenant_id,
        subject_id=subject_id,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


async def get_document(db: AsyncSession, document_id: str) -> Optional[Document]:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalars().first()


async def get_user_documents(
    db: AsyncSession, user_id: str, tenant_id: str, skip: int = 0, limit: int = 50
) -> List[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .where(Document.tenant_id == tenant_id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_user_document_count(
    db: AsyncSession, user_id: str, tenant_id: str
) -> int:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .where(Document.tenant_id == tenant_id)
    )
    return len(result.scalars().all())


async def update_document_status(
    db: AsyncSession, document_id: str, status: str
) -> None:
    await db.execute(
        update(Document).where(Document.id == document_id).values(status=status)
    )
    await db.commit()


async def delete_document(db: AsyncSession, document_id: str) -> bool:
    doc = await get_document(db, document_id)
    if doc is None:
        return False
    await db.delete(doc)
    await db.commit()
    return True


def extract_text_from_pdf(file_path: Path) -> str:
    import fitz

    doc = fitz.open(str(file_path))
    pages = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text)
    doc.close()
    return "\n\n".join(pages)


def extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    if ext in (".jpg", ".jpeg", ".png"):
        result = extract_text_from_image(file_path)
        if result:
            return result
    return ""


def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start = end - overlap
    return chunks


async def process_document(
    db: AsyncSession, document_id: str, file_path: str, tenant_id: str
) -> None:
    tracker.create_task(document_id)
    await update_document_status(db, document_id, "processing")

    try:
        await tracker.update(
            document_id, "extracting", 10, "Extracting text from document..."
        )
        path = Path(file_path)
        text = extract_text(path)

        if not text.strip():
            raise ValueError("No text could be extracted from the document.")

        await tracker.update(
            document_id, "cleaning", 20, "Cleaning and normalizing text..."
        )
        text = clean_text(text)

        if not text.strip():
            raise ValueError("Text was empty after cleaning.")

        await tracker.update(
            document_id, "chunking", 30, "Splitting text into chunks..."
        )
        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

        if not chunks:
            raise ValueError("Document text produced zero chunks.")

        await tracker.update(
            document_id,
            "embedding",
            50,
            f"Generated {len(chunks)} chunks, generating embeddings...",
        )
        ids = [f"{document_id}-{idx}" for idx in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "file_name": path.name,
                "chunk_index": idx,
                "tenant_id": tenant_id,
                "user_id": tenant_id,
            }
            for idx in range(len(chunks))
        ]

        await tracker.update(
            document_id, "indexing", 70, "Indexing chunks with pgvector..."
        )
        await add_documents_to_chroma(chunks, metadatas, ids)

        await update_document_status(db, document_id, "done")
        await tracker.update(
            document_id, "done", 100, "Document processed successfully"
        )
    except Exception as exc:
        logger.exception("Failed to process document %s", document_id)
        await update_document_status(db, document_id, "failed")
        await tracker.update(document_id, "failed", 0, f"Processing failed: {str(exc)}")


async def process_document_task(
    document_id: str, file_path: str, tenant_id: str
) -> None:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await process_document(db, document_id, file_path, tenant_id)
