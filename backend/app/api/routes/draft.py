from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.draft import (
    DraftGenerateRequest,
    DraftGenerateResponse,
    DraftValidateRequest,
    DraftValidateResponse,
)
from app.services.drafting_service import generate_draft
from app.services.validation_service import validate_draft_request

router = APIRouter()


@router.post("/generate", response_model=DraftGenerateResponse)
def generate(req: DraftGenerateRequest, db: Session = Depends(get_db)):
    """
    F4: Generate an AI-drafted RTI application from intent + authority.
    Returns draft text, explanation, and DB-assigned draft_id.
    """
    return generate_draft(
        db=db,
        original_query=req.original_query,
        category=req.category,
        entities=req.entities,
        time_period=req.time_period,
        authority_id=req.authority_id,
        authority_name=req.authority_name,
        jurisdiction=req.jurisdiction,
    )


@router.post("/validate", response_model=DraftValidateResponse)
def validate(req: DraftValidateRequest, db: Session = Depends(get_db)):
    """
    F5: Run deterministic quality checks on the draft.
    Updates the draft record and returns quality check results.
    """
    return validate_draft_request(db=db, req=req)
