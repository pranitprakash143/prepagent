# PrepAgent Performance Guide

## pgvector HNSW Index Tuning

### Why HNSW (vs IVFFlat)

- **HNSW** (Hierarchical Navigable Small World) provides better recall at query time with minimal tuning.
- **IVFFlat** requires careful training and can degrade recall if the dataset distribution shifts.
- For 384-dim embeddings (all-MiniLM-L6-v2), HNSW achieves >95% recall with m=16 at comparable speed.

### Current Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `m` | 16 | Maintains recall quality at 384-dim without excessive memory |
| `ef_construction` | 200 | Balances index build time vs query accuracy |

### When to Tune

| Scenario | Action |
|----------|--------|
| Recall < 95% | Increase `m` to 24–32 |
| Index build too slow | Decrease `ef_construction` to 100 |
| Memory is constrained | Lower `m` to 12 (may reduce recall) |
| Query speed too slow | Reduce `ef_search` at query time (runtime param, not index) |

### Memory Considerations

Each 384-dim vector consumes:
- Raw data: 384 × 4 bytes (float32) = 1,536 bytes
- HNSW overhead: m × 4 + 8 ≈ 72 bytes per vector
- Total: ~1.6 KB per vector
- Per 1,000 vectors: ~28 KB
- Per 1,000,000 vectors: ~28 MB

## Load Testing Baseline Targets

| Metric | Target | Status |
|--------|--------|--------|
| Concurrent users | 50 | Baseline |
| Ramp up rate | 5 users/sec | ✅ |
| Run duration | 5 minutes | Baseline |
| Vector search p50 | < 200ms | TBD |
| Vector search p95 | < 500ms | Target |
| Vector search p99 | < 1000ms | Target |
| Error rate (vector search) | 0% | Target |
| Health check p50 | < 100ms | Baseline |

### Index Validation

To verify HNSW index is being used:

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chunks';
```

Expected output includes:
```
idx_chunks_embedding_hnsw | CREATE INDEX idx_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=200)
```

To confirm the index is used in queries:

```sql
EXPLAIN ANALYZE
SELECT id FROM chunks ORDER BY embedding <=> '[0.01, 0.02, ...]' LIMIT 10;
```

Look for `Index Scan using idx_chunks_embedding_hnsw` in the query plan.

## pgvector vs ChromaDB Baseline

This section establishes the pgvector baseline. ChromaDB data is historical only.

| Metric | ChromaDB | pgvector (HNSW) | Improvement |
|--------|----------|-----------------|-------------|
| Query latency (p50) | — | — | TBD |
| Query latency (p95) | — | — | TBD |
| Index build time | — | — | TBD |
| Memory usage | — | — | TBD |
| Storage per 1K vectors | — | ~28 KB | TBD |
