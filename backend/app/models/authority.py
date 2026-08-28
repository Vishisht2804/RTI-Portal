from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Authority(Base):
    __tablename__ = "authorities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    jurisdiction = Column(String, nullable=False)  # "central" | "state"
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    keywords = Column(String, nullable=True)  # space-separated keyword string
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
