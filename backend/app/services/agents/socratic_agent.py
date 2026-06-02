import logging
from typing import Annotated, Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.core.llm_provider import build_llm

logger = logging.getLogger(__name__)


def _overwrite(a: Any, b: Any) -> Any:
    return b


class SocraticAgentState(TypedDict):
    question: Annotated[str, _overwrite]
    correct_answer: Annotated[str, _overwrite]
    context: Annotated[str, _overwrite]
    history: Annotated[List[Dict[str, str]], _overwrite]
    hints_used: Annotated[int, _overwrite]
    reply: Annotated[str, _overwrite]
    reveal_answer: Annotated[bool, _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


MAX_HINTS = 5


def converse_node(state: SocraticAgentState) -> Dict[str, Any]:
    try:
        try:
            llm = build_llm(temperature=0.3)
        except ValueError:
            return {
                "reply": "Socratic tutor requires an LLM API key. Please configure your LLM provider.",
                "status": "done",
            }

        system = (
            "You are a Socratic tutor for competitive exam preparation (UPSC/APSC). "
            "Never give the answer directly. Guide the student with leading questions. "
            "If they are stuck after several hints, you may gradually give more direct clues. "
            "The student's goal is to understand, not just to get the right answer."
        )

        messages = [{"role": "system", "content": system}]
        for msg in state["history"]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        import asyncio

        response = asyncio.run(llm.ainvoke(messages))
        reply = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )
        return {"reply": reply, "status": "conversed"}
    except Exception as e:
        logger.exception("Socratic converse failed: %s", e)
        return {"status": "failed", "error": str(e)}


def decide_reveal_node(state: SocraticAgentState) -> Dict[str, Any]:
    return {"reveal_answer": state["hints_used"] >= MAX_HINTS, "status": "done"}


def build_socratic_agent():
    workflow = StateGraph(SocraticAgentState)
    workflow.add_node("converse", converse_node)
    workflow.add_node("decide_reveal", decide_reveal_node)
    workflow.set_entry_point("converse")
    workflow.add_edge("converse", "decide_reveal")
    workflow.add_edge("decide_reveal", END)
    return workflow.compile()
