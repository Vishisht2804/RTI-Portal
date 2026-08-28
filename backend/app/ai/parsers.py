"""
Parse and validate structured JSON outputs from the AI.
Reject or repair malformed outputs before they reach services.
"""
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {
    "health", "education", "finance", "infrastructure", "environment",
    "agriculture", "defence", "social_welfare", "law_order", "technology", "other",
}


def parse_intent_response(raw: str) -> Optional[dict]:
    """Parse and validate AI intent extraction output."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON from AI (intent): {raw[:200]}")
        return None

    # Validate required fields
    required = ["is_rti", "category", "jurisdiction_hint", "summary", "entities"]
    for field in required:
        if field not in data:
            logger.error(f"Missing field '{field}' in AI intent response")
            return None

    # Repair / normalise
    data["category"] = data["category"].lower().strip()
    if data["category"] not in VALID_CATEGORIES:
        data["category"] = "other"

    data["jurisdiction_hint"] = data.get("jurisdiction_hint", "central").lower().strip()
    if data["jurisdiction_hint"] not in ("central", "state"):
        data["jurisdiction_hint"] = "central"

    if not isinstance(data.get("entities"), list):
        data["entities"] = []

    if not isinstance(data.get("missing_information"), list):
        data["missing_information"] = []

    data.setdefault("time_period", None)
    data.setdefault("is_rti_suitable", bool(data.get("is_rti", True)))

    return data


def parse_draft_response(raw: str) -> Optional[dict]:
    """Parse and validate AI draft generation output."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON from AI (draft): {raw[:200]}")
        return None

    if "draft_text" not in data or not data["draft_text"]:
        logger.error("Missing 'draft_text' in AI draft response")
        return None

    data.setdefault("explanation", "Draft generated based on your query and selected authority.")
    data.setdefault("missing_information", [])

    # Enforce char limit
    if len(data["draft_text"]) > 3000:
        data["draft_text"] = data["draft_text"][:3000]
        logger.warning("AI draft text truncated to 3000 chars")

    return data
