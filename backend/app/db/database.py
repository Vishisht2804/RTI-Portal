from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import every model module so all tables register on Base.metadata.
    from app.models import entities  # noqa: F401  (Track B: users, rtis, status_events, documents, payments)
    from app.models import authority, draft  # noqa: F401  (Track A: authorities, drafts)

    Base.metadata.create_all(bind=engine)

    # Track A: seed the curated authority list (idempotent).
    from app.db.seed import seed_authorities

    seed_authorities()
