from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    rtis: Mapped[list["RTI"]] = relationship(back_populates="user")


class RTI(Base):
    __tablename__ = "rtis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    draft_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    authority_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    authority_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_query: Mapped[str] = mapped_column(Text, nullable=False)
    final_request: Mapped[str] = mapped_column(Text, nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    registration_number: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)
    otp_verified: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User | None] = relationship(back_populates="rtis")
    status_events: Mapped[list["StatusEvent"]] = relationship(
        back_populates="rti", cascade="all, delete-orphan", order_by="StatusEvent.timestamp"
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="rti", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="rti", cascade="all, delete-orphan")


class StatusEvent(Base):
    __tablename__ = "status_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rti_id: Mapped[int] = mapped_column(ForeignKey("rtis.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    rti: Mapped[RTI] = relationship(back_populates="status_events")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rti_id: Mapped[int] = mapped_column(ForeignKey("rtis.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    rti: Mapped[RTI] = relationship(back_populates="documents")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rti_id: Mapped[int] = mapped_column(ForeignKey("rtis.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    rti: Mapped[RTI] = relationship(back_populates="payments")

