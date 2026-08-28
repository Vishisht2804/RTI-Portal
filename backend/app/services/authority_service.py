"""
Authority Finder service — F3.
Keyword + category matching against curated DB → ranked recommendations.
AI does NOT make the final selection — it assists ranking only.
"""
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.authority import Authority
from app.schemas.authority import AuthorityResult, AuthorityRecommendResponse

logger = logging.getLogger(__name__)


def _score_authority(
    authority: Authority,
    category: str,
    entities: List[str],
    original_query: str,
) -> int:
    """Score an authority for relevance (higher = better match)."""
    score = 0
    keywords = (authority.keywords or "").lower()
    name_lower = authority.name.lower()
    query_lower = original_query.lower()
    entities_lower = [e.lower() for e in entities]

    # Category exact match
    if authority.category == category:
        score += 40

    # Keyword hits from query
    for word in query_lower.split():
        if len(word) > 3 and word in keywords:
            score += 5

    # Entity hits in name or keywords
    for entity in entities_lower:
        if entity in name_lower:
            score += 20
        if entity in keywords:
            score += 10

    # Direct name match in query
    if name_lower in query_lower:
        score += 50

    return score


def _confidence_label(score: int, max_score: int) -> str:
    if score == 0:
        return "low"
    ratio = score / max(max_score, 1)
    if ratio >= 0.6:
        return "high"
    if ratio >= 0.3:
        return "medium"
    return "low"


def _build_reason(authority: Authority, category: str, entities: List[str], query: str) -> str:
    """Plain-language explanation of why this authority was recommended."""
    reasons = []
    if authority.category == category:
        reasons.append(f"this authority handles {category.replace('_', ' ')} matters")
    for e in entities:
        if e.lower() in authority.name.lower() or e.lower() in (authority.keywords or "").lower():
            reasons.append(f"it is responsible for {e}")
            break
    if authority.description:
        reasons.append(authority.description)
    if reasons:
        return "Recommended because " + "; ".join(reasons[:2]) + "."
    return f"Best match for your query in the {category.replace('_', ' ')} category."


def recommend_authority(
    db: Session,
    category: str,
    entities: List[str],
    jurisdiction: str,
    original_query: str,
) -> AuthorityRecommendResponse:
    """
    Returns primary recommendation + up to 2 alternatives.
    Filters by jurisdiction first, then scores by keyword/category match.
    """
    # Get all active authorities matching jurisdiction
    authorities = db.query(Authority).filter(
        Authority.active == True,
        Authority.jurisdiction == jurisdiction,
    ).all()

    if not authorities:
        # Fallback — search across all jurisdictions
        authorities = db.query(Authority).filter(Authority.active == True).all()

    # Score all candidates
    scored: List[Tuple[int, Authority]] = [
        (_score_authority(a, category, entities, original_query), a)
        for a in authorities
    ]
    scored.sort(key=lambda x: x[0], reverse=True)

    if not scored:
        raise ValueError("No authorities found in the database. Please run seed.")

    max_score = scored[0][0]

    def to_result(score: int, auth: Authority) -> AuthorityResult:
        return AuthorityResult(
            authority_id=auth.id,
            name=auth.name,
            jurisdiction=auth.jurisdiction,
            category=auth.category,
            description=auth.description,
            reason=_build_reason(auth, category, entities, original_query),
            confidence=_confidence_label(score, max_score),
        )

    primary = to_result(*scored[0])
    alternatives = [to_result(*s) for s in scored[1:3]]

    return AuthorityRecommendResponse(primary=primary, alternatives=alternatives)
