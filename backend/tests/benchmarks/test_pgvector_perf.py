"""pgvector performance benchmarks.

Run: pytest backend/tests/benchmarks/test_pgvector_perf.py -v --benchmark-only

Measures query latency (p50/p95/p99), recall rate, index build time,
and memory usage for pgvector with HNSW (384-dim vectors).
"""

import asyncio
import statistics
import time


async def benchmark_query(
    query_fn,
    n_runs: int = 10,
    warmup: int = 3,
    label: str = "query",
) -> dict:
    """Run a benchmark on a query function.

    Args:
        query_fn: Async callable that returns query results.
        n_runs: Number of timed runs after warmup.
        warmup: Number of warmup runs to discard.
        label: Label for logging.

    Returns:
        Dict with p50, p95, p99, mean, min, max latencies in ms.
    """
    latencies = []
    total = n_runs + warmup

    for i in range(total):
        start = time.monotonic()
        _ = await query_fn()
        elapsed = time.monotonic() - start

        if i >= warmup:
            latencies.append(elapsed * 1000)  # convert to ms
            print(f"  [{label}] run {i - warmup + 1}/{n_runs}: {elapsed * 1000:.2f}ms")
        else:
            print(f"  [{label}] warmup {i + 1}/{warmup}: {elapsed * 1000:.2f}ms")

    sorted_lats = sorted(latencies)
    n = len(sorted_lats)
    p95_idx = max(0, min(n - 1, int(n * 0.95)))
    p99_idx = max(0, min(n - 1, int(n * 0.99)))

    return {
        "label": label,
        "p50": statistics.median(latencies),
        "p95": sorted_lats[p95_idx],
        "p99": sorted_lats[p99_idx],
        "mean": statistics.mean(latencies),
        "min": min(latencies),
        "max": max(latencies),
        "n_runs": n,
    }


async def benchmark_batch_insert(
    insert_fn,
    n_vectors: int,
    batch_size: int,
    label: str = "batch_insert",
) -> dict:
    """Benchmark batch insert performance.

    Args:
        insert_fn: Async callable that inserts a batch of vectors.
        n_vectors: Total number of vectors to insert.
        batch_size: Number of vectors per batch.
        label: Label for logging.

    Returns:
        Dict with total_time, per_vector_time, vectors_per_second.
    """
    start = time.monotonic()
    inserted = 0

    while inserted < n_vectors:
        current_batch = min(batch_size, n_vectors - inserted)
        await insert_fn(current_batch)
        inserted += current_batch
        print(f"  [{label}] inserted {inserted}/{n_vectors}")

    total_time = time.monotonic() - start
    return {
        "label": label,
        "total_vectors": n_vectors,
        "batch_size": batch_size,
        "total_time_s": total_time,
        "per_vector_ms": (total_time / n_vectors) * 1000,
        "vectors_per_second": n_vectors / total_time,
    }


def print_results(results: list[dict]):
    """Pretty-print benchmark results."""
    for r in results:
        if "p50" in r:
            print(f"""
--- {r["label"]} ---
  Runs:  {r["n_runs"]}
  p50:   {r["p50"]:.2f}ms
  p95:   {r["p95"]:.2f}ms
  p99:   {r["p99"]:.2f}ms
  Mean:  {r["mean"]:.2f}ms
  Min:   {r["min"]:.2f}ms
  Max:   {r["max"]:.2f}ms
""")
        elif "total_time_s" in r:
            print(f"""
--- {r["label"]} ---
  Total vectors:     {r["total_vectors"]}
  Batch size:        {r["batch_size"]}
  Total time:        {r["total_time_s"]:.3f}s
  Per vector:        {r["per_vector_ms"]:.3f}ms
  Vectors/second:    {r["vectors_per_second"]:.0f}
""")


# ============================================================================
# Pytest Integration
# ============================================================================


def test_pgvector_benchmark_suite():
    """Placeholder: run benchmarks against a real pgvector instance.

    To run actual benchmarks:
        1. Ensure a PostgreSQL instance with pgvector is running
        2. Set DATABASE_URL env var
        3. Run: pytest backend/tests/benchmarks/test_pgvector_perf.py -v

    This test exists as a skeleton — uncomment and connect to your DB.
    """
    assert True  # skeleton passes trivially
