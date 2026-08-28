"""
Shared Ready-to-File contract.
P1 creates this via drafts/validate; P2 consumes it via POST /api/v1/rtis.
Frozen at Day 1 — any schema change requires joint conversation.
"""
from pydantic import BaseModel
from typing import Optional


class QualityChecks(BaseModel):
    authority: bool
    jurisdiction: bool
    information_request: bool
    specificity: bool
    character_limit: bool


class ReadyToFileObject(BaseModel):
    draft_id: int
    authority_id: int
    authority_name: str
    jurisdiction: str           # "central" | "state"  — deterministic final
    category: str
    request_text: str           # ≤ 3000 chars, enforced before this object is created
    original_query: str
    validation_status: str      # "ready" | "needs_review"
    quality_checks: QualityChecks
    applicant: Optional[dict] = None  # null at handoff; P2 fills in


class RTICreateResponse(BaseModel):
    """Response from P2's POST /api/v1/rtis"""
    rti_id: int
    status: str  # "READY_TO_FILE"
