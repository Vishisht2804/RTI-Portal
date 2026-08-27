import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.models import entities  # noqa: F401


@pytest.fixture()
def client():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def ready_payload():
    return {
        "draft_id": 101,
        "authority_id": 12,
        "authority_name": "Ministry of Health and Family Welfare",
        "jurisdiction": "central",
        "category": "health",
        "request_text": "Please provide the sanctioned budget and expenditure incurred for government hospital infrastructure projects during 2025.",
        "original_query": "How much did Ministry of Health spend on government hospitals in 2025?",
        "validation_status": "ready",
        "quality_checks": {
            "authority": True,
            "jurisdiction": True,
            "information_request": True,
            "specificity": True,
            "character_limit": True,
        },
    }

