# PrepAgent SaaS - AI-Powered Study Assistant

A modern, multi-tenant SaaS platform leveraging AI to help students prepare for competitive exams through intelligent study materials, past year questions analysis, and adaptive learning.

## 📋 Project Structure

```
prepagent-saas/
├── frontend/              # Next.js 14 App Router application
│   ├── app/              # Next.js app directory
│   ├── components/       # React components (Shadcn UI)
│   ├── lib/             # Utilities and helpers
│   └── public/          # Static assets
├── backend/              # FastAPI async REST API
│   ├── app/             # Main application code
│   │   ├── api/         # API route handlers
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── middleware/  # Auth & cross-cutting concerns
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app setup
│   ├── tests/           # Pytest test suite
│   └── requirements.txt
├── docker-compose.yml    # Local development services
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD pipeline to AWS EC2
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Local Development

1. **Clone and setup**
```bash
git clone <repo-url>
cd prepagent-saas
cp .env.example .env
```

2. **Start services with Docker Compose**
```bash
docker-compose up
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5432
- pgvector (PostgreSQL): vector search enabled

3. **Manual Setup (without Docker)**

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Architecture

### Backend Stack
- **FastAPI**: Async REST API framework
- **SQLAlchemy**: Async ORM with PostgreSQL
- **pgvector**: Vector search via PostgreSQL extension
- **LangGraph**: Async pipeline orchestration
- **JWT**: Stateless authentication

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **Shadcn UI**: Component library
- **Tailwind CSS**: Utility-first styling
- **Zustand/Jotai**: State management
- **React Hook Form**: Form management

### Infrastructure
- **Docker Compose**: Local development environment
- **PostgreSQL 15**: Primary database
- **pgvector**: Vector search extension for PostgreSQL
- **GitHub Actions**: CI/CD pipeline
- **AWS EC2**: Production deployment target

## 🔐 Security & Multi-Tenancy

- **JWT Authentication**: Token-based auth with 30-min expiry
- **Tenant Isolation**: All tables include `tenant_id` field
- **Password Hashing**: bcrypt with passlib
- **HTTPS Enforced**: Production-ready SSL/TLS setup
- **Environment Secrets**: No hardcoded credentials

## 📦 Database Schema

Core tables (multi-tenant):
- `users`: User accounts with tenant isolation
- `subjects`: Study subjects/courses
- `documents`: Uploaded PDFs/resources
- `chunks`: Split document segments with embeddings
- `pyqs`: Past year questions database
- `flashcards`: Student study flashcards

## 🔄 CI/CD Pipeline

GitHub Actions workflow:
1. **Build**: Docker images for backend & frontend
2. **Test**: Backend unit tests, frontend linting
3. **Deploy**: SSH to AWS EC2, update services

**Required GitHub Secrets:**
```
EC2_HOST          # Instance IP
EC2_USER          # SSH user (ec2-user)
EC2_SSH_KEY       # Private SSH key
DB_USER           # Database user
DB_PASSWORD       # Database password
SECRET_KEY        # JWT signing key
SLACK_WEBHOOK     # Notifications (optional)
```

## 📝 Development Guidelines

### Code Style
- **Python**: Follow PEP 8, use type hints
- **JavaScript/TypeScript**: Use ESLint config, Prettier formatting
- **API**: RESTful with `/api/v1/` prefix

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Testing
```bash
# Backend
cd backend && pytest tests/ --cov=app

# Frontend
cd frontend && npm run test
```

### Environment Variables
Never commit `.env` file. Use `.env.example` as template and load secrets from GitHub Actions or AWS Secrets Manager.

## 🎯 Implementation Phases

**Phase 1: Scaffolding & CI/CD** (Current)
- ✅ Monorepo structure
- ✅ Docker Compose setup
- ✅ GitHub Actions pipeline

**Phase 2: Backend Foundation**
- Database schema with multi-tenancy
- JWT authentication middleware
- pgvector RAG pipeline

**Phase 3: Frontend App**
- Next.js App Router setup
- Shadcn UI component library
- Auth flows & dashboard

**Phase 4: Ingestion Pipeline**
- Async PDF processing
- Vector embedding & storage
- Real-time SSE progress

**Phase 5: Features**
- Tiptap editor for notes
- PYQ analysis engine
- Socratic chatbot
- Flashcard system

## 📚 References

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Guide](https://fastapi.tiangolo.com/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Shadcn UI](https://ui.shadcn.com/)
- [pgvector Docs](https://github.com/pgvector/pgvector)

## 📄 License

MIT License - See LICENSE file for details
