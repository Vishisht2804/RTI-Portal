from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    original_query = Column(String, nullable=False)
    ai_summary = Column(String, nullable=True)
    draft_text = Column(String, nullable=False)
    authority_id = Column(Integer, ForeignKey("authorities.id"), nullable=True)
    validation_result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
