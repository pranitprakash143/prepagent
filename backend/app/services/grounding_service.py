import logging
import re
from difflib import SequenceMatcher
from typing import FrozenSet, List, Optional, Tuple

logger = logging.getLogger(__name__)

_STOPWORDS: FrozenSet[str] = frozenset(
    {
        "a",
        "an",
        "the",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "shall",
        "can",
        "need",
        "dare",
        "ought",
        "used",
        "to",
        "of",
        "in",
        "for",
        "on",
        "with",
        "at",
        "by",
        "from",
        "as",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "out",
        "off",
        "over",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "each",
        "every",
        "both",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very",
        "just",
        "because",
        "but",
        "and",
        "or",
        "if",
        "while",
        "that",
        "this",
        "these",
        "those",
        "it",
        "its",
        "what",
        "which",
        "who",
        "whom",
    }
)


def normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _filter_stopwords(words: List[str]) -> List[str]:
    return [w for w in words if w not in _STOPWORDS]


def _best_match_ratio(phrase: str, source_text: str) -> float:
    norm_phrase = normalize(phrase)
    norm_source = normalize(source_text)
    if not norm_phrase or not norm_source:
        return 0.0
    if norm_phrase in norm_source:
        return 1.0
    words = norm_phrase.split()
    content_words = _filter_stopwords(words)
    if not content_words:
        return 0.0
    if len(words) <= 3:
        return 1.0 if norm_phrase in norm_source else 0.0
    content_phrase = " ".join(content_words)
    window_size = len(words) + 5
    source_words = norm_source.split()
    best_ratio = 0.0
    for i in range(0, len(source_words), max(1, window_size // 2)):
        window = " ".join(source_words[i : i + window_size])
        ratio = SequenceMatcher(None, content_phrase, window).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
        if best_ratio > 0.85:
            break
    return best_ratio


def verify_source_chunk(
    source_chunk: Optional[str], source_text: str
) -> Tuple[bool, float]:
    if not source_chunk:
        return False, 0.0
    ratio = _best_match_ratio(source_chunk, source_text)
    return ratio >= 0.6, round(ratio, 3)


def verify_fact(
    claim: str, correct_answer: str, source_text: str
) -> Tuple[bool, float]:
    claim_score = _best_match_ratio(claim, source_text)
    answer_score = _best_match_ratio(correct_answer, source_text)
    combined = max(claim_score, answer_score)
    return combined >= 0.4, round(combined, 3)


def verify_flashcard(
    question: str, answer: str, source_chunk: Optional[str], source_text: str
) -> dict:
    source_ok, source_score = verify_source_chunk(source_chunk, source_text)
    fact_ok, fact_score = verify_fact(question, answer, source_text)
    scores = [s for s in [source_score if source_ok else 0, fact_score] if s > 0]
    confidence = round(sum(scores) / len(scores), 3) if scores else 0.0

    warnings = []
    if not source_ok:
        warnings.append("Source citation could not be verified against document")
    if fact_score < 0.4:
        warnings.append("Fact appears unsupported by source text")
    if confidence < 0.3:
        warnings.append("Low confidence — possible hallucination")

    return {
        "verified": confidence >= 0.4,
        "confidence": confidence,
        "source_verified": source_ok,
        "fact_verified": fact_ok,
        "warnings": warnings,
    }


def verify_quiz_question(
    question: str,
    correct_answer: str,
    options: List[str],
    source_chunk: Optional[str],
    source_text: str,
) -> dict:
    source_ok, source_score = verify_source_chunk(source_chunk, source_text)
    fact_ok, fact_score = verify_fact(question, correct_answer, source_text)

    option_scores = []
    for opt in options:
        _, score = verify_fact(opt, opt, source_text)
        option_scores.append(score)
    avg_option_score = (
        round(sum(option_scores) / len(option_scores), 3) if option_scores else 0
    )

    scores = [s for s in [fact_score, avg_option_score] if s > 0]
    confidence = round(sum(scores) / len(scores), 3) if scores else 0.0

    warnings = []
    if not source_ok and source_chunk:
        warnings.append("Source citation could not be verified against document")
    if fact_score < 0.4:
        warnings.append("Question/answer appears unsupported by source text")
    if avg_option_score < 0.3:
        warnings.append("Options appear unsupported by source text")
    if confidence < 0.3:
        warnings.append("Low confidence — possible hallucination")

    return {
        "verified": confidence >= 0.4,
        "confidence": confidence,
        "source_verified": source_ok,
        "fact_verified": fact_ok,
        "warnings": warnings,
    }
