import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


def serialize_tags(tags: Optional[list[str]]) -> Optional[str]:
    if tags is None:
        return None
    return json.dumps(tags)


def deserialize_tags(tags_str: Optional[str]) -> list[str]:
    if not tags_str:
        return []
    try:
        return json.loads(tags_str)
    except (json.JSONDecodeError, TypeError):
        return []


@router.post("", response_model=NoteResponse, status_code=201)
async def create_note(
    note: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_note = Note(
        tenant_id=current_user.id,
        user_id=current_user.id,
        title=note.title,
        content=note.content,
        tags=serialize_tags(note.tags),
    )
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return NoteResponse(
        id=db_note.id,
        title=db_note.title,
        content=db_note.content,
        tags=deserialize_tags(db_note.tags),
        created_at=db_note.created_at,
        updated_at=db_note.updated_at,
    )


@router.get("")
async def list_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10,
    tag: Optional[str] = None,
):
    stmt = (
        select(Note)
        .where(
            Note.tenant_id == current_user.id,
            Note.user_id == current_user.id,
        )
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    notes = result.scalars().all()

    if tag:
        notes = [n for n in notes if tag in deserialize_tags(n.tags)]

    return [
        NoteResponse(
            id=n.id,
            title=n.title,
            content=n.content,
            tags=deserialize_tags(n.tags),
            created_at=n.created_at,
            updated_at=n.updated_at,
        )
        for n in notes
    ]


@router.get("/tags")
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Note)
        .where(
            Note.tenant_id == current_user.id,
            Note.user_id == current_user.id,
        )
        .order_by(Note.created_at.desc())
    )
    result = await db.execute(stmt)
    notes = result.scalars().all()
    all_tags: set[str] = set()
    for n in notes:
        all_tags.update(deserialize_tags(n.tags))
    return {"tags": sorted(all_tags)}


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(
            Note.id == note_id,
            Note.tenant_id == current_user.id,
            Note.user_id == current_user.id,
        )
    )
    note = result.scalars().first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        tags=deserialize_tags(note.tags),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(
            Note.id == note_id,
            Note.tenant_id == current_user.id,
            Note.user_id == current_user.id,
        )
    )
    note = result.scalars().first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    if note_update.title is not None:
        note.title = note_update.title
    if note_update.content is not None:
        note.content = note_update.content
    if note_update.tags is not None:
        note.tags = serialize_tags(note_update.tags)

    await db.commit()
    await db.refresh(note)
    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        tags=deserialize_tags(note.tags),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(
            Note.id == note_id,
            Note.tenant_id == current_user.id,
            Note.user_id == current_user.id,
        )
    )
    note = result.scalars().first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
    return {"detail": "Note deleted"}
