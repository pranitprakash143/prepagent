from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.flashcard import Flashcard


def apply_sm2(
    flashcard: Flashcard, quality: int, now: Optional[datetime] = None
) -> None:
    if now is None:
        now = datetime.now(timezone.utc)

    if quality < 0 or quality > 5:
        raise ValueError("Quality must be between 0 and 5")

    ef = flashcard.ease_factor
    interval = flashcard.interval_days
    reps = flashcard.repetitions

    if quality >= 3:
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = round(interval * ef)
        reps += 1
    else:
        reps = 0
        interval = 1

    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if ef < 1.3:
        ef = 1.3

    flashcard.repetitions = reps
    flashcard.interval_days = interval
    flashcard.ease_factor = round(ef, 2)
    flashcard.difficulty = 5 - quality
    flashcard.next_review = now + timedelta(days=interval)
