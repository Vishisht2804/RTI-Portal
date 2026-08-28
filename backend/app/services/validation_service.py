"""
Validation service — F5 quality check.
Fully deterministic — no AI involved.
Updates the Draft row with validation_result.
"""
from sqlalchemy.orm import Session
from app.models.draft import Draft
from app.rules.validation_rules import validate_draft, CHAR_LIMIT
from app.schemas.draft import DraftValidateRequest, DraftValidateResponse
from fastapi import HTTPException


def validate_draft_request(
    db: Session,
    req: DraftValidateRequest,
) -> DraftValidateResponse:
    """Run quality checks and update draft record."""
    # Load draft to confirm it exists
    draft = db.query(Draft).filter(Draft.id == req.draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail=f"Draft {req.draft_id} not found")

    # Optionally update draft text if user edited it
    if req.draft_text != draft.draft_text:
        draft.draft_text = req.draft_text

    # Run deterministic checks
    checks, warnings = validate_draft(
        draft_text=req.draft_text,
        authority_id=req.authority_id,
        authority_name=req.authority_name,
        jurisdiction=req.jurisdiction,
    )

    all_passed = all([
        checks.authority,
        checks.jurisdiction,
        checks.information_request,
        checks.specificity,
        checks.character_limit,
    ])
    validation_status = "ready" if all_passed else "needs_review"

    # Persist validation result
    draft.validation_result = {
        "status": validation_status,
        "checks": checks.model_dump(),
        "warnings": warnings,
    }
    db.commit()

    return DraftValidateResponse(
        valid=all_passed,
        validation_status=validation_status,
        checks=checks,
        warnings=warnings,
        char_count=len(req.draft_text),
        char_limit=CHAR_LIMIT,
    )
