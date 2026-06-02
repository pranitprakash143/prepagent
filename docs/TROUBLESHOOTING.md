# PrepAgent SaaS — Troubleshooting Guide
**Last Updated:** 2026-06-02

## Common Issues

### 1. `docker compose up` fails
**Symptom:** Container exits immediately
**Cause:** Missing environment variables or port conflicts
**Fix:**
```bash
# Check logs
docker compose logs backend
# Ensure .env file exists with required vars
cp .env.example .env
# Check port availability
lsof -i :8000 -i :3000 -i :5432
```

### 2. Migration fails on fresh database
**Symptom:** `alembic upgrade head` errors
**Cause:** Forked migration chain or missing pgvector extension
**Fix:**
```bash
# Ensure pgvector extension exists
docker compose exec postgres psql -U prepagent -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Run migrations fresh
docker compose run --rm backend alembic upgrade head
```

### 3. AI generation timeout (flashcards/quizzes)
**Symptom:** Loading spinner never completes
**Cause:** LLM API key missing or document too large
**Fix:**
```bash
# Check LLM_API_KEY is set
docker compose exec backend env | grep LLM
# Reduce chunk size in config.py: CHUNK_SIZE = 500
```

### 4. Search returns zero results
**Symptom:** Empty search results for uploaded documents
**Cause:** Embeddings not generated or pgvector index not created
**Fix:**
```sql
-- Check chunks table has data
SELECT COUNT(*) FROM chunks;
-- Verify HNSW index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'chunks';
```

### 5. Payment webhook not received
**Symptom:** User pays but plan remains FREE
**Cause:** Webhook URL misconfigured or signature verification fails
**Fix:**
- Verify webhook endpoints in Stripe/Razorpay dashboard
- Check backend logs for webhook handler errors
- Use ngrok for local testing: `ngrok http 8000`

### 6. Login returns 401
**Symptom:** Invalid credentials error
**Cause:** bcrypt version mismatch or password hash corrupted
**Fix:**
```bash
# Verify bcrypt version in requirements.txt
pip install bcrypt==4.0.1
```

### 7. Frontend build fails
**Symptom:** `npm run build` errors
**Cause:** TypeScript errors or missing dependencies
**Fix:**
```bash
npm install
npm run type-check
npm run build
```

### 8. CORS errors in browser
**Symptom:** API calls blocked by CORS policy
**Cause:** ALLOWED_ORIGINS not including the frontend URL
**Fix:** Update `.env`: `ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com`
