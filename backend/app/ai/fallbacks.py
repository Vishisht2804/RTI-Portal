"""
Pre-written deterministic fallback responses for all 3 demo scenarios.
Triggered when AI is unavailable, times out, or returns invalid JSON.
These are always kept up to date and rehearsed — demo never crashes.
"""

# Scenario 1: Ministry of Health expenditure query
FALLBACK_INTENT_HEALTH = {
    "is_rti": True,
    "category": "health",
    "jurisdiction_hint": "central",
    "summary": "Seeking information about the Ministry of Health's budget allocation and expenditure on government hospitals in 2025.",
    "entities": ["Ministry of Health and Family Welfare", "government hospitals"],
    "time_period": "2025",
    "missing_information": [],
    "is_rti_suitable": True,
}

FALLBACK_DRAFT_HEALTH = {
    "draft_text": (
        "To,\nThe Central Public Information Officer,\n"
        "Ministry of Health and Family Welfare,\nNew Delhi.\n\n"
        "Subject: RTI Application under the Right to Information Act, 2005\n\n"
        "I, the undersigned, hereby request the following information under Section 6 of the "
        "Right to Information Act, 2005:\n\n"
        "1. The total budget sanctioned and actual expenditure incurred by the Ministry of "
        "Health and Family Welfare for government hospitals (Central Government hospitals) "
        "for the financial year 2024-25 and 2025-26 (till date).\n\n"
        "2. The category-wise breakup of such expenditure including: (a) infrastructure and "
        "construction, (b) medical equipment and supplies, (c) salaries and personnel, "
        "(d) medicines and consumables.\n\n"
        "3. The list of Central Government hospitals covered under this expenditure along "
        "with their location and patient capacity.\n\n"
        "4. Any audit or inspection report conducted in respect of the above expenditure "
        "for the said period.\n\n"
        "The information may be provided in the form of certified copies of relevant "
        "documents/records. Requisite fee of Rs. 10/- is enclosed herewith.\n\n"
        "I declare that I am a citizen of India and this request is not motivated by "
        "commercial or personal gain.\n\nYours sincerely,\n[Applicant Name]"
    ),
    "explanation": (
        "This draft asks for budget and expenditure records under Section 6 of the RTI Act. "
        "It breaks the question into four specific sub-questions — budget allocation, category-wise breakup, "
        "list of hospitals, and audit reports — making it easier for the CPIO to locate and "
        "provide the exact records you need. Asking for 'certified copies' is the correct RTI phrasing."
    ),
    "missing_information": [],
}

# Scenario 2: Karnataka state hospital — wrong jurisdiction
FALLBACK_INTENT_STATE = {
    "is_rti": True,
    "category": "health",
    "jurisdiction_hint": "state",
    "summary": "Seeking information about Karnataka state government hospital expenditure.",
    "entities": ["Karnataka", "state hospitals"],
    "time_period": None,
    "missing_information": [],
    "is_rti_suitable": True,
}

# Scenario 3: Bad request — grievance / vague
FALLBACK_INTENT_GRIEVANCE = {
    "is_rti": False,
    "category": "infrastructure",
    "jurisdiction_hint": "central",
    "summary": "Query appears to be a grievance about government inaction rather than an information request.",
    "entities": ["hospital"],
    "time_period": None,
    "missing_information": ["specific location", "relevant authority", "time period"],
    "is_rti_suitable": False,
}


def get_fallback_intent(query: str) -> dict:
    """Select the appropriate fallback based on simple keyword matching."""
    q = query.lower()
    if "karnataka" in q or "state" in q:
        return {**FALLBACK_INTENT_STATE, "original_query": query}
    if any(kw in q for kw in ["why hasn't", "why has not", "build", "fix", "repair"]):
        return {**FALLBACK_INTENT_GRIEVANCE, "original_query": query}
    return {**FALLBACK_INTENT_HEALTH, "original_query": query}


def get_fallback_draft(authority_name: str, original_query: str) -> dict:
    """Return the health fallback draft, substituting the actual authority name."""
    draft = dict(FALLBACK_DRAFT_HEALTH)
    draft["draft_text"] = draft["draft_text"].replace(
        "Ministry of Health and Family Welfare", authority_name
    )
    return draft
