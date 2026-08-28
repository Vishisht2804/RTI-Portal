"""Unified demo reset.

Clears Track B lifecycle tables + Track A drafts, re-seeds the curated authority
list, and seeds one known Ready-to-File RTI so the dashboard is never empty.
Exposed both as POST /api/v1/demo (Track A frontend) and POST /api/v1/demo/reset
(Track B frontend / tests).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.seed import seed_authorities
from app.models.authority import Authority
from app.models.draft import Draft
from app.services.rti_service import reset_demo_state

router = APIRouter(prefix="/demo", tags=["demo"])


def _reset(db: Session) -> dict:
    db.query(Draft).delete()
    db.commit()

    if db.query(Authority).count() == 0:
        seed_authorities()

    track_b = reset_demo_state(db)  # clears rtis/users/etc + seeds one known RTI

    return {
        "status": "ok",
        "message": "Demo state reset (Track A drafts cleared, authorities re-seeded, Track B RTI seeded).",
        "authorities_count": db.query(Authority).count(),
        "drafts_cleared": True,
        **track_b,
    }


@router.post("")
def reset_demo(db: Session = Depends(get_db)):
    return _reset(db)


@router.post("/reset")
def reset_demo_alias(db: Session = Depends(get_db)):
    return _reset(db)
