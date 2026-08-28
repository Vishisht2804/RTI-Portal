from pydantic import BaseModel
from typing import List, Optional


class AuthorityRecommendRequest(BaseModel):
    category: str
    entities: List[str]
    jurisdiction: str  # "central" | "state" — from rules engine (deterministic)
    original_query: str


class AuthorityResult(BaseModel):
    authority_id: int
    name: str
    jurisdiction: str
    category: str
    description: Optional[str]
    reason: str
    confidence: str  # "high" | "medium" | "low"


class AuthorityRecommendResponse(BaseModel):
    primary: AuthorityResult
    alternatives: List[AuthorityResult]  # top 2 alternatives
