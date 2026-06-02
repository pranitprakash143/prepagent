"""0006_add_study_streak_last_date

Revision ID: a1b2c3d4e5f6
Revises: 9a2b8c4d1e5f
Create Date: 2026-06-02 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9a2b8c4d1e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("study_streak_last_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "study_streak_last_date")
