"""
Intent service — F1 + F2 pipeline.
Query → AI intent extraction → deterministic RTI suitability + jurisdiction.
"""
import logging
from pathlib import Path
from app.ai.provider import get_ai_provider
from app.ai.parsers import parse_intent_response
from app.ai.fallbacks import get_fallback_intent
from app.rules.rti_classifier import classify_rti_suitability
from app.rules.jurisdiction import determine_jurisdiction
from app.schemas.intent import IntentResponse

logger = logging.getLogger(__name__)

INTENT_PROMPT_PATH = Path(__file__).parent.parent / "ai" / "prompts" / "intent_v1.txt"


def analyze_intent(text: str) -> IntentResponse:
    """
    Full F1+F2 pipeline.
    Returns IntentResponse with AI fields + deterministic suitability + jurisdiction.
    """
    system_prompt = INTENT_PROMPT_PATH.read_text()
    ai_data = None
    used_fallback = False

    # 1. Try AI extraction
    try:
        ai = get_ai_provider()
        response = ai.complete(
            user_prompt=f"Citizen's query: {text}",
            system_prompt=system_prompt,
        )
        ai_data = parse_intent_response(response.content)
    except Exception as e:
        logger.error(f"AI intent extraction failed: {e}")

    # 2. Fallback if AI failed
    if ai_data is None:
        logger.warning("Using fallback intent response")
        ai_data = get_fallback_intent(text)
        used_fallback = True

    ai_data["original_query"] = text

    # 3. Deterministic RTI suitability check (overrides AI when clear)
    is_suitable, suitability_explanation, reformulation = classify_rti_suitability(
        query=text,
        ai_category=ai_data["category"],
        ai_is_rti_suitable=ai_data.get("is_rti_suitable", ai_data.get("is_rti", True)),
    )

    # 4. Deterministic jurisdiction decision (overrides AI hint)
    jurisdiction, jurisdiction_explanation = determine_jurisdiction(
        query=text,
        category=ai_data["category"],
        ai_jurisdiction_hint=ai_data.get("jurisdiction_hint", "central"),
        entities=ai_data.get("entities", []),
    )

    return IntentResponse(
        is_rti=ai_data.get("is_rti", True),
        category=ai_data["category"],
        jurisdiction_hint=ai_data.get("jurisdiction_hint", "central"),
        summary=ai_data.get("summary", ""),
        entities=ai_data.get("entities", []),
        time_period=ai_data.get("time_period"),
        missing_information=ai_data.get("missing_information", []),
        original_query=text,
        jurisdiction=jurisdiction,
        is_rti_suitable=is_suitable,
        suitability_explanation=f"{suitability_explanation} {jurisdiction_explanation}".strip(),
        reformulation_suggestion=reformulation,
        used_fallback=used_fallback,
    )
