import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pyq import PYQ
from app.schemas.pyq import GapAnalysisResponse, GapItem
from app.services.chroma_service import query_chroma

logger = logging.getLogger(__name__)

_COVERAGE_THRESHOLD = 0.35


async def analyze_gap(
    db: AsyncSession,
    user_id: str,
    tenant_id: str,
    subject_id: Optional[str] = None,
) -> GapAnalysisResponse:
    stmt = select(PYQ).where(PYQ.user_id == user_id).where(PYQ.tenant_id == tenant_id)
    if subject_id:
        stmt = stmt.where(PYQ.subject_id == subject_id)
    stmt = stmt.order_by(PYQ.year.desc().nullslast(), PYQ.created_at.desc())

    result = await db.execute(stmt)
    pyqs = result.scalars().all()

    if not pyqs:
        return GapAnalysisResponse(
            subject_id=subject_id,
            total_pyqs=0,
            covered_pyqs=0,
            gap_pyqs=0,
            coverage_percentage=100.0,
            gaps=[],
            strengths=[],
            weak_areas=[],
            recommendations=["No PYQs found. Upload PYQ bank to get started."],
        )

    where_filter = {"tenant_id": tenant_id, "user_id": user_id}

    gaps: List[GapItem] = []
    covered_count = 0

    for pyq in pyqs:
        search_query = f"{pyq.question} {pyq.explanation or ''}"
        chroma_results = await query_chroma(
            search_query, n_results=3, where_filter=where_filter
        )

        matched_chunks: List[str] = []
        max_score = 0.0

        if chroma_results:
            for r in chroma_results:
                score = r.get("score", 0.0)
                if score > max_score:
                    max_score = score
                if score >= _COVERAGE_THRESHOLD:
                    matched_chunks.append(r.get("text", "")[:200])

            if max_score >= _COVERAGE_THRESHOLD:
                covered_count += 1

        topic = pyq.question[:80]
        if pyq.exam_type:
            topic = f"{pyq.exam_type}: {topic}"

        gaps.append(
            GapItem(
                pyq_id=pyq.id,
                question=pyq.question,
                topic=topic,
                year=pyq.year,
                exam_type=pyq.exam_type,
                coverage_score=round(max_score, 3),
                is_gap=max_score < _COVERAGE_THRESHOLD,
                matched_chunks=matched_chunks,
            )
        )

    total = len(pyqs)
    gap_count = total - covered_count
    coverage_pct = round((covered_count / total) * 100, 1) if total > 0 else 100.0

    uncovered = [g for g in gaps if g.is_gap]
    uncovered.sort(key=lambda g: g.coverage_score)

    weak_areas = []
    if uncovered:
        topics = {}
        for g in uncovered[:10]:
            prefix = g.topic.split(":")[0].strip() if ":" in g.topic else g.topic[:30]
            topics[prefix] = topics.get(prefix, 0) + 1
        weak_areas = sorted(topics, key=topics.get, reverse=True)[:5]

    covered_items = [g for g in gaps if not g.is_gap]
    strengths = []
    if covered_items:
        topics = {}
        for g in covered_items[:10]:
            prefix = g.topic.split(":")[0].strip() if ":" in g.topic else g.topic[:30]
            topics[prefix] = topics.get(prefix, 0) + 1
        strengths = sorted(topics, key=topics.get, reverse=True)[:5]

    recommendations = []
    if gap_count > 0:
        recommendations.append(
            f"Upload study material covering {weak_areas[0] if weak_areas else 'uncovered topics'} "
            f"to fill {gap_count} identified knowledge gaps."
        )
    if coverage_pct < 50:
        recommendations.append(
            "Your document coverage is below 50%. Consider uploading more comprehensive study materials."
        )
    if not recommendations:
        recommendations.append(
            "Good coverage! Focus on reviewing PYQs you've attempted incorrectly."
        )

    return GapAnalysisResponse(
        subject_id=subject_id,
        total_pyqs=total,
        covered_pyqs=covered_count,
        gap_pyqs=gap_count,
        coverage_percentage=coverage_pct,
        gaps=gaps,
        strengths=strengths,
        weak_areas=weak_areas,
        recommendations=recommendations,
    )
