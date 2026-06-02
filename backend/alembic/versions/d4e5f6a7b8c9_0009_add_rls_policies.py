"""0009_add_rls_policies

Enable Row-Level Security on all tables and create tenant-isolation policies.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-02 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None

TABLES = [
    "users",
    "subjects",
    "documents",
    "chunks",
    "flashcards",
    "pyqs",
    "notes",
    "payments",
]


def upgrade():
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            FOR ALL
            USING (user_id = current_setting('app.current_user_id')::text)
            """
        )


def downgrade():
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
