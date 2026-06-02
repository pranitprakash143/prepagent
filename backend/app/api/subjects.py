from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import get_current_user
from app.models.subject import Subject
from app.models.user import User

router = APIRouter(prefix="/subjects", tags=["subjects"])


class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SubjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.get("", response_model=list[SubjectResponse])
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    result = await db.execute(
        select(Subject)
        .where(
            Subject.tenant_id == str(current_user.id),
            Subject.user_id == str(current_user.id),
        )
        .offset(skip)
        .limit(limit)
    )
    subjects = result.scalars().all()
    return [
        SubjectResponse(
            id=s.id,
            name=s.name,
            description=getattr(s, "description", None),
            created_at=s.created_at.isoformat() if s.created_at else None,
            updated_at=s.updated_at.isoformat() if s.updated_at else None,
        )
        for s in subjects
    ]


@router.post("", response_model=SubjectResponse, status_code=201)
async def create_subject(
    subject_in: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Subject).where(
            Subject.tenant_id == str(current_user.id),
            Subject.name == subject_in.name,
        )
    )
    if existing.scalars().first() is not None:
        raise ConflictException(f"Subject '{subject_in.name}' already exists")

    subject = Subject(
        id=str(uuid4()),
        tenant_id=str(current_user.id),
        user_id=str(current_user.id),
        name=subject_in.name,
    )
    if subject_in.description:
        setattr(subject, "description", subject_in.description)

    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=getattr(subject, "description", None),
        created_at=subject.created_at.isoformat() if subject.created_at else None,
        updated_at=subject.updated_at.isoformat() if subject.updated_at else None,
    )


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.tenant_id == str(current_user.id),
            Subject.user_id == str(current_user.id),
        )
    )
    subject = result.scalars().first()
    if subject is None:
        raise NotFoundException("Subject", subject_id)

    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=getattr(subject, "description", None),
        created_at=subject.created_at.isoformat() if subject.created_at else None,
        updated_at=subject.updated_at.isoformat() if subject.updated_at else None,
    )


@router.patch("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_in: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.tenant_id == str(current_user.id),
            Subject.user_id == str(current_user.id),
        )
    )
    subject = result.scalars().first()
    if subject is None:
        raise NotFoundException("Subject", subject_id)

    if subject_in.name is not None:
        existing = await db.execute(
            select(Subject).where(
                Subject.tenant_id == str(current_user.id),
                Subject.user_id == str(current_user.id),
                Subject.name == subject_in.name,
                Subject.id != subject_id,
            )
        )
        if existing.scalars().first() is not None:
            raise ConflictException(f"Subject '{subject_in.name}' already exists")
        subject.name = subject_in.name
    if subject_in.description is not None:
        setattr(subject, "description", subject_in.description)

    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=getattr(subject, "description", None),
        created_at=subject.created_at.isoformat() if subject.created_at else None,
        updated_at=subject.updated_at.isoformat() if subject.updated_at else None,
    )


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.tenant_id == str(current_user.id),
            Subject.user_id == str(current_user.id),
        )
    )
    subject = result.scalars().first()
    if subject is None:
        raise NotFoundException("Subject", subject_id)

    await db.delete(subject)
    await db.commit()

    return {"detail": "Subject deleted"}
