from pydantic import BaseModel, field_validator
from typing import List, Optional


class IntentRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Query text cannot be empty")
        if len(v.strip()) < 10:
            raise ValueError("Query text is too short — please describe what information you need")
        return v.strip()


class IntentResponse(BaseModel):
    is_rti: bool
    category: str  # health|education|finance|infrastructure|environment|agriculture|defence|social_welfare|law_order|technology|other
    jurisdiction_hint: str  # "central" | "state" — hint only; final decision made by rules engine
    summary: str
    entities: List[str]
    time_period: Optional[str]
    missing_information: List[str]
    original_query: str
    # Suitability / jurisdiction result (from rules engine, added post-AI)
    jurisdiction: Optional[str] = None          # final deterministic: "central" | "state"
    is_rti_suitable: Optional[bool] = None
    suitability_explanation: Optional[str] = None
    reformulation_suggestion: Optional[str] = None
    used_fallback: bool = False
