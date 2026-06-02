import logging
from typing import Annotated, Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.graphs.fact_verifier_node import (
    compute_hallucination_score,
    verify_content_claims,
)
from app.services.ai_service import generate_quiz as ai_generate_quiz
from app.services.grounding_service import verify_quiz_question

logger = logging.getLogger(__name__)


def _overwrite(a: Any, b: Any) -> Any:
    return b


class QuizAgentState(TypedDict):
    document_id: Annotated[str, _overwrite]
    text: Annotated[str, _overwrite]
    count: Annotated[int, _overwrite]
    confidence_threshold: Annotated[float, _overwrite]
    questions: Annotated[List[Dict[str, Any]], _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


def generate_node(state: QuizAgentState) -> Dict[str, Any]:
    try:
        import asyncio

        items = asyncio.run(ai_generate_quiz(state["text"], count=state["count"]))
        return {
            "questions": [item.model_dump() for item in items],
            "status": "generated",
        }
    except Exception as e:
        logger.exception("Quiz generation failed: %s", e)
        return {"status": "failed", "error": str(e)}


def ground_node(state: QuizAgentState) -> Dict[str, Any]:
    try:
        grounded = []
        for q in state["questions"]:
            v = verify_quiz_question(
                question=q.get("question", ""),
                correct_answer=q.get("correct_answer", ""),
                options=q.get("options", []),
                source_chunk=q.get("source_chunk"),
                source_text=state["text"],
            )
            q["verification"] = v
            grounded.append(q)
        return {"questions": grounded, "status": "grounded"}
    except Exception as e:
        logger.exception("Quiz grounding failed: %s", e)
        return {"status": "failed", "error": str(e)}


def verify_node(state: QuizAgentState) -> Dict[str, Any]:
    try:
        import asyncio

        claims = asyncio.run(
            verify_content_claims(
                state["questions"],
                state["text"],
            )
        )
        score = compute_hallucination_score(claims)

        updated = []
        for q in state["questions"]:
            q["claims"] = claims
            q["hallucination_score"] = score
            if q.get("verification") is None:
                q["verification"] = {}
            q["verification"]["claims"] = claims
            q["verification"]["hallucination_score"] = score
            if score > 0.3:
                q["verification"]["warnings"] = q["verification"].get("warnings", [])
                q["verification"]["warnings"].append(
                    "High hallucination score — flagged for human review"
                )
            updated.append(q)
        return {"questions": updated, "status": "fact_verified"}
    except Exception as e:
        logger.exception("Quiz fact verification failed: %s", e)
        return {"status": "failed", "error": str(e)}


def filter_node(state: QuizAgentState) -> Dict[str, Any]:
    threshold = state.get("confidence_threshold", 0.4)
    return {
        "questions": [
            q
            for q in state["questions"]
            if q.get("verification", {}).get("confidence", 0) >= threshold
            and q.get("hallucination_score", 0) <= 0.7
        ],
        "status": "done",
    }


def build_quiz_agent():
    workflow = StateGraph(QuizAgentState)
    workflow.add_node("generate", generate_node)
    workflow.add_node("ground", ground_node)
    workflow.add_node("verify_fact", verify_node)
    workflow.add_node("filter", filter_node)
    workflow.set_entry_point("generate")
    workflow.add_edge("generate", "ground")
    workflow.add_edge("ground", "verify_fact")
    workflow.add_edge("verify_fact", "filter")
    workflow.add_edge("filter", END)
    return workflow.compile()
