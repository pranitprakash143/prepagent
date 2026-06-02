"""merge rls and claims heads

Revision ID: 4beb84b62235
Revises: d4e5f6a7b8c9, f1a2b3c4d5e6
Create Date: 2026-06-02 13:49:02.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "4beb84b62235"
down_revision = ("d4e5f6a7b8c9", "f1a2b3c4d5e6")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
