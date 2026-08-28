"""
Drafting service — F4.
intent + authority → AI generates RTI draft → saved to DB.
"""
import logging
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from app.ai.provider import get_ai_provider
from app.ai.parsers import parse_draft_response
from app.ai.fallbacks import get_fallback_draft
from app.models.draft import Draft
from app.schemas.draft import DraftGenerateResponse

logger = logging.getLogger(__name__)

DRAFT_PROMPT_PATH = Path(__file__).parent.parent / "ai" / "prompts" / "draft_v1.txt"


def generate_draft(
    db: Session,
    original_query: str,
    category: str,
    entities: List[str],
    time_period: Optional[str],
    authority_id: int,
    authority_name: str,
    jurisdiction: str,
) -> DraftGenerateResponse:
    """Generate RTI draft via AI, persist to DB, return response."""
    system_prompt = DRAFT_PROMPT_PATH.read_text()
    user_prompt = f"""
Citizen's original query: {original_query}
Target authority: {authority_name}
Jurisdiction: {jurisdiction.title()} Government
Category: {category}
Key entities/topics: {', '.join(entities) if entities else 'not specified'}
Time period: {time_period or 'not specified'}

Generate a formal RTI application for this query.
"""
    draft_data = None
    used_fallback = False

    try:
        ai = get_ai_provider()
        response = ai.complete(user_prompt=user_prompt, system_prompt=system_prompt)
        draft_data = parse_draft_response(response.content)
    except Exception as e:
        logger.error(f"AI draft generation failed: {e}")

    if draft_data is None:
        logger.warning("Using fallback draft")
        draft_data = get_fallback_draft(authority_name, original_query)
        used_fallback = True

    draft_text = draft_data["draft_text"]

    # Persist to DB
    draft = Draft(
        original_query=original_query,
        ai_summary=draft_data.get("explanation", ""),
        draft_text=draft_text,
        authority_id=authority_id,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return DraftGenerateResponse(
        draft_id=draft.id,
        draft_text=draft_text,
        explanation=draft_data.get("explanation", ""),
        missing_information=draft_data.get("missing_information", []),
        char_count=len(draft_text),
        used_fallback=used_fallback,
    )
