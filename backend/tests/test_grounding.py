"""
Unit tests for grounding_service.py — anti-hallucination pipeline.
"""

from app.services.grounding_service import (
    normalize,
    _best_match_ratio,
    verify_source_chunk,
    verify_fact,
    verify_flashcard,
    verify_quiz_question,
)

SAMPLE_TEXT = (
    "The Indian Constitution was adopted on 26 November 1949 and came into effect "
    "on 26 January 1950. Dr. B. R. Ambedkar served as the chairman of the Drafting "
    "Committee. The Constituent Assembly first met on 9 December 1946. The Constitution "
    "declares India a sovereign, socialist, secular, democratic republic."
)


class TestNormalize:
    def test_lowercase_and_strip(self):
        assert normalize("  Hello WORLD  ") == "hello world"

    def test_removes_punctuation(self):
        assert normalize("Hello, World!") == "hello world"

    def test_collapses_whitespace(self):
        assert normalize("hello    world") == "hello world"

    def test_empty_string(self):
        assert normalize("") == ""


class TestBestMatchRatio:
    def test_exact_phrase(self):
        ratio = _best_match_ratio("Indian Constitution", SAMPLE_TEXT)
        assert ratio == 1.0

    def test_short_phrase_no_match(self):
        ratio = _best_match_ratio("xyzzy", SAMPLE_TEXT)
        assert ratio == 0.0

    def test_fuzzy_match(self):
        ratio = _best_match_ratio("Constitution of India was adopted", SAMPLE_TEXT)
        assert ratio > 0.5

    def test_partial_word_overlap(self):
        ratio = _best_match_ratio("sovereign socialist secular", SAMPLE_TEXT)
        assert ratio > 0.3

    def test_empty_phrase(self):
        assert _best_match_ratio("", SAMPLE_TEXT) == 0.0

    def test_empty_source(self):
        assert _best_match_ratio("test", "") == 0.0


class TestVerifySourceChunk:
    def test_exact_quote(self):
        ok, score = verify_source_chunk(
            "The Indian Constitution was adopted on 26 November 1949",
            SAMPLE_TEXT,
        )
        assert ok is True
        assert score >= 0.6

    def test_fuzzy_quote(self):
        ok, score = verify_source_chunk(
            "Constitution was adopted in November 1949",
            SAMPLE_TEXT,
        )
        assert ok is True
        assert score >= 0.6

    def test_no_match(self):
        ok, score = verify_source_chunk(
            "Completely unrelated text about something else",
            SAMPLE_TEXT,
        )
        assert ok is False
        assert score < 0.6

    def test_none_chunk(self):
        ok, score = verify_source_chunk(None, SAMPLE_TEXT)
        assert ok is False
        assert score == 0.0

    def test_empty_chunk(self):
        ok, score = verify_source_chunk("", SAMPLE_TEXT)
        assert ok is False
        assert score == 0.0


class TestVerifyFact:
    def test_directly_supported(self):
        ok, score = verify_fact(
            "When was the Constitution adopted?",
            "26 November 1949",
            SAMPLE_TEXT,
        )
        assert ok is True
        assert score >= 0.4

    def test_unsupported_fact(self):
        ok, score = verify_fact(
            "What is the capital of France?",
            "Paris",
            SAMPLE_TEXT,
        )
        assert ok is False
        assert score < 0.4


class TestVerifyFlashcard:
    def test_verified_flashcard(self):
        result = verify_flashcard(
            question="When was the Constitution adopted?",
            answer="26 November 1949",
            source_chunk="The Indian Constitution was adopted on 26 November 1949",
            source_text=SAMPLE_TEXT,
        )
        assert result["verified"] is True
        assert result["confidence"] >= 0.4
        assert result["source_verified"] is True
        assert result["fact_verified"] is True
        assert len(result["warnings"]) == 0

    def test_unverified_flashcard(self):
        result = verify_flashcard(
            question="What is the capital of France?",
            answer="Paris",
            source_chunk="France is a country in Europe",
            source_text=SAMPLE_TEXT,
        )
        assert result["verified"] is False
        assert result["confidence"] < 0.4
        assert result["source_verified"] is False
        assert len(result["warnings"]) > 0

    def test_flashcard_without_source_chunk(self):
        result = verify_flashcard(
            question="When was the Constitution adopted?",
            answer="26 November 1949",
            source_chunk=None,
            source_text=SAMPLE_TEXT,
        )
        assert result["source_verified"] is False
        assert result["fact_verified"] is True  # fact still checks source_text
        assert result["verified"] is True  # fact alone is sufficient


class TestVerifyQuizQuestion:
    def test_verified_quiz(self):
        result = verify_quiz_question(
            question="When was the Constitution adopted?",
            correct_answer="26 November 1949",
            options=[
                "26 November 1949",
                "26 January 1950",
                "9 December 1946",
                "15 August 1947",
            ],
            source_chunk="The Indian Constitution was adopted on 26 November 1949",
            source_text=SAMPLE_TEXT,
        )
        assert result["verified"] is True
        assert result["confidence"] >= 0.4

    def test_unverified_quiz(self):
        result = verify_quiz_question(
            question="What is the capital of France?",
            correct_answer="Paris",
            options=["Paris", "London", "Berlin", "Madrid"],
            source_chunk=None,
            source_text=SAMPLE_TEXT,
        )
        assert result["verified"] is False
        assert result["confidence"] < 0.4
