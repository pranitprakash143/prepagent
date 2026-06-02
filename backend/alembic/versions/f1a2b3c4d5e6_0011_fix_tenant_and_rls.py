"""0011_fix_tenant_and_rls

Fix remaining multi-tenancy issues:
- Make Document.tenant_id non-nullable
- Add RLS policy for claims table
- Create helper function for setting app context

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-06-02 18:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Make Document.tenant_id non-nullable
    op.alter_column("documents", "tenant_id", nullable=False)

    # Fix RLS policies to use a helper function
    op.execute("""
        CREATE OR REPLACE FUNCTION app.current_user_id()
        RETURNS TEXT
        LANGUAGE SQL
        STABLE
        AS $$
            SELECT current_setting('app.current_user_id', TRUE)::text;
        $$;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION app.current_tenant_id()
        RETURNS TEXT
        LANGUAGE SQL
        STABLE
        AS $$
            SELECT current_setting('app.current_tenant_id', TRUE)::text;
        $$;
    """)

    # Add RLS to claims table
    op.execute("ALTER TABLE claims ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_claims ON claims
        FOR ALL
        USING (user_id = app.current_user_id())
    """)

    # Recreate existing policies using the function for safety
    for table in [
        "users",
        "subjects",
        "documents",
        "chunks",
        "flashcards",
        "pyqs",
        "notes",
        "payments",
    ]:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            FOR ALL
            USING (user_id = app.current_user_id())
        """)


def downgrade():
    for table in [
        "users",
        "subjects",
        "documents",
        "chunks",
        "flashcards",
        "pyqs",
        "notes",
        "payments",
        "claims",
    ]:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")

    op.execute("DROP FUNCTION IF EXISTS app.current_user_id()")
    op.execute("DROP FUNCTION IF EXISTS app.current_tenant_id()")

    op.alter_column("documents", "tenant_id", nullable=True)
