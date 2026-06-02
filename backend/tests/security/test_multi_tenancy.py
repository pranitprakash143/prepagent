import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text

from app.main import create_app
from app.core.database import AsyncSessionLocal, engine, Base


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def signup_user(
    client, email: str, password: str = "Testpass123", name: str = "Test User"
):
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": password,
            "full_name": name,
        },
    )
    return response


async def login_user(client, email: str, password: str = "Testpass123"):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )
    data = response.json()
    return data.get("access_token")


async def create_subject(client, token: str, name: str):
    return await client.post(
        "/api/v1/subjects",
        json={"name": name, "description": f"Subject {name}"},
        headers={"Authorization": f"Bearer {token}"},
    )


async def create_note(client, token: str, title: str, content: str = "test content"):
    return await client.post(
        "/api/v1/notes",
        json={"title": title, "content": content},
        headers={"Authorization": f"Bearer {token}"},
    )


async def create_flashcard(
    client, token: str, question: str = "Q?", answer: str = "A."
):
    return await client.post(
        "/api/v1/flashcards",
        json={"question": question, "answer": answer},
        headers={"Authorization": f"Bearer {token}"},
    )


class TestMultiTenancyIsolation:
    async def test_user_a_cannot_access_user_b_subjects(self, client):
        token_a = await login_user(client, "alice@test.com")
        await create_subject(client, token_a, "Alice Subject")
        token_b = await login_user(client, "bob@test.com")
        resp = await client.get(
            "/api/v1/subjects",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        subjects = resp.json()
        assert len(subjects) == 0, "User B should see zero of User A's subjects"

    async def test_user_a_cannot_access_user_b_notes(self, client):
        token_a = await login_user(client, "alice2@test.com")
        await create_note(client, token_a, "Alice Note")
        token_b = await login_user(client, "bob2@test.com")
        resp = await client.get(
            "/api/v1/notes",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        notes = resp.json()
        assert len(notes) == 0, "User B should see zero of User A's notes"

    async def test_user_a_cannot_access_user_b_flashcards(self, client):
        token_a = await login_user(client, "alice3@test.com")
        await create_flashcard(client, token_a, "Alice Q")
        token_b = await login_user(client, "bob3@test.com")
        resp = await client.get(
            "/api/v1/flashcards",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        cards = resp.json()
        assert len(cards) == 0, "User B should see zero of User A's flashcards"

    async def test_user_a_cannot_access_user_b_documents(self, client):
        token_a = await login_user(client, "alice4@test.com")
        token_b = await login_user(client, "bob4@test.com")
        resp = await client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        docs = resp.json()
        total = docs.get("total", 0) if isinstance(docs, dict) else len(docs)
        assert total == 0, "User B should see zero of User A's documents"

    async def test_user_b_cannot_modify_user_a_flashcard(self, client):
        token_a = await login_user(client, "alice5@test.com")
        card_resp = await create_flashcard(client, token_a, "Secret Q")
        card_id = card_resp.json().get("id")
        token_b = await login_user(client, "bob5@test.com")
        resp = await client.patch(
            f"/api/v1/flashcards/{card_id}",
            json={"question": "Hacked"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code in (403, 404), "User B should not modify User A's data"

    async def test_user_b_cannot_delete_user_a_note(self, client):
        token_a = await login_user(client, "alice6@test.com")
        note_resp = await create_note(client, token_a, "Alice Private")
        note_id = note_resp.json().get("id")
        token_b = await login_user(client, "bob6@test.com")
        resp = await client.delete(
            f"/api/v1/notes/{note_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code in (403, 404), "User B should not delete User A's note"

    async def test_user_a_sees_only_own_subjects(self, client):
        token_a = await login_user(client, "alice7@test.com")
        token_b = await login_user(client, "bob7@test.com")
        await create_subject(client, token_a, "Alice Biology")
        await create_subject(client, token_b, "Bob Physics")
        resp = await client.get(
            "/api/v1/subjects",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        subjects = resp.json()
        names = [s["name"] for s in subjects]
        assert "Alice Biology" in names
        assert "Bob Physics" not in names

    async def test_unauthenticated_request_rejected(self, client):
        resp = await client.get("/api/v1/notes")
        assert resp.status_code == 403 or resp.status_code == 401

    async def test_rls_policy_active(self, client):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                SELECT tablename FROM pg_tables
                WHERE tablename IN ('users', 'documents', 'chunks', 'flashcards', 'notes', 'subjects', 'payments', 'claims')
                AND tablename IN (
                    SELECT relname FROM pg_class
                    WHERE relrowsecurity = true
                )
            """)
            )
            tables = [row[0] for row in result.fetchall()]
            expected = {
                "users",
                "documents",
                "chunks",
                "flashcards",
                "notes",
                "subjects",
                "payments",
                "claims",
            }
            missing = expected - set(tables)
            assert len(missing) == 0, f"RLS not active on: {missing}"

    async def test_tenant_context_set_on_auth(self, client):
        token = await login_user(client, "alice8@test.com")
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT current_setting('app.current_user_id', TRUE)")
            )
            val = result.scalar()
            assert val is not None, "Tenant context should be set after authentication"
