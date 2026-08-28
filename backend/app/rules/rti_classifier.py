"""
RTI vs Grievance classifier — deterministic.
AI provides only a category hint; this module makes the final RTI-suitability call.
"""
from typing import Tuple

# Keywords that strongly indicate an information request (RTI-appropriate)
RTI_INDICATORS = [
    "how much", "how many", "what is the", "provide details", "copies of",
    "records of", "information about", "details of", "status of", "list of",
    "spent", "expenditure", "budget", "allocated", "sanctioned", "approved",
    "date of", "number of", "total amount", "files relating", "documents",
    "progress of", "completion", "tender", "contract", "work order",
    "certified copies", "inspection", "obtain copies", "provide information",
    "disclose", "furnish", "supply", "details regarding",
]

# Keywords that indicate a grievance or action request (RTI-not-appropriate)
GRIEVANCE_INDICATORS = [
    "why hasn't", "why has not", "please fix", "please repair", "please build",
    "why don't you", "demand", "complain", "action against", "punish",
    "arrest", "fire", "remove", "protest", "unfair", "injustice",
    "please provide service", "they should", "government should",
    "they are not doing", "not being done", "take action", "file case",
    "shut down", "penalise", "lodge complaint",
]

# Keywords indicating the query is too vague/ambiguous
VAGUE_INDICATORS = [
    "anything", "everything", "all information", "tell me about",
    "give me all", "show me everything",
]


def classify_rti_suitability(
    query: str,
    ai_category: str,
    ai_is_rti_suitable: bool,
) -> Tuple[bool, str, str | None]:
    """
    Returns (is_suitable, explanation, reformulation_suggestion).
    Final authority — overrides AI suggestion when rules are clear.
    """
    q_lower = query.lower()

    # Check for grievance indicators (high confidence → not RTI)
    grievance_hits = [kw for kw in GRIEVANCE_INDICATORS if kw in q_lower]
    if grievance_hits:
        suggestion = _reformulate_grievance_as_rti(query)
        return (
            False,
            (
                "Your query reads as a complaint or a demand for government action, "
                "which is handled through a Grievance portal — not an RTI request. "
                "RTI is only for asking for existing government records and information. "
                f"Matched: '{grievance_hits[0]}'."
            ),
            suggestion,
        )

    # Check for strong RTI indicators
    rti_hits = [kw for kw in RTI_INDICATORS if kw in q_lower]
    if rti_hits or ai_is_rti_suitable:
        return (
            True,
            (
                "Your query is seeking factual government information — "
                "this is exactly what the RTI Act 2005 is designed for. "
                "You can request copies of records, budgets, decisions, "
                "inspection reports, or any held document."
            ),
            None,
        )

    # Vague query
    vague_hits = [kw for kw in VAGUE_INDICATORS if kw in q_lower]
    if vague_hits:
        return (
            False,
            (
                "Your query is too broad or vague for an RTI request. "
                "RTI works best when you ask for specific records, documents, "
                "or data points — not open-ended information."
            ),
            "Try specifying: which department, what type of record, and what time period.",
        )

    # Default — trust AI classification if no strong signal either way
    if ai_is_rti_suitable:
        return (
            True,
            (
                "Your query appears to be seeking factual government information, "
                "which is RTI-appropriate. Please ensure you are asking for records "
                "or information the public authority is likely to hold."
            ),
            None,
        )

    return (
        False,
        (
            "It is not clear whether this query is asking for government records "
            "or a government action. RTI only covers requests for existing documents "
            "and information — not opinions, actions, or services."
        ),
        "Rephrase as: 'Please provide the records/documents/data related to ...'",
    )


def _reformulate_grievance_as_rti(original: str) -> str:
    """Suggest an RTI-appropriate reformulation for a grievance query."""
    return (
        f"Instead of demanding action, try asking: "
        f"'Please provide copies of the sanction order, work order, "
        f"progress report, and current status of [the project/service you are concerned about], "
        f"along with the reasons for any delay and the names of responsible officials.'"
    )
