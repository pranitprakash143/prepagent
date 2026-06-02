import pytest

from app.graphs.fact_verifier_node import (
    compute_hallucination_score,
    verify_single_claim,
)


class TestVerifySingleClaim:
    def test_exact_match_returns_high_confidence(self):
        claim = "The Indian Constitution was adopted on 26 November 1949"
        chunks = [
            {
                "id": "chunk_1",
                "content": (
                    "The Indian Constitution was adopted on 26 November 1949. "
                    "It came into effect on 26 January 1950."
                ),
            }
        ]
        result = verify_single_claim(claim, chunks)
        assert result["confidence"] == 0.95
        assert result["match_type"] == "exact"
        assert result["chunk_id"] == "chunk_1"

    def test_no_match_returns_zero_confidence_and_hallucination_flag(self):
        claim = "The Moon is made of green cheese"
        chunks = [
            {
                "id": "chunk_1",
                "content": (
                    "The Indian Constitution was adopted on 26 November 1949. "
                    "It came into effect on 26 January 1950."
                ),
            }
        ]
        result = verify_single_claim(claim, chunks)
        assert result["confidence"] == 0.0
        assert result["match_type"] == "hallucination"
        assert result["chunk_id"] is None

    def test_empty_content_returns_empty_list(self):
        chunks = [{"id": "c1", "content": "Some source text here."}]
        result = verify_single_claim("", chunks)
        assert result["confidence"] == 0.0
        assert result["match_type"] == "hallucination"

    def test_empty_source_chunks_returns_hallucination(self):
        claim = "Any claim at all"
        result = verify_single_claim(claim, [])
        assert result["confidence"] == 0.0
        assert result["match_type"] == "hallucination"

    def test_partial_match_returns_medium_confidence(self):
        claim = "Constitution adopted 26 November 1949"
        chunks = [
            {
                "id": "chunk_1",
                "content": (
                    "The Indian Constitution was adopted on 26 November 1949. "
                    "It came into effect on 26 January 1950."
                ),
            }
        ]
        result = verify_single_claim(claim, chunks)
        assert result["confidence"] >= 0.70
        assert result["match_type"] in ("fuzzy_high", "fuzzy_medium", "exact")
        assert result["chunk_id"] == "chunk_1"

    def test_multiple_chunks_picks_best_match(self):
        claim = "Dr. B. R. Ambedkar was the chairman"
        chunks = [
            {
                "id": "chunk_1",
                "content": "The Indian Constitution was adopted on 26 November 1949.",
            },
            {
                "id": "chunk_2",
                "content": (
                    "Dr. B. R. Ambedkar was the chairman of the Drafting Committee "
                    "of the Indian Constitution."
                ),
            },
        ]
        result = verify_single_claim(claim, chunks)
        assert result["chunk_id"] == "chunk_2"
        assert result["confidence"] >= 0.70

    def test_partial_keyword_overlap_above_fifty_percent(self):
        claim = "Ambedkar was the chairman"
        chunks = [
            {
                "id": "chunk_1",
                "content": (
                    "Dr. B. R. Ambedkar was the chairman of the Drafting Committee "
                    "of the Indian Constitution."
                ),
            }
        ]
        result = verify_single_claim(claim, chunks)
        assert result["confidence"] >= 0.70
        assert result["chunk_id"] == "chunk_1"

    def test_low_keyword_overlap_below_fifty_percent(self):
        claim = "Quantum physics explains string theory"
        chunks = [
            {
                "id": "chunk_1",
                "content": (
                    "Dr. B. R. Ambedkar was the chairman of the Drafting Committee "
                    "of the Indian Constitution."
                ),
            }
        ]
        result = verify_single_claim(claim, chunks)
        assert result["confidence"] < 0.70


class TestComputeHallucinationScore:
    def test_all_high_confidence_returns_zero(self):
        claims = [
            {"confidence": 0.95, "match_type": "exact"},
            {"confidence": 0.85, "match_type": "fuzzy_high"},
        ]
        assert compute_hallucination_score(claims) == 0.0

    def test_all_low_confidence_returns_one(self):
        claims = [
            {"confidence": 0.0, "match_type": "hallucination"},
            {"confidence": 0.0, "match_type": "hallucination"},
        ]
        assert compute_hallucination_score(claims) == 1.0

    def test_mixed_confidence(self):
        claims = [
            {"confidence": 0.95, "match_type": "exact"},
            {"confidence": 0.0, "match_type": "hallucination"},
            {"confidence": 0.85, "match_type": "fuzzy_high"},
            {"confidence": 0.0, "match_type": "hallucination"},
        ]
        assert compute_hallucination_score(claims) == 0.5

    def test_empty_claims_returns_zero(self):
        assert compute_hallucination_score([]) == 0.0

    def test_edge_case_confidence_just_below_threshold(self):
        claims = [
            {"confidence": 0.69, "match_type": "fuzzy_medium"},
            {"confidence": 0.95, "match_type": "exact"},
        ]
        assert compute_hallucination_score(claims) == 0.5

    def test_edge_case_confidence_at_threshold(self):
        claims = [
            {"confidence": 0.70, "match_type": "fuzzy_medium"},
            {"confidence": 0.95, "match_type": "exact"},
        ]
        assert compute_hallucination_score(claims) == 0.0
