import json
import logging
from typing import List, Optional

from app.core.config import settings
from app.core.llm_provider import build_llm
from app.schemas.ai import FlashcardItem, QuizQuestion, VerificationResult
from app.services.grounding_service import verify_flashcard, verify_quiz_question

logger = logging.getLogger(__name__)


_FLASHCARD_SYSTEM_PROMPT = (
    "You are an expert tutor creating flashcards for competitive exam preparation (UPSC/APSC). "
    "CRITICAL: Every fact MUST be directly supported by the provided text. "
    "Do NOT invent facts, dates, names, or statistics not present in the text. "
    "Generate precise, fact-based question-answer pairs from the provided text. "
    "Each flashcard must have an exact quote from the source text as the source_chunk. "
    "Output valid JSON as an array of objects with keys: question, answer, source_chunk. "
    "Do not include any text outside the JSON array."
)

_HALLUCINATION_GUARD = (
    "\n\nIMPORTANT - Anti-Hallucination Rules:\n"
    "1. ONLY use information explicitly stated in the text above.\n"
    "2. If the text does not contain enough information for {count} flashcards, "
    "generate fewer rather than making things up.\n"
    "3. Every source_chunk must be a verbatim quote from the text.\n"
    "4. Do not add external knowledge, common sense, or assumptions.\n"
    "5. For dates, names, and numbers: if not in the text, do not include them."
)


def _parse_flashcards(text: str) -> List[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("\n", 1)[0] if text.endswith("```") else text
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("LLM output was not valid JSON: %s", text[:200])
        return []
    if not isinstance(data, list):
        data = [data]
    result = []
    for item in data:
        if isinstance(item, dict) and "question" in item and "answer" in item:
            result.append(item)
    return result


async def generate_flashcards(text: str, count: int = 5) -> List[FlashcardItem]:
    llm = build_llm(temperature=0.0)
    prompt = (
        f"Based on the following study text, generate exactly {count} flashcards "
        f"(question-answer pairs) for competitive exam preparation.\n\n"
        f"Text:\n{text[:8000]}\n\n"
        f"Output exactly {count} flashcards as a JSON array."
        + _HALLUCINATION_GUARD.format(count=count)
    )
    try:
        response = await llm.ainvoke(
            [
                {"role": "system", "content": _FLASHCARD_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
        )
        content = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )
        raw = _parse_flashcards(content)

        result = []
        for item in raw[:count]:
            fc = FlashcardItem(
                question=item["question"],
                answer=item["answer"],
                source_chunk=item.get("source_chunk"),
            )
            v = verify_flashcard(
                question=fc.question,
                answer=fc.answer,
                source_chunk=fc.source_chunk,
                source_text=text,
            )
            fc.verification = VerificationResult(**v)
            result.append(fc)

        verified_count = sum(
            1 for r in result if r.verification and r.verification.verified
        )
        logger.info(
            "Generated %d flashcards (%d verified) from %d chars",
            len(result),
            verified_count,
            len(text),
        )

        return result
    except Exception as exc:
        logger.exception("Flashcard generation failed: %s", exc)
        return []


_QUIZ_SYSTEM_PROMPT = (
    "You are an expert tutor creating multiple-choice quiz questions for competitive exam preparation (UPSC/APSC). "
    "CRITICAL: Every fact MUST be directly supported by the provided text. "
    "Do NOT invent facts, dates, names, or statistics not present in the text. "
    "Generate fact-based questions from the provided text. "
    "Each question must have exactly 4 options, one correct answer, and an explanation with source citation. "
    "Output valid JSON as an array of objects with keys: question, options (array of 4 strings), "
    "correct_answer, explanation, source_chunk. "
    "Do not include any text outside the JSON array."
)


def _parse_quiz(text: str) -> List[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("\n", 1)[0] if text.endswith("```") else text
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("LLM quiz output was not valid JSON: %s", text[:200])
        return []
    if not isinstance(data, list):
        data = [data]
    result = []
    for item in data:
        if (
            isinstance(item, dict)
            and "question" in item
            and "options" in item
            and "correct_answer" in item
        ):
            result.append(item)
    return result


async def generate_quiz(text: str, count: int = 10) -> List[QuizQuestion]:
    llm = build_llm(temperature=0.0)
    prompt = (
        f"Based on the following study text, generate exactly {count} multiple-choice quiz questions "
        f"with 4 options each for competitive exam preparation.\n\n"
        f"Text:\n{text[:8000]}\n\n"
        f"Output exactly {count} questions as a JSON array."
        + _HALLUCINATION_GUARD.format(count=count)
    )
    try:
        response = await llm.ainvoke(
            [
                {"role": "system", "content": _QUIZ_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
        )
        content = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )
        raw = _parse_quiz(content)

        result = []
        for item in raw[:count]:
            q = QuizQuestion(
                question=item["question"],
                options=item["options"],
                correct_answer=item["correct_answer"],
                explanation=item.get("explanation", ""),
                source_chunk=item.get("source_chunk"),
            )
            v = verify_quiz_question(
                question=q.question,
                correct_answer=q.correct_answer,
                options=q.options,
                source_chunk=q.source_chunk,
                source_text=text,
            )
            q.verification = VerificationResult(**v)
            result.append(q)

        verified_count = sum(
            1 for r in result if r.verification and r.verification.verified
        )
        logger.info(
            "Generated %d quiz questions (%d verified) from %d chars",
            len(result),
            verified_count,
            len(text),
        )

        return result
    except Exception as exc:
        logger.exception("Quiz generation failed: %s", exc)
        return []
