from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard summary for the authenticated user."""
    stmt = (
        select(Document)
        .where(Document.user_id == str(current_user.id))
        .where(Document.tenant_id == str(current_user.id))
        .order_by(Document.created_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    documents = result.scalars().all()

    recent_documents = [
        {
            "id": str(doc.id),
            "title": doc.title or doc.file_name,
            "file_name": doc.file_name,
            "status": doc.status,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documents
    ]

    count_stmt = select(func.count(Document.id)).where(
        Document.user_id == str(current_user.id),
        Document.tenant_id == str(current_user.id),
    )
    count_result = await db.execute(count_stmt)
    total_documents = count_result.scalar() or 0

    return {
        "study_streak": 0,
        "cards_reviewed": 0,
        "documents_processed": total_documents,
        "recent_documents": recent_documents,
        "recent_notes": [],
    }
