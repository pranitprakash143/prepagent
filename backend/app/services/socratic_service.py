import logging
from typing import List, Optional

from app.core.config import settings
from app.core.llm_provider import build_llm
from app.schemas.socratic import Message, SocraticResponse

logger = logging.getLogger(__name__)

_SOCRATIC_SYSTEM_PROMPT = (
    "You are a Socratic tutor for UPSC/APSC competitive exam preparation. "
    "Your goal is to help students arrive at the answer themselves through guided questions. "
    "Rules:\n"
    "1. NEVER give the answer directly.\n"
    "2. Ask guiding questions that build understanding step by step.\n"
    "3. Encourage the student to reason from first principles.\n"
    "4. If the student is stuck, provide a hint or break the problem down.\n"
    "5. Keep responses concise (2-4 sentences).\n"
    "6. When the student arrives at the correct answer, confirm it and explain why.\n"
    "7. After 5 unsuccessful attempts, you may reveal the answer with explanation.\n"
    "Track how many hints you've given. If hints_used >= 5, set reveal_answer=true."
)


async def socratic_tutor(
    question: str,
    correct_answer: Optional[str] = None,
    context: Optional[str] = None,
    history: Optional[List[Message]] = None,
) -> SocraticResponse:
    try:
        llm = build_llm(temperature=0.3)
    except ValueError:
        return SocraticResponse(
            reply="Socratic tutoring requires an LLM API key. Please configure your LLM provider.",
            reveal_answer=False,
        )

    messages = [{"role": "system", "content": _SOCRATIC_SYSTEM_PROMPT}]

    user_content = f"The student is working on this question:\n{question}\n"
    if correct_answer:
        user_content += f"\n(Correct answer for your reference: {correct_answer})\n"
    if context:
        user_content += f"\nRelevant context:\n{context}\n"
    messages.append({"role": "user", "content": user_content})

    if history:
        hints_count = sum(
            1 for m in history if m.role == "assistant" and "hint" in m.content.lower()
        )
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append(
            {
                "role": "user",
                "content": "Continue guiding me. Remember: do not give the answer directly.",
            }
        )
    else:
        hints_count = 0
        messages.append(
            {
                "role": "user",
                "content": "I'm ready to start. Ask me a guiding question to help me figure out the answer.",
            }
        )

    try:
        response = await llm.ainvoke(messages)
        reply = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )

        if hints_count >= 5 or "the correct answer is" in reply.lower():
            return SocraticResponse(
                reply=reply,
                reveal_answer=True,
                answer=correct_answer,
                hints_used=hints_count + 1,
            )

        return SocraticResponse(
            reply=reply,
            reveal_answer=False,
            answer=None,
            hints_used=hints_count + 1 if "?" not in reply else hints_count,
        )
    except Exception as exc:
        logger.exception("Socratic tutor failed: %s", exc)
        return SocraticResponse(
            reply="I'm having trouble processing your request. Please try again.",
            reveal_answer=False,
        )
