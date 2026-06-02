# PrepAgent SaaS — Deployment Guide
**Last Updated:** 2026-06-02

## Architecture
- **Frontend:** Next.js 16 (App Router) — serves UI, handles auth, CRUD via Server Actions
- **Backend:** Python FastAPI — AI ingestion, pgvector search, LangGraph pipelines
- **Database:** PostgreSQL 15 + pgvector extension
- **Cache:** Redis 7 (optional, auto-disables if unavailable)
- **Proxy:** Nginx with SSL termination (Let's Encrypt)

## Prerequisites
- Docker & Docker Compose v2
- Git
- Domain pointing to server (for SSL)

## Environment Variables
```bash
# Required
SECRET_KEY=<random-64-char-string>
DATABASE_URL=postgresql+asyncpg://prepagent:<password>@postgres:5432/prepagent_db

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# Razorpay (for India payments)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Optional
SENTRY_DSN=https://...
REDIS_URL=redis://redis:6379/0
USE_S3=true
AWS_S3_BUCKET=prepagent-uploads
```

## Deployment Steps

### 1. EC2 Instance Setup
```bash
ssh -i your-key.pem ubuntu@your-instance
git clone https://github.com/your-org/prepagent-saas.git
cd prepagent-saas
cp .env.example .env
# Edit .env with production values
chmod +x deploy/ec2-setup.sh
sudo ./deploy/ec2-setup.sh
```

### 2. Deploy Latest
```bash
./deploy/deploy.sh
```
This pulls latest code, rebuilds images, runs migrations, restarts services.

### 3. Manual Deploy
```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.prod.yml up -d
```

## Health Check
```bash
curl https://your-domain.com/api/v1/health
# Expected: {"status":"ok","environment":"production","service":"PrepAgent SaaS API"}
```

## Rollback
```bash
git reset --hard <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

## Monitoring
- **Sentry:** Monitor errors and performance
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f`
- **PostgreSQL:** `docker compose exec postgres psql -U prepagent -d prepagent_db`
