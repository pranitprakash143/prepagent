import json
import hashlib
import logging
from functools import wraps
from typing import Any, Callable, Optional

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

redis_client: Optional[Redis] = None


async def init_redis():
    global redis_client
    redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
    try:
        redis_client = Redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connected at %s", redis_url)
    except Exception as e:
        logger.warning("Redis connection failed: %s — caching disabled", e)
        redis_client = None


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def _make_key(prefix: str, *args, **kwargs) -> str:
    raw = f"{prefix}:{json.dumps(args)}:{json.dumps(kwargs, sort_keys=True)}"
    return f"prepagent:{hashlib.md5(raw.encode()).hexdigest()}"


async def cache_get(key: str) -> Optional[Any]:
    if not redis_client:
        return None
    try:
        data = await redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.warning("Cache GET error: %s", e)
        return None


async def cache_set(key: str, value: Any, ttl: int = 300):
    if not redis_client:
        return
    try:
        await redis_client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning("Cache SET error: %s", e)


async def cache_delete(pattern: str):
    if not redis_client:
        return
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
    except Exception as e:
        logger.warning("Cache DELETE error: %s", e)


def cache_response(ttl_seconds: int = 300):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = _make_key(func.__name__, *args, **kwargs)
            cached = await cache_get(key)
            if cached is not None:
                return cached
            result = await func(*args, **kwargs)
            await cache_set(key, result, ttl_seconds)
            return result

        return wrapper

    return decorator


async def invalidate_user_cache(user_id: str):
    await cache_delete(f"prepagent:*{user_id}*")
