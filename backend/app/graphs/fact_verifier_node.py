import json
import logging
import re
from difflib import SequenceMatcher
from typing import Annotated, Any, Dict, List, Optional, Tuple, TypedDict

from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.core.llm_provider import build_llm

logger = logging.getLogger(__name__)

_ATOMIC_CLAIM_PROMPT = (
    "You are a fact-checking assistant. Break the following text into atomic factual claims. "
    "Each claim must be a single verifiable fact that can be checked against a source document. "
    "Output valid JSON as an array of strings, where each string is one atomic claim. "
    'Example: ["The Indian Constitution was adopted on 26 November 1949", '
    '"Dr. B. R. Ambedkar was the chairman of the Drafting Committee"]\n\n'
    "Text to analyze:\n{text}"
)


def _overwrite(a: Any, b: Any) -> Any:
    return b


class FactVerifierState(TypedDict):
    content_items: Annotated[List[Dict[str, Any]], _overwrite]
    source_text: Annotated[str, _overwrite]
    source_chunks: Annotated[Optional[List[Dict[str, Any]]], _overwrite]
    claims: Annotated[List[Dict[str, Any]], _overwrite]
    hallucination_score: Annotated[float, _overwrite]
    status: Annotated[str, _overwrite]
    error: Annotated[str, _overwrite]


def _build_llm():
    return build_llm(temperature=0.0)


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _find_exact_span(claim: str, chunk_content: str) -> Optional[Tuple[int, int]]:
    norm_claim = _normalize(claim)
    norm_chunk = _normalize(chunk_content)
    if not norm_claim or not norm_chunk:
        return None
    idx = norm_chunk.find(norm_claim)
    if idx != -1:
        return (idx, idx + len(norm_claim))
    words = norm_claim.split()
    for length in range(len(words), len(words) // 2, -1):
        for start in range(0, len(words) - length + 1):
            phrase = " ".join(words[start : start + length])
            idx = norm_chunk.find(phrase)
            if idx != -1:
                return (idx, idx + len(phrase))
    return None


def _string_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


async def extract_atomic_claims(text: str) -> List[str]:
    try:
        llm = _build_llm()
        prompt = _ATOMIC_CLAIM_PROMPT.format(text=text[:4000])
        response = await llm.ainvoke(
            [
                {
                    "role": "system",
                    "content": "You extract atomic factual claims from text. Output only valid JSON.",
                },
                {"role": "user", "content": prompt},
            ]
        )
        content = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            content = content.rsplit("\n", 1)[0] if content.endswith("```") else content
        claims = json.loads(content)
        if isinstance(claims, list):
            return [str(c) for c in claims if c]
        return []
    except Exception as e:
        logger.warning("Atomic claim extraction failed: %s", e)
        return []


def _has_numerical_mismatch(claim: str, chunk_content: str) -> bool:
    claim_nums = set(re.findall(r"\b\d+\b", claim))
    chunk_nums = set(re.findall(r"\b\d+\b", chunk_content))
    if not claim_nums:
        return False
    for cn in claim_nums:
        if cn not in chunk_nums:
            return True
    return False


def verify_single_claim(
    claim: str,
    chunks: List[Dict[str, Any]],
) -> Dict[str, Any]:
    result = {
        "statement": claim,
        "chunk_id": None,
        "start_char": None,
        "end_char": None,
        "confidence": 0.0,
        "match_type": "none",
    }

    if not claim or not claim.strip():
        result["match_type"] = "hallucination"
        return result

    best_chunk = None
    best_start = None
    best_end = None
    best_confidence = 0.0

    for chunk in chunks:
        cid = chunk.get("id") or chunk.get("chunk_id") or ""
        content = chunk.get("content") or chunk.get("text") or ""

        norm_claim = _normalize(claim)
        norm_content = _normalize(content)

        has_num_mismatch = _has_numerical_mismatch(claim, content)
        sim = _string_similarity(claim, content)

        if norm_claim in norm_content:
            if best_confidence < 0.95:
                best_confidence = 0.95
                best_chunk = cid
                best_start = norm_content.find(norm_claim)
                best_end = best_start + len(norm_claim)
                result["match_type"] = "exact"
            break

        span = _find_exact_span(claim, content)
        if span:
            if has_num_mismatch:
                score = 0.50
                mt = "fuzzy_low"
            else:
                score = 0.80
                mt = "fuzzy_high"
            if best_confidence < score:
                best_confidence = score
                best_chunk = cid
                start, end = span
                best_start = start
                best_end = end
                result["match_type"] = mt
            continue

        if sim >= 0.8 and not has_num_mismatch and best_confidence < 0.70:
            best_confidence = 0.70
            best_chunk = cid
            result["match_type"] = "fuzzy_medium"
        elif sim >= 0.8 and has_num_mismatch and best_confidence < 0.30:
            best_confidence = 0.30
            best_chunk = cid
            result["match_type"] = "hallucination"
        elif sim >= 0.7 and best_confidence < 0.40:
            best_confidence = 0.40
            best_chunk = cid
            result["match_type"] = "fuzzy_low"

        if sim >= 0.7:
            idx = norm_content.find(norm_claim[:50])
            if idx != -1:
                best_start = idx
                best_end = idx + len(norm_claim[:50])

    if best_confidence <= 0.0:
        result["confidence"] = 0.0
        result["match_type"] = "hallucination"
    else:
        result["chunk_id"] = best_chunk
        result["start_char"] = best_start
        result["end_char"] = best_end
        result["confidence"] = best_confidence

    return result


async def verify_content_claims(
    content_items: List[Dict[str, Any]],
    source_text: str,
    source_chunks: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    if not content_items:
        return []

    chunks = source_chunks or [{"id": "", "content": source_text}]

    all_content = " ".join(
        item.get("question", "")
        + " "
        + item.get("answer", "")
        + " "
        + item.get("correct_answer", "")
        + " "
        + item.get("explanation", "")
        for item in content_items
    )

    atomic_claims = await extract_atomic_claims(all_content)

    if not atomic_claims:
        atomic_claims = []
        for item in content_items:
            q = item.get("question", "").strip()
            a = item.get("answer", "") or item.get("correct_answer", "")
            if q:
                atomic_claims.append(q)
            if a:
                atomic_claims.append(a)

    if not atomic_claims:
        return []

    claim_results = []
    for claim in atomic_claims:
        result = verify_single_claim(claim, chunks)
        claim_results.append(result)

    return claim_results


def compute_hallucination_score(
    claims: List[Dict[str, Any]],
) -> float:
    if not claims:
        return 0.0
    low_conf = sum(1 for c in claims if c["confidence"] < 0.7)
    return round(low_conf / len(claims), 3)


async def verify_node(state: FactVerifierState) -> Dict[str, Any]:
    try:
        claims = await verify_content_claims(
            state["content_items"],
            state["source_text"],
            state.get("source_chunks"),
        )
        score = compute_hallucination_score(claims)
        return {
            "claims": claims,
            "hallucination_score": score,
            "status": "verified",
        }
    except Exception as e:
        logger.exception("Fact verification failed: %s", e)
        return {
            "claims": [],
            "hallucination_score": 1.0,
            "status": "failed",
            "error": str(e),
        }


def build_fact_verifier():
    workflow = StateGraph(FactVerifierState)
    workflow.add_node("verify", verify_node)
    workflow.set_entry_point("verify")
    workflow.add_edge("verify", END)
    return workflow.compile()
