"""0008_create_hnsw_index

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a7
Create Date: 2026-06-02 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b1c2d3e4f5a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw "
        "ON chunks USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 200)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_chunks_embedding_hnsw")
