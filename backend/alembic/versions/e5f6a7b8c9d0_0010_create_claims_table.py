"""0010_create_claims_table

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-06-02 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "claims",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("flashcard_id", sa.String(length=36), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("chunk_id", sa.String(length=36), nullable=True),
        sa.Column("start_char", sa.Integer(), nullable=True),
        sa.Column("end_char", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["flashcard_id"], ["flashcards.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["chunk_id"], ["chunks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_claims_flashcard_id", "claims", ["flashcard_id"])
    op.create_index("ix_claims_chunk_id", "claims", ["chunk_id"])

    op.add_column(
        "flashcards",
        sa.Column("verified_claims", postgresql.JSONB, nullable=True),
    )
    op.add_column(
        "flashcards",
        sa.Column(
            "hallucination_score",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )


def downgrade() -> None:
    op.drop_column("flashcards", "hallucination_score")
    op.drop_column("flashcards", "verified_claims")
    op.drop_index("ix_claims_chunk_id", table_name="claims")
    op.drop_index("ix_claims_flashcard_id", table_name="claims")
    op.drop_table("claims")
