from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.rti_service import reset_demo_state

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
def demo_reset(db: Session = Depends(get_db)):
    """Reset the local prototype to a deterministic Track B demo state."""
    return reset_demo_state(db)

