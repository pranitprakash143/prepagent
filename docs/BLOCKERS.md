# PrepAgent SaaS — Blockers & Remaining Work

**Last Updated:** 2026-06-02 (v4 — Multi-provider LLM abstraction built, P0 items verified with Gemini)
**Beta Launch Target:** June 30, 2026

---

## P0 — BLOCKER for Beta Launch

| # | Blocker | Impact | Required Action | Owner | Status |
|---|---------|--------|-----------------|-------|--------|
| 1 | Migration 0011 not applied on production DB | All RLS fixes exist in code but not active on production. **Migration code verified + RLS middleware validated.** | SSH into production EC2, backup DB, run `alembic upgrade head`, verify `pg_policies` | DevOpsAgent | 🟡 CODE DONE — needs SSH |
| 2 | Playwright E2E CI first run | 57 E2E tests exist across 3 browser projects. **Test code verified, config correct, CI pipeline configured.** | Push to main to trigger GitHub Actions, verify all 57 tests pass | DevOpsAgent | 🟡 CODE DONE — needs push |
| 3 | Adversarial scale test | **12/12 adversarial tests passed with Gemini 2.0 Flash.** Hallucination metrics documented. | Re-run with different provider if needed (scale test already passed) | AIAgent | ✅ COMPLETE |

## P1 — HIGH Priority

| # | Item | Impact | Required Action | Owner | Status |
|---|------|--------|-----------------|-------|--------|
| 5 | Gap agent + Socratic agent wiring unverified | `fact_verifier_node.py` is wired into documents API (flashcard/quiz gen), but gap_agent and socratic_agent integration status is unconfirmed. | Audit both agents for `verify_content_claims` usage, document wiring status | AIAgent | ⏳ PENDING |
| 6 | Database connection pool not tuned | Current pool settings (size=10, overflow=20) are guesses. Risk of pool exhaustion under 100+ concurrent users. | Monitor pool usage under load, adjust `DATABASE_POOL_SIZE` and `DATABASE_MAX_OVERFLOW` | BackendEngineer | ⏳ PENDING |
| 7 | Redis cache hit ratio unknown | Redis is deployed but cache hit ratio has never been measured. Target: >60%. | Monitor cache metrics, adjust TTLs, add circuit breaker pattern | BackendEngineer | ⏳ PENDING |

## P2 — Medium Priority

| # | Item | Impact | Required Action | Owner | Status |
|---|------|--------|-----------------|-------|--------|
| 8 | Dockerfile still uses Python 3.11 | Backend `Dockerfile` uses `python:3.11-slim` but dev environment uses Python 3.12. Inconsistency may cause compatibility issues. | Update Dockerfile to `python:3.12-slim`, rebuild and verify tests pass | BackendEngineer | ⏳ PENDING |
| 9 | S3 storage not enabled | `USE_S3=False` in config. All uploads go to local disk (ephemeral on EC2 — data loss on container restart). | Set `USE_S3=True`, configure bucket, test presigned URL upload flow | BackendEngineer | ⏳ PENDING |
| 10 | Prisma schema not reconciled with production DB | Frontend Prisma schema exists but may be out of sync with actual PostgreSQL schema managed by SQLAlchemy migrations. | Audit differences, align Prisma schema, test CRUD via Prisma | FrontendEngineer | ⏳ PENDING |
| 11 | Frontend still uses `"use client"` on all pages | YC Mentor directive: RSC-first. All 16+ pages currently client-rendered, missing Next.js SSR benefits. | Convert static pages to RSC, keep client islands only for interactivity | FrontendEngineer | ⏳ PENDING |
| 12 | Custom UI components not migrated to Shadcn | Most UI is custom-built CSS. YC Mentor directive: use Shadcn primitives. | Init Shadcn, replace custom components incrementally | FrontendEngineer | ⏳ PENDING |

## P3 — Nice to Have

| # | Item | Impact | Required Action | Owner | Status |
|---|------|--------|-----------------|-------|--------|
| 13 | Load test not run in production-like environment | Locust test exists but hasn't been executed against production-scale setup. Scaling profile unknown. | Run `locust -f tests/load/locustfile.py -u 100 -r 10 -t 5m`, document results | StaffEngineer | ⏳ PENDING |
| 14 | No multi-region deployment | Primary users are Indian students. US-East deployment adds 200-300ms latency. | Provision ap-south-1 EC2, configure Route53 latency routing | DevOpsAgent | ⏳ PENDING |
| 15 | No user analytics | Zero visibility into user behavior, retention loop effectiveness, DAU, study patterns. | Add event tracking, create analytics API, build usage dashboard | StaffEngineer | ⏳ PENDING |
| 16 | No team/enterprise accounts | UPSC coaching institutes cannot manage student groups. Blocks B2B revenue. | Design org model, implement admin dashboard, add bulk billing | StaffEngineer | ⏳ PENDING |

---

## What's Already Done (Phase 8 Complete Items)

| Item | Status | Evidence |
|------|--------|----------|
| RLS policies in code (migration 0011) | ✅ Complete | `backend/alembic/versions/f1a2b3c4d5e6_0011_fix_tenant_and_rls.py` |
| Multi-tenancy test suite (10 scenarios) | ✅ Complete | `backend/tests/security/test_multi_tenancy.py` |
| SECURITY_AUDIT.md (39/39 endpoints audited) | ✅ Complete | `docs/SECURITY_AUDIT.md` |
| Fact verifier node (claim extraction, span matching, confidence scoring) | ✅ Complete | `backend/app/graphs/fact_verifier_node.py` |
| Claim model + migration 0010 | ✅ Complete | `backend/app/models/claim.py` |
| Adversarial test framework | ✅ Complete | `backend/tests/security/test_adversarial.py` |
| Playwright E2E tests (24 total) | ✅ Complete | `frontend/tests/e2e/core-workflow.spec.ts`, `mobile.spec.ts` |
| Redis cache layer + docker-compose entries | ✅ Complete | `backend/app/core/cache.py`, `docker-compose.yml` |
| Sentry fully removed (12 files) | ✅ Complete | All Sentry references purged from codebase |
| Missing API routers restored (dashboard, subjects, notes, flashcards, payments) | ✅ Complete | `backend/app/main.py` |
| PyMuPDF (fitz) installed for PDF extraction | ✅ Complete | `backend/requirements.txt`, Docker container |
| CI/CD pipeline with Playwright job | ✅ Complete | `.github/workflows/deploy.yml` |
| Load test framework (Locust) | ✅ Complete | `tests/load/locustfile.py` |
| Operation docs (DEPLOYMENT_GUIDE, RUNBOOK, TROUBLESHOOTING) | ✅ Complete | `docs/` |
| Phase 9 roadmap | ✅ Complete | `IMPLEMENTATION_PLAN.md` §Phase 9 |
| Backend health: all 3 checks healthy | ✅ Complete | `GET /api/v1/health` |
| Auth flow: signup → login → users/me → 200 | ✅ Complete | Verified end-to-end |
| Frontend pages: all 7 routes return 200 | ✅ Complete | `/`, `/login`, `/signup`, `/dashboard`, `/upload`, `/search`, `/quiz` |
| Backend tests: 49 pass, 11 skip, 0 fail | ✅ Complete | `pytest tests/ -v --tb=short` |
| Backend tests re-run: 56 pass, 11 skip, 0 fail | ✅ Complete | Confirmed all adversarial tests pass |
| Adversarial scale test passed with Gemini: 12/12 tests | ✅ Complete | 20-doc scale corpus passed recall >= 75% + hallucination <= 25% targets |
| Multi-provider LLM abstraction built | ✅ Complete | `app/core/llm_provider.py` — supports OpenAI, Gemini, Groq, OpenRouter, Mistral, Anthropic |
| HALLUCINATION_METRICS.md updated | ✅ Complete | Latest test run results documented with Gemini |

---

## Summary

| Priority | Count | Critical Path |
|----------|-------|---------------|
| P0 (BLOCKER) | 3 → 1 complete | DevOpsAgent: 2 items (need production SSH + CI push) |
| P1 (HIGH) | 3 | BackendEngineer: 2 items, AIAgent: 1 item |
| P2 (MEDIUM) | 5 | BackendEngineer: 2, FrontendEngineer: 3 |
| P3 (NICE) | 4 | StaffEngineer: 2, DevOpsAgent: 1, BackendEngineer: 0 |
| **Total** | **15** | |

### Critical Path to Beta Launch
```
Migration 0011 🟡 code DONE — apply on production [DevOpsAgent]
  → Playwright E2E 🟡 code DONE — trigger CI [DevOpsAgent]
    → Adversarial tests ✅ COMPLETE — passed with Gemini [verified]
      → StaffEngineer (QA sign-off, go/no-go) [June 8-9]
        → BETA LAUNCH [June 30]
```
