import logging
from typing import Annotated, Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.services.ai_service import generate_flashcards as ai_generate
from app.services.grounding_service import verify_flashcard
from app.graphs.fact_verifier_node import (
    compute_hallucination_score,
    verify_content_claims,
)

logger = logging.getLogger(__name__)


def _overwrite(a: Any, b: Any) -> Any:
    return b


class FlashcardAgentState(TypedDict):
    document_id: Annotated[str, _overwrite]
    text: Annotated[str, _overwrite]
    count: Annotated[int, _overwrite]
    confidence_threshold: Annotated[float, _overwrite]
    flashcards: Annotated[List[Dict[str, Any]], _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


def generate_node(state: FlashcardAgentState) -> Dict[str, Any]:
    try:
        import asyncio

        items = asyncio.run(ai_generate(state["text"], count=state["count"]))
        return {
            "flashcards": [item.model_dump() for item in items],
            "status": "generated",
        }
    except Exception as e:
        logger.exception("Flashcard generation failed: %s", e)
        return {"status": "failed", "error": str(e)}


def ground_node(state: FlashcardAgentState) -> Dict[str, Any]:
    try:
        grounded = []
        for fc in state["flashcards"]:
            v = verify_flashcard(
                question=fc.get("question", ""),
                answer=fc.get("answer", ""),
                source_chunk=fc.get("source_chunk"),
                source_text=state["text"],
            )
            fc["verification"] = v
            grounded.append(fc)
        return {"flashcards": grounded, "status": "grounded"}
    except Exception as e:
        logger.exception("Grounding failed: %s", e)
        return {"status": "failed", "error": str(e)}


def verify_node(state: FlashcardAgentState) -> Dict[str, Any]:
    try:
        import asyncio

        claims = asyncio.run(
            verify_content_claims(
                state["flashcards"],
                state["text"],
            )
        )
        score = compute_hallucination_score(claims)

        updated = []
        for fc in state["flashcards"]:
            fc["claims"] = claims
            fc["hallucination_score"] = score
            if fc.get("verification") is None:
                fc["verification"] = {}
            fc["verification"]["claims"] = claims
            fc["verification"]["hallucination_score"] = score
            if score > 0.3:
                fc["verification"]["warnings"] = fc["verification"].get("warnings", [])
                fc["verification"]["warnings"].append(
                    "High hallucination score — flagged for human review"
                )
            updated.append(fc)
        return {"flashcards": updated, "status": "fact_verified"}
    except Exception as e:
        logger.exception("Fact verification failed: %s", e)
        return {"status": "failed", "error": str(e)}


def filter_node(state: FlashcardAgentState) -> Dict[str, Any]:
    threshold = state.get("confidence_threshold", 0.4)
    return {
        "flashcards": [
            fc
            for fc in state["flashcards"]
            if fc.get("verification", {}).get("confidence", 0) >= threshold
        ],
        "status": "done",
    }


def build_flashcard_agent():
    workflow = StateGraph(FlashcardAgentState)
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
