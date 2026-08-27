"""track b core tables

Revision ID: 202608270001
Revises:
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa

revision = "202608270001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "rtis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("draft_id", sa.Integer(), nullable=False),
        sa.Column("authority_id", sa.Integer(), nullable=False),
        sa.Column("authority_name", sa.String(length=255), nullable=False),
        sa.Column("original_query", sa.Text(), nullable=False),
        sa.Column("final_request", sa.Text(), nullable=False),
        sa.Column("jurisdiction", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("registration_number", sa.String(length=40), nullable=True),
        sa.Column("otp_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_rtis_user_id", "rtis", ["user_id"])
    op.create_index("ix_rtis_draft_id", "rtis", ["draft_id"])
    op.create_index("ix_rtis_authority_id", "rtis", ["authority_id"])
    op.create_index("ix_rtis_status", "rtis", ["status"])
    op.create_unique_constraint("uq_rtis_registration_number", "rtis", ["registration_number"])

    op.create_table(
        "status_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rti_id", sa.Integer(), sa.ForeignKey("rtis.id"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_status_events_rti_id", "status_events", ["rti_id"])
    op.create_index("ix_status_events_timestamp", "status_events", ["timestamp"])

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rti_id", sa.Integer(), sa.ForeignKey("rtis.id"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_documents_rti_id", "documents", ["rti_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rti_id", sa.Integer(), sa.ForeignKey("rtis.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_payments_rti_id", "payments", ["rti_id"])
    op.create_index("ix_payments_status", "payments", ["status"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("documents")
    op.drop_table("status_events")
    op.drop_table("rtis")
    op.drop_table("users")

