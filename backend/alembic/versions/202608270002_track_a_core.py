"""track a core tables (authorities, drafts)

Revision ID: 202608270002
Revises: 202608270001
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa

revision = "202608270002"
down_revision = "202608270001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "authorities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("jurisdiction", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("keywords", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_authorities_id", "authorities", ["id"])
    op.create_unique_constraint("uq_authorities_name", "authorities", ["name"])

    op.create_table(
        "drafts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("original_query", sa.String(), nullable=False),
        sa.Column("ai_summary", sa.String(), nullable=True),
        sa.Column("draft_text", sa.String(), nullable=False),
        sa.Column("authority_id", sa.Integer(), sa.ForeignKey("authorities.id"), nullable=True),
        sa.Column("validation_result", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_drafts_id", "drafts", ["id"])


def downgrade() -> None:
    op.drop_table("drafts")
    op.drop_table("authorities")
