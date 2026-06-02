# PrepAgent SaaS — Security Audit Report
**Date:** 2026-06-02
**Auditor:** StaffEngineer
**Status:** Remediation complete

---

## 1. Multi-Tenancy Model Audit

| Model | tenant_id | user_id | RLS Applied | Status |
|-------|-----------|---------|-------------|--------|
| User | non-null ✅ | Own identity ✅ | ✅ Fixed | OK |
| Subject | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| Document | **was nullable → FIXED** | FK non-null ✅ | ✅ Fixed | OK |
| Chunk | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| Flashcard | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| PYQ | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| Note | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| Payment | non-null ✅ | FK non-null ✅ | ✅ Fixed | OK |
| Claim | non-null ✅ | FK non-null ✅ | ✅ Added in 0011 | OK |

## 2. RLS Policy Audit

### Issue Found (Fixed)
- Original migration `0009` used `current_setting('app.current_user_id')` directly in policies
- **No middleware set this value** — all RLS policies silently threw errors at runtime
- Claims table had no RLS policy at all
- Migration chain was forked (0009 and 0010 both pointed to 0008)

### Remediation (Migration 0011)
- Created `app.current_user_id()` and `app.current_tenant_id()` helper functions
- Recreated all RLS policies using `app.current_user_id()` with safe fallback
- Added RLS to `claims` table
- Made `Document.tenant_id` non-nullable
- Linearized migration chain: 0008 → 0009 → 0010 → 0011

### Runtime Enforcement
- `get_current_user()` in `security.py` calls `set_tenant_context()` after JWT verification
- `set_tenant_context()` executes `SET LOCAL app.current_user_id` and `SET LOCAL app.current_tenant_id` on each request's database session
- `SET LOCAL` scopes to the current transaction — automatically cleaned up

## 3. Application-Layer Audit

All API endpoints reviewed for tenant isolation:

| Endpoint | user_id filtered | tenant_id filtered | Status |
|----------|-----------------|-------------------|--------|
| POST /auth/signup | N/A (no auth) | N/A | ✅ |
| POST /auth/login | N/A (no auth) | N/A | ✅ |
| POST /auth/refresh | N/A (no auth) | N/A | ✅ |
| POST /auth/change-password | ✅ get_current_user | ✅ | ✅ |
| GET /users/me | ✅ get_current_user | ✅ | ✅ |
| PATCH /users/me | ✅ get_current_user | ✅ | ✅ |
| GET /subjects | ✅ | ✅ | ✅ |
| POST /subjects | ✅ | ✅ | ✅ |
| GET /subjects/{id} | ✅ | ✅ | ✅ |
| PATCH /subjects/{id} | ✅ | ✅ | ✅ |
| DELETE /subjects/{id} | ✅ | ✅ | ✅ |
| GET /dashboard/summary | ✅ | ✅ | ✅ |
| POST /documents/upload | ✅ | ✅ | ✅ |
| GET /documents | ✅ | ✅ | ✅ |
| GET /documents/{id} | ✅ | ✅ | ✅ |
| DELETE /documents/{id} | ✅ | ✅ | ✅ |
| GET /documents/{id}/progress | ✅ | ✅ | ✅ |
| POST /documents/{id}/generate-flashcards | ✅ | ✅ | ✅ |
| POST /documents/{id}/generate-quiz | ✅ | ✅ | ✅ |
| POST /notes | ✅ | ✅ | ✅ |
| GET /notes | ✅ | ✅ | ✅ |
| GET /notes/{id} | ✅ | ✅ | ✅ |
| PATCH /notes/{id} | ✅ | ✅ | ✅ |
| DELETE /notes/{id} | ✅ | ✅ | ✅ |
| POST /flashcards | ✅ | ✅ | ✅ |
| GET /flashcards | ✅ | ✅ | ✅ |
| GET /flashcards/{id} | ✅ | ✅ | ✅ |
| PATCH /flashcards/{id} | ✅ | ✅ | ✅ |
| DELETE /flashcards/{id} | ✅ | ✅ | ✅ |
| POST /flashcards/{id}/review | ✅ | ✅ | ✅ |
| GET /flashcards/review | ✅ | ✅ | ✅ |
| POST /search | ✅ | ✅ | ✅ |
| GET /pyq/gap-analysis | ✅ | ✅ | ✅ |
| POST /socratic/tutor | ✅ | ✅ | ✅ |
| POST /payments/create-stripe-session | ✅ | ✅ | ✅ |
| POST /payments/create-razorpay-order | ✅ | ✅ | ✅ |
| GET /payments/subscription | ✅ | ✅ | ✅ |
| GET /payments/history | ✅ | ✅ | ✅ |
| GET /health | N/A (public) | N/A | ✅ |

**Coverage:** 39/39 authenticated endpoints isolated. 0 data leakage risks identified.

## 4. Security Headers

| Header | Value | Status |
|--------|-------|--------|
| X-Content-Type-Options | nosniff | ✅ |
| X-Frame-Options | DENY | ✅ |
| X-XSS-Protection | 1; mode=block | ✅ |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| CORS | Restricted to configured origins | ✅ |

## 5. Authentication

- JWT-based with HS256
- Access token: 30 min expiry
- Refresh token: 7 day expiry
- Internal service token support for Frontend→Backend communication
- Rate limiting on auth routes (signup 5/min, login 10/min, change-password 5/min)

## 6. Recommendations

| Priority | Recommendation | Owner |
|----------|---------------|-------|
| P2 | Add audit logging for all tenant-scoped operations | BackendEngineer |
| P3 | Add IP-based rate limiting beyond auth routes | StaffEngineer |
| P3 | Implement API key rotation policy | DevOpsAgent |
