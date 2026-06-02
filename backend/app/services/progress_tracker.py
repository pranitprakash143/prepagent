import asyncio
import time
from typing import Dict, List, Optional

from pydantic import BaseModel


class ProgressEvent(BaseModel):
    stage: str
    progress: int
    message: str


class TaskTracker:
    _queues: Dict[str, asyncio.Queue] = {}
    _history: Dict[str, List[ProgressEvent]] = {}
    _created_at: Dict[str, float] = {}

    def create_task(self, task_id: str) -> None:
        self._queues[task_id] = asyncio.Queue()
        self._history[task_id] = []
        self._created_at[task_id] = time.time()

    async def update(
        self, task_id: str, stage: str, progress: int, message: str
    ) -> None:
        event = ProgressEvent(stage=stage, progress=progress, message=message)
        if task_id in self._history:
            self._history[task_id].append(event)
        if task_id in self._queues:
            await self._queues[task_id].put(event)

    def get_history(self, task_id: str) -> List[ProgressEvent]:
        return self._history.get(task_id, [])

    async def subscribe(self, task_id: str) -> asyncio.Queue:
        if task_id not in self._queues:
            self._queues[task_id] = asyncio.Queue()
        return self._queues[task_id]

    def has_task(self, task_id: str) -> bool:
        return task_id in self._history

    def cleanup(self, task_id: str, max_age: float = 300.0) -> None:
        now = time.time()
        stale = [tid for tid, ts in self._created_at.items() if now - ts > max_age]
        for tid in stale:
            self._queues.pop(tid, None)
            self._history.pop(tid, None)
            self._created_at.pop(tid, None)


tracker = TaskTracker()
