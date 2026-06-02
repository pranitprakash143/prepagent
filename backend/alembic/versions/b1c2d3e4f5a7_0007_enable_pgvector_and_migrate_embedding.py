"""0007_enable_pgvector_and_migrate_embedding

Revision ID: b1c2d3e4f5a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-02 14:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "b1c2d3e4f5a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.drop_column("chunks", "embedding")
    op.add_column("chunks", sa.Column("embedding", Vector(384), nullable=True))


def downgrade() -> None:
    op.drop_column("chunks", "embedding")
    op.add_column("chunks", sa.Column("embedding", sa.Text(), nullable=True))
