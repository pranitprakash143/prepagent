"""0005_add_user_id_multi_tenancy

Revision ID: 9a2b8c4d1e5f
Revises: 5ef76075b9b2
Create Date: 2026-06-02 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "9a2b8c4d1e5f"
down_revision = "5ef76075b9b2"
branch_labels = None
depends_on = None


def upgrade():
    # Chunks: add user_id
    op.add_column("chunks", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_chunks_user_id", "chunks", "users", ["user_id"], ["id"])
    op.create_index("ix_chunks_user_id", "chunks", ["user_id"])

    # Notes: add user_id
    op.add_column("notes", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_notes_user_id", "notes", "users", ["user_id"], ["id"])
    op.create_index("ix_notes_user_id", "notes", ["user_id"])

    # Subjects: add user_id
    op.add_column("subjects", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_subjects_user_id", "subjects", "users", ["user_id"], ["id"]
    )
    op.create_index("ix_subjects_user_id", "subjects", ["user_id"])

    # PYQs: add user_id
    op.add_column("pyqs", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_pyqs_user_id", "pyqs", "users", ["user_id"], ["id"])
    op.create_index("ix_pyqs_user_id", "pyqs", ["user_id"])

    # Documents: rename owner_id to user_id
    op.alter_column("documents", "owner_id", new_column_name="user_id")
    op.alter_column(
        "documents", "user_id", existing_type=sa.String(length=36), nullable=False
    )
    op.create_foreign_key(
        "fk_documents_user_id", "documents", "users", ["user_id"], ["id"]
    )

    # Users: make tenant_id non-nullable
    op.alter_column(
        "users", "tenant_id", existing_type=sa.String(length=36), nullable=False
    )


def downgrade():
    # Users: revert tenant_id to nullable
    op.alter_column(
        "users", "tenant_id", existing_type=sa.String(length=36), nullable=True
    )

    # Documents: rename user_id back to owner_id and make nullable
    op.drop_constraint("fk_documents_user_id", "documents", type_="foreignkey")
    op.alter_column(
        "documents", "user_id", existing_type=sa.String(length=36), nullable=True
    )
    op.alter_column("documents", "user_id", new_column_name="owner_id")

    # PYQs: drop user_id
    op.drop_constraint("fk_pyqs_user_id", "pyqs", type_="foreignkey")
    op.drop_index("ix_pyqs_user_id", table_name="pyqs")
    op.drop_column("pyqs", "user_id")

    # Subjects: drop user_id
    op.drop_constraint("fk_subjects_user_id", "subjects", type_="foreignkey")
    op.drop_index("ix_subjects_user_id", table_name="subjects")
    op.drop_column("subjects", "user_id")

    # Notes: drop user_id
    op.drop_constraint("fk_notes_user_id", "notes", type_="foreignkey")
    op.drop_index("ix_notes_user_id", table_name="notes")
    op.drop_column("notes", "user_id")

    # Chunks: drop user_id
    op.drop_constraint("fk_chunks_user_id", "chunks", type_="foreignkey")
    op.drop_index("ix_chunks_user_id", table_name="chunks")
    op.drop_column("chunks", "user_id")
