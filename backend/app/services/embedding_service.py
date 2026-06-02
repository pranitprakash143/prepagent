import json
import logging
from typing import List, Optional
from urllib.request import Request, urlopen

import numpy as np
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


SUPPORTED_EMBEDDING_PROVIDERS = {
    "openai": {
        "base_url": None,
        "env_key": "LLM_API_KEY",
        "model_default": "text-embedding-3-small",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "model_default": "text-embedding-004",
    },
}

GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"


def _get_api_key() -> str:
    provider = (settings.EMBEDDING_PROVIDER or "openai").lower().strip()
    if provider not in SUPPORTED_EMBEDDING_PROVIDERS:
        provider = "openai"
    cfg = SUPPORTED_EMBEDDING_PROVIDERS[provider]
    api_key = getattr(settings, cfg["env_key"], None) or settings.LLM_API_KEY
    if not api_key:
        raise ValueError(
            f"No API key found for embedding provider {provider}. "
            f"Set {cfg[env_key]} or LLM_API_KEY in environment."
        )
    return api_key


def _get_model() -> str:
    provider = (settings.EMBEDDING_PROVIDER or "openai").lower().strip()
    if provider not in SUPPORTED_EMBEDDING_PROVIDERS:
        provider = "openai"
    cfg = SUPPORTED_EMBEDDING_PROVIDERS[provider]
    return settings.EMBEDDING_MODEL or cfg["model_default"]


def embed_texts(texts: List[str]) -> List[List[float]]:
    provider = (settings.EMBEDDING_PROVIDER or "openai").lower().strip()
    if provider not in SUPPORTED_EMBEDDING_PROVIDERS:
        provider = "openai"

    if provider == "gemini":
        return _embed_texts_gemini(texts)

    return _embed_texts_openai(texts)


def _embed_texts_openai(texts: List[str]) -> List[List[float]]:
    api_key = _get_api_key()
    model = _get_model()
    client = OpenAI(api_key=api_key)
    response = client.embeddings.create(model=model, input=texts)
    return [data.embedding for data in response.data]


def _embed_texts_gemini(texts: List[str]) -> List[List[float]]:
    api_key = _get_api_key()
    model = _get_model()
    results = []

    for text in texts:
        url = GEMINI_EMBED_URL.format(model=model)
        payload = json.dumps(
            {"model": f"models/{model}", "content": {"parts": [{"text": text}]}}
        ).encode()
        req = Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
        )
        resp = urlopen(req)
        data = json.loads(resp.read().decode())
        results.append(data["embedding"]["values"])

    return results


def embed_text(text: str) -> List[float]:
    return embed_texts([text])[0]
