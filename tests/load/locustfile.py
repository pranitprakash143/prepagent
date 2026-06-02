"""PrepAgent Locust load test — pgvector vector search focus.

Baseline targets:
  - 50 concurrent users
  - Ramp up 5 users/sec
  - Run for 5 minutes
  - Vector search p95 < 500ms
  - Zero errors on query_chroma calls
"""

import random
from locust import HttpUser, task, between


class PrepAgentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.token = None
        payload = {
            "email": f"loadtest{random.randint(0, 999999)}@example.com",
            "password": "TestPass123!",
        }
        resp = self.client.post("/api/v1/auth/signup", json=payload)
        if resp.status_code == 201:
            self.token = resp.json().get("access_token")
        else:
            resp = self.client.post("/api/v1/auth/login", json=payload)
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")

    @task(5)
    def vector_search(self):
        if not self.token:
            return
        queries = [
            "What is photosynthesis?",
            "Explain Newton's laws of motion",
            "What are the causes of World War II?",
            "How does the human heart work?",
            "What is the capital of France?",
        ]
        self.client.post(
            "/api/v1/search",
            json={"query": random.choice(queries), "limit": 5, "source": "document"},
            headers={"Authorization": f"Bearer {self.token}"},
        )

    @task(3)
    def document_upload(self):
        if not self.token:
            return
        self.client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", b"This is a test document for load testing.", "text/plain")},
            headers={"Authorization": f"Bearer {self.token}"},
        )

    @task(3)
    def flashcard_generation(self):
        if not self.token:
            return
        self.client.post(
            "/api/v1/flashcards",
            json={"question": "Test question?", "answer": "Test answer.", "subject_id": None},
            headers={"Authorization": f"Bearer {self.token}"},
        )

    @task(2)
    def gap_analysis(self):
        if not self.token:
            return
        self.client.get(
            "/api/v1/pyq/gap-analysis",
            headers={"Authorization": f"Bearer {self.token}"},
        )

    @task(1)
    def health_check(self):
        self.client.get("/api/v1/health")
