import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


SUPPORTED_PROVIDERS = {
    "openai": {
        "base_url": None,
        "env_key": "LLM_API_KEY",
        "model_default": "gpt-4o-mini",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "model_default": "gemini-2.0-flash",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "model_default": "llama-3.3-70b-versatile",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "model_default": "openai/gpt-4o-mini",
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "env_key": "MISTRAL_API_KEY",
        "model_default": "mistral-small-latest",
    },
    "anthropic": {
        "base_url": None,
        "env_key": "ANTHROPIC_API_KEY",
        "model_default": "claude-3-5-haiku-latest",
    },
}


def build_llm(temperature: float = 0.0, **extra_kwargs: Any) -> Any:
    provider = (settings.LLM_PROVIDER or "openai").lower().strip()

    if provider not in SUPPORTED_PROVIDERS:
        logger.warning("Unknown LLM_PROVIDER=%s, falling back to openai", provider)
        provider = "openai"

    cfg = SUPPORTED_PROVIDERS[provider]
    api_key = getattr(settings, cfg["env_key"], None) or settings.LLM_API_KEY
    model = settings.LLM_MODEL or cfg["model_default"]

    if not api_key:
        raise ValueError(
            f"No API key found for provider '{provider}'. "
            f"Set {cfg['env_key']} or LLM_API_KEY in environment."
        )

    from langchain_openai import ChatOpenAI

    kwargs: dict = {
        "model": model,
        "api_key": api_key,
        "temperature": temperature,
    }

    base_url = settings.LLM_API_BASE or cfg["base_url"]
    if base_url:
        kwargs["base_url"] = base_url

    kwargs.update(extra_kwargs)
    return ChatOpenAI(**kwargs)
