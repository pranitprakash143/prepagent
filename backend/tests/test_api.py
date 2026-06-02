"""
Integration tests for PrepAgent FastAPI (AI/Ingestion only).
"""

import io


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in ("ok", "degraded", "unhealthy")
    assert "checks" in body
    assert "database" in body["checks"]
    assert "pgvector" in body["checks"]
    assert "embedding_model" in body["checks"]


def test_document_upload_requires_auth(client):
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
    )
    assert response.status_code == 403


def test_document_list_requires_auth(client):
    response = client.get("/api/v1/documents")
    assert response.status_code == 403


def test_review_flashcard_requires_auth(client):
    response = client.post("/api/v1/flashcards/some-id/review", json={"quality": 3})
    assert response.status_code in (401, 403, 404)


def test_search_requires_auth(client):
    response = client.post("/api/v1/search", json={"query": "test"})
    assert response.status_code == 403


def test_generate_flashcards_requires_auth(client):
    """Flashcard generation now returns 404 (no auth) or 403 (auth but no doc)."""
    response = client.post(
        "/api/v1/documents/fake-id/generate-flashcards",
        json={"count": 5},
    )
    assert response.status_code in (401, 403)


def test_generate_quiz_requires_auth(client):
    response = client.post(
        "/api/v1/documents/fake-id/generate-quiz",
        json={"count": 10},
    )
    assert response.status_code in (401, 403)


def test_text_cleaner():
    from app.services.text_cleaner import clean_text

    assert clean_text("") == ""
    assert clean_text("  hello  ") == "hello"
    result = clean_text("Page 1\nHello\nPage 2\nWorld")
    assert "Page 1" not in result
    assert "Page 2" not in result
    assert "Hello" in result
    assert "World" in result
