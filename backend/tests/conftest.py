import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

settings.RATE_LIMIT_ENABLED = False

from app.main import create_app
from app.core.database import Base, get_session

# Tests use SQLite in-memory for speed.
# Production uses PostgreSQL (set via DATABASE_URL env var).
DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_engine():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_session(async_engine):
    async_session_local = sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_local() as session:
        yield session


@pytest.fixture
def client(async_session):
    app = create_app()

    async def override_get_session():
        yield async_session

    app.dependency_overrides[get_session] = override_get_session
    return TestClient(app)
