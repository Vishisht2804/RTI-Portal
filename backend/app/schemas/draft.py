from pydantic import BaseModel
from typing import List, Optional, Dict


class DraftGenerateRequest(BaseModel):
    original_query: str
    category: str
    entities: List[str]
    time_period: Optional[str]
    authority_id: int
    authority_name: str
    jurisdiction: str


class DraftGenerateResponse(BaseModel):
    draft_id: int
    draft_text: str
    explanation: str
    missing_information: List[str]
    char_count: int
    used_fallback: bool = False


class DraftValidateRequest(BaseModel):
    draft_id: int
    draft_text: str
    authority_id: int
    authority_name: str
    jurisdiction: str
    category: str
    original_query: str


class QualityChecks(BaseModel):
    authority: bool
    jurisdiction: bool
    information_request: bool
    specificity: bool
    character_limit: bool


class DraftValidateResponse(BaseModel):
    valid: bool
    validation_status: str  # "ready" | "needs_review"
    checks: QualityChecks
    warnings: List[str]
    char_count: int
    char_limit: int
