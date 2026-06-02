import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = str(uuid.uuid4())[:8]
        request.state.trace_id = trace_id
        start = time.time()
        response: Response = await call_next(request)
        duration_ms = (time.time() - start) * 1000
        logger.info(
            json.dumps(
                {
                    "trace_id": trace_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                }
            )
        )
        response.headers["X-Trace-ID"] = trace_id
        return response
