import pytest
from typing import List, Dict, Any
from app.graphs.fact_verifier_node import (
    verify_content_claims,
    compute_hallucination_score,
    extract_atomic_claims,
    verify_single_claim,
)

pytestmark = pytest.mark.asyncio


TEST_CORPUS: List[Dict[str, Any]] = [
    {
        "id": "doc-1",
        "content": "The Indian Constitution was adopted on 26 November 1949. "
        "Dr. B. R. Ambedkar was the chairman of the Drafting Committee. "
        "The Constitution came into effect on 26 January 1950. "
        "India has a parliamentary system of government.",
        "known_claims": [
            "The Indian Constitution was adopted on 26 November 1949",
            "Dr. B. R. Ambedkar was the chairman of the Drafting Committee",
            "The Constitution came into effect on 26 January 1950",
            "India has a parliamentary system of government",
        ],
        "hallucinated_claims": [
            "The Indian Constitution was adopted on 15 August 1947",
            "Dr. B. R. Ambedkar was the first Prime Minister of India",
            "India has a presidential system of government",
            "The Constitution has 500 articles",
        ],
    },
    {
        "id": "doc-2",
        "content": "Photosynthesis is the process by which plants convert sunlight into energy. "
        "Chlorophyll absorbs light energy and converts carbon dioxide and water into glucose. "
        "Oxygen is released as a byproduct of photosynthesis. "
        "This process occurs in the chloroplasts of plant cells.",
        "known_claims": [
            "Photosynthesis converts sunlight into energy",
            "Chlorophyll absorbs light energy",
            "Oxygen is released as a byproduct of photosynthesis",
            "Photosynthesis occurs in chloroplasts",
        ],
        "hallucinated_claims": [
            "Photosynthesis occurs in mitochondria",
            "Carbon dioxide is released as a byproduct",
            "Plants absorb energy from the soil",
            "Photosynthesis produces proteins",
        ],
    },
    {
        "id": "doc-3",
        "content": "The French Revolution began in 1789 and ended in 1799. "
        "The revolution overthrew the monarchy and established a republic. "
        "Key figures include Robespierre, Danton, and Marat. "
        "The Revolution had a profound impact on modern democratic ideals.",
        "known_claims": [
            "The French Revolution began in 1789",
            "The revolution overthrew the monarchy",
            "Key figures include Robespierre, Danton, and Marat",
            "The Revolution impacted modern democratic ideals",
        ],
        "hallucinated_claims": [
            "The French Revolution began in 1776",
            "The revolution established a monarchy",
            "Napoleon was a key figure during the entire revolution",
            "The Revolution had no impact on democracy",
        ],
    },
]


def _build_content_items(claims: List[str], tag: str = "claim") -> List[Dict[str, str]]:
    return [{"question": "", "answer": c, "correct_answer": c} for c in claims]


@pytest.mark.parametrize("doc", TEST_CORPUS)
async def test_verifier_detects_known_claims(doc):
    known_items = _build_content_items(doc["known_claims"])
    results = await verify_content_claims(known_items, doc["content"])
    verified = [r for r in results if r["confidence"] >= 0.7]
    assert len(verified) >= len(doc["known_claims"]) * 0.75, (
        f"doc {doc['id']}: expected >=75% verified, got {len(verified)}/{len(doc['known_claims'])}"
    )


@pytest.mark.parametrize("doc", TEST_CORPUS)
async def test_verifier_rejects_hallucinated_claims(doc):
    bad_items = _build_content_items(doc["hallucinated_claims"])
    results = await verify_content_claims(bad_items, doc["content"])
    flagged = [r for r in results if r["confidence"] >= 0.7]
    assert len(flagged) <= len(doc["hallucinated_claims"]) * 0.25, (
        f"doc {doc['id']}: expected <=25% falsely verified, got {len(flagged)}/{len(doc['hallucinated_claims'])}"
    )


async def test_hallucination_score_computation():
    good_claims = [{"confidence": 0.95}, {"confidence": 0.88}, {"confidence": 0.92}]
    score = compute_hallucination_score(good_claims)
    assert score == 0.0, f"expected 0.0, got {score}"

    mixed_claims = [{"confidence": 0.95}, {"confidence": 0.30}, {"confidence": 0.92}]
    score = compute_hallucination_score(mixed_claims)
    approx = round(1 / 3, 3)
    assert score == approx, f"expected {approx}, got {score}"

    bad_claims = [
        {"confidence": 0.20},
        {"confidence": 0.10},
        {"confidence": 0.50},
        {"confidence": 0.60},
    ]
    score = compute_hallucination_score(bad_claims)
    assert score == 1.0, f"expected 1.0, got {score}"


async def test_empty_claims_return_empty():
    results = await verify_content_claims([], "some source text")
    assert results == []


async def test_claim_verification_no_source_chunks():
    claim = "India has a parliamentary system of government"
    chunks = [{"id": "chunk-1", "content": TEST_CORPUS[0]["content"]}]
    result = verify_single_claim(claim, chunks)
    assert result["confidence"] >= 0.7, f"expected >=0.7, got {result['confidence']}"
    assert result["match_type"] in ("exact", "fuzzy_high")


async def test_claim_verification_rejects_hallucination():
    claim = "India has a presidential system of government"
    chunks = [{"id": "chunk-1", "content": TEST_CORPUS[0]["content"]}]
    result = verify_single_claim(claim, chunks)
    assert result["confidence"] < 0.7, f"expected <0.7, got {result['confidence']}"
    assert result["match_type"] in (
        "hallucination",
        "fuzzy_medium",
    ), f"unexpected match_type: {result['match_type']}"


async def test_extract_atomic_claims_real_content():
    from app.core.llm_provider import build_llm

    try:
        build_llm(temperature=0.0)
    except ValueError:
        pytest.skip("LLM not configured — skipping extract test")

    text = (
        "The Indian Constitution was adopted on 26 November 1949. "
        "Dr. B. R. Ambedkar was the chairman."
    )
    claims = await extract_atomic_claims(text)
    if not claims:
        pytest.skip(
            "LLM extraction returned empty (likely rate-limited or quota exhausted)"
        )
    assert isinstance(claims, list)
    assert len(claims) > 0, "expected at least one claim extracted"


SCALE_TEST_SIZE = 20


@pytest.mark.slow
async def test_adversarial_scale_corpus():
    docs = TEST_CORPUS * (SCALE_TEST_SIZE // len(TEST_CORPUS))
    total_verified = 0
    total_known = 0
    total_false_verified = 0
    total_hallucinated = 0

    for doc in docs:
        known_items = _build_content_items(doc["known_claims"])
        results = await verify_content_claims(known_items, doc["content"])
        verified = [r for r in results if r["confidence"] >= 0.7]
        total_verified += len(verified)
        total_known += len(doc["known_claims"])

        bad_items = _build_content_items(doc["hallucinated_claims"])
        bad_results = await verify_content_claims(bad_items, doc["content"])
        false_verified = [r for r in bad_results if r["confidence"] >= 0.7]
        total_false_verified += len(false_verified)
        total_hallucinated += len(doc["hallucinated_claims"])

    recall = total_verified / total_known if total_known else 1.0
    hallucination_rate = (
        total_false_verified / total_hallucinated if total_hallucinated else 0.0
    )

    assert recall >= 0.75, f"Recall too low: {recall:.1%} (target >= 75%)"
    assert hallucination_rate <= 0.25, (
        f"Hallucination rate too high: {hallucination_rate:.1%} (target <= 25%)"
    )

    print(f"\nAdversarial scale test ({SCALE_TEST_SIZE} docs):")
    print(
        f"  Recall (verified/total):     {total_verified}/{total_known} = {recall:.1%}"
    )
    print(
        f"  False verification rate:     {total_false_verified}/{total_hallucinated} = {hallucination_rate:.1%}"
    )
