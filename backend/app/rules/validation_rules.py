"""
Deterministic validation rules for RTI draft quality check (F5).
"""
from typing import List, Tuple
from app.schemas.draft import QualityChecks

CHAR_LIMIT = 3000

# Phrases that indicate the request is asking for action rather than information
ACTION_PHRASES = [
    "please take action", "kindly do", "fix the", "repair the", "build the",
    "i request you to", "you are requested to take", "take necessary steps",
    "ensure that", "please ensure", "you must", "you should",
]

# Phrases that indicate vague / non-specific requests
VAGUE_PHRASES = [
    "all information", "everything about", "any and all", "general information",
    "whatever you have", "all records",
]

# RTI phrasing markers that indicate a proper information request
INFORMATION_REQUEST_MARKERS = [
    "please provide", "i request", "furnish", "supply", "disclose",
    "certified copies", "inspection of", "records relating", "details of",
    "information regarding", "status of", "list of", "amount spent",
    "expenditure", "budget", "sanctioned", "approved", "work order",
]

# Time period patterns (simple heuristic)
TIME_PERIOD_MARKERS = [
    "2020", "2021", "2022", "2023", "2024", "2025", "2026",
    "financial year", "fy ", "f.y.", "last year", "last 3", "last 5",
    "from", "between", "during",
]


def validate_draft(
    draft_text: str,
    authority_id: int,
    authority_name: str,
    jurisdiction: str,
) -> Tuple[QualityChecks, List[str]]:
    """
    Run all quality checks. Returns (QualityChecks, warnings).
    All checks are deterministic — no AI involved.
    """
    text_lower = draft_text.lower()
    warnings: List[str] = []

    # 1. Authority check
    authority_ok = bool(authority_id) and bool(authority_name.strip())

    # 2. Jurisdiction check
    jurisdiction_ok = jurisdiction in ("central", "state")

    # 3. Information request check
    info_request_ok = any(m in text_lower for m in INFORMATION_REQUEST_MARKERS)
    if not info_request_ok:
        warnings.append(
            "The draft does not clearly request specific records or information. "
            "Start with 'Please provide...' or 'I request certified copies of...'"
        )
    # Flag if it sounds like an action request
    action_hits = [p for p in ACTION_PHRASES if p in text_lower]
    if action_hits:
        info_request_ok = False
        warnings.append(
            f"The draft appears to request action ('{action_hits[0]}') rather than information. "
            "RTI only covers requests for existing records, not demands for government action."
        )

    # 4. Specificity check
    specificity_ok = True
    vague_hits = [p for p in VAGUE_PHRASES if p in text_lower]
    if vague_hits:
        specificity_ok = False
        warnings.append(
            f"The draft is too vague ('{vague_hits[0]}'). "
            "Specify the exact records, documents, or data points you need."
        )
    if len(draft_text.strip()) < 100:
        specificity_ok = False
        warnings.append(
            "The draft is very short. Add more specific details: "
            "which records, which time period, which project or scheme."
        )
    if not any(m in text_lower for m in TIME_PERIOD_MARKERS):
        warnings.append(
            "Consider adding a specific time period (e.g., 'for the financial year 2024–25'). "
            "This helps the authority locate the exact records you need."
        )

    # 5. Character limit check
    char_count = len(draft_text)
    char_limit_ok = char_count <= CHAR_LIMIT
    if not char_limit_ok:
        warnings.append(
            f"Draft exceeds the {CHAR_LIMIT:,}-character limit "
            f"({char_count:,} characters). Shorten it before filing."
        )

    checks = QualityChecks(
        authority=authority_ok,
        jurisdiction=jurisdiction_ok,
        information_request=info_request_ok,
        specificity=specificity_ok,
        character_limit=char_limit_ok,
    )
    return checks, warnings
