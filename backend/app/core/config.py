"""
Application configuration and settings
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://prepagent:prepagent_dev@localhost:5432/prepagent_db"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    AUTH_RATE_LIMIT: str = "10/minute"
    UPLOAD_RATE_LIMIT: str = "5/minute"

    # CORS
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost,http://127.0.0.1:3000"
    )

    # File upload
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_DOCUMENT_TYPES: str = "pdf,jpg,jpeg,png"
    USE_S3: bool = False
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_ENDPOINT_URL: Optional[str] = None

    # LLM & Embeddings
    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100

    # LLM Provider (openai, gemini, groq, openrouter, mistral, anthropic)
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = ""
    LLM_API_BASE: Optional[str] = None

    # Provider-specific API keys
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    MISTRAL_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # Internal token for Frontend → Backend auth
    FASTAPI_INTERNAL_TOKEN: Optional[str] = None

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Payments
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_ID_MONTHLY: Optional[str] = None
    STRIPE_PRICE_ID_YEARLY: Optional[str] = None
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
