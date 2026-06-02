# PrepAgent SaaS — Runbook
**Last Updated:** 2026-06-02

## Incident Response

### 1. Database Down
**Detection:** Health check returns `database: unhealthy` or API returns 500s
**Diagnosis:**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U prepagent
```
**Mitigation:**
```bash
docker compose restart postgres
```
**Resolution:** If disk full, prune old Docker volumes:
```bash
docker system prune -af --volumes
```

### 2. pgvector Unavailable
**Detection:** Vector search returns empty results or 500
**Diagnosis:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT tablename FROM pg_tables WHERE tablename = 'chunks';
```
**Mitigation:**
```bash
docker compose run --rm backend alembic upgrade head
```

### 3. Redis OOM
**Detection:** Cache operations fail, backend logs show Redis errors
**Diagnosis:**
```bash
docker compose exec redis redis-cli INFO memory
```
**Mitigation:** Flush cache:
```bash
docker compose exec redis redis-cli FLUSHDB
```

### 4. AI Service Timeout
**Detection:** Flashcard/quiz generation takes >30s
**Diagnosis:** Check OpenAI API status + backend logs
**Mitigation:** Retry with smaller document. Reduce chunk count in config.

### 5. Migration Failure
**Detection:** `alembic upgrade head` fails
**Diagnosis:** Check migration chain:
```bash
docker compose run --rm backend alembic history
```
**Mitigation:**
```bash
docker compose run --rm backend alembic downgrade -1
# Fix migration file, then re-run
docker compose run --rm backend alembic upgrade head
```

### 6. SSL Certificate Expiry
**Detection:** Browser shows "Not Secure"
**Mitigation:**
```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### 7. High Memory Usage
**Detection:** `docker stats` shows >80% memory
**Diagnosis:**
```bash
docker compose top
```
**Mitigation:** Restart backend with fewer workers, reduce connection pool size.

### 8. CI/CD Pipeline Failure
**Detection:** GitHub Actions shows red
**Diagnosis:** Check workflow logs in GitHub Actions tab
**Mitigation:** Fix the failing test, re-run the workflow

## Escalation
- **P0 (Service Down):** StaffEngineer immediately
- **P1 (Degraded):** BackendEngineer within 1 hour
- **P2 (Minor):** Next business day
