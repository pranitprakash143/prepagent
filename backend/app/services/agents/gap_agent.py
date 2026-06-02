import logging
from typing import Annotated, Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.services.chroma_service import query_chroma

logger = logging.getLogger(__name__)

_COVERAGE_THRESHOLD = 0.35


def _overwrite(a: Any, b: Any) -> Any:
    return b


class GapAgentState(TypedDict):
    subject_id: Annotated[str, _overwrite]
    tenant_id: Annotated[str, _overwrite]
    user_id: Annotated[str, _overwrite]
    pyq_questions: Annotated[List[Dict[str, Any]], _overwrite]
    coverage_scores: Annotated[List[Dict[str, Any]], _overwrite]
    report: Annotated[Dict[str, Any], _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


def retrieve_pyqs_node(state: GapAgentState) -> Dict[str, Any]:
    return {"status": "retrieved"}


def search_chunks_node(state: GapAgentState) -> Dict[str, Any]:
    try:
        import asyncio

        where_filter = {"tenant_id": state["tenant_id"], "user_id": state["user_id"]}
        scored = []
        for pyq in state["pyq_questions"]:
            search_query = f"{pyq.get('question', '')} {pyq.get('explanation', '')}"
            results = asyncio.run(
                query_chroma(search_query, n_results=3, where_filter=where_filter)
            )
            top_score = max((r.get("score", 0) for r in (results or [])), default=0)
            scored.append(
                {
                    "pyq_id": pyq.get("id", ""),
                    "question": pyq.get("question", ""),
                    "topic": pyq.get("topic", ""),
                    "year": pyq.get("year"),
                    "exam_type": pyq.get("exam_type"),
                    "coverage_score": round(top_score, 3),
                    "is_gap": top_score < _COVERAGE_THRESHOLD,
                    "matched_chunks": [
                        r.get("text", "")[:200]
                        for r in (results or [])
                        if r.get("score", 0) >= _COVERAGE_THRESHOLD
                    ],
                }
            )
        return {"coverage_scores": scored, "status": "searched"}
    except Exception as e:
        logger.exception("Chunk search failed: %s", e)
        return {"status": "failed", "error": str(e)}


def report_node(state: GapAgentState) -> Dict[str, Any]:
    total = len(state["coverage_scores"])
    gaps = [g for g in state["coverage_scores"] if g["is_gap"]]
    covered = total - len(gaps)
    coverage_pct = round((covered / total * 100), 1) if total > 0 else 0

    topic_scores = {}
    for g in state["coverage_scores"]:
        t = g.get("topic", "general")
        if t not in topic_scores:
            topic_scores[t] = []
        topic_scores[t].append(g["coverage_score"])

    strengths = [
        t for t, scores in topic_scores.items() if sum(scores) / len(scores) > 0.7
    ]
    weak_areas = [
        t for t, scores in topic_scores.items() if sum(scores) / len(scores) < 0.3
    ]

    recommendations = []
    if weak_areas:
        recommendations.append(f"Focus on weak areas: {', '.join(weak_areas[:3])}")
    if len(gaps) > total * 0.5:
        recommendations.append("Upload more documents covering the gap topics above.")
    if not recommendations:
        recommendations.append("Good coverage! Consider practicing PYQs.")

    return {
        "report": {
            "subject_id": state.get("subject_id"),
            "total_pyqs": total,
            "covered_pyqs": covered,
            "gap_pyqs": len(gaps),
            "coverage_percentage": coverage_pct,
            "gaps": gaps,
            "strengths": strengths,
            "weak_areas": weak_areas,
            "recommendations": recommendations,
        },
        "status": "done",
    }


def build_gap_agent():
    workflow = StateGraph(GapAgentState)
    workflow.add_node("retrieve_pyqs", retrieve_pyqs_node)
    workflow.add_node("search_chunks", search_chunks_node)
    workflow.add_node("report", report_node)
    workflow.set_entry_point("retrieve_pyqs")
    workflow.add_edge("retrieve_pyqs", "search_chunks")
    workflow.add_edge("search_chunks", "report")
    workflow.add_edge("report", END)
    return workflow.compile()
