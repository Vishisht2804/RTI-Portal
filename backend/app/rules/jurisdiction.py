"""
Central vs State jurisdiction rules — deterministic.
`jurisdiction.py` produces the FINAL Central/State decision.
AI may provide only a `jurisdiction_hint` that this module may override.
"""
from typing import Tuple

# Authorities / topics that are definitively Central Government matters
CENTRAL_KEYWORDS = [
    # Ministries / central bodies
    "ministry of health", "ministry of education", "ministry of finance",
    "ministry of railways", "ministry of defence", "ministry of home affairs",
    "ministry of external affairs", "indian railways", "railway", "railways",
    "central government", "union government", "national highways", "nhai",
    "sebi", "rbi", "reserve bank", "income tax", "cbi", "enforcement directorate",
    "drdo", "isro", "aiims", "iit", "nit", "ugc", "epfo", "fci",
    "ministry of agriculture", "ministry of power", "ministry of petroleum",
    "ministry of environment", "central pollution", "cpcb",
    "ministry of commerce", "ministry of it", "meity", "ministry of urban",
    "ministry of women", "ministry of social justice", "ministry of labour",
    "ministry of civil aviation", "ministry of road transport",
    # Central schemes
    "pm-kisan", "pmay", "ayushman bharat national", "national health mission",
    "nhm", "smart cities mission",
    # Central topics
    "export import", "foreign policy", "passport", "visa", "currency",
    "monetary policy", "stock exchange", "ipo", "mutual fund",
    "defence procurement", "nuclear", "space",
]

# State government indicators
STATE_KEYWORDS = [
    # State names
    "karnataka", "maharashtra", "tamil nadu", "andhra pradesh", "telangana",
    "kerala", "gujarat", "rajasthan", "uttar pradesh", "bihar", "west bengal",
    "madhya pradesh", "punjab", "haryana", "himachal pradesh", "uttarakhand",
    "jharkhand", "chhattisgarh", "odisha", "assam", "gujarat",
    "goa", "manipur", "meghalaya", "mizoram", "nagaland", "sikkim",
    "tripura", "arunachal pradesh",
    # State bodies
    "bbmp", "state government", "state health", "state education",
    "state police", "district hospital", "panchayat", "gram panchayat",
    "municipal corporation", "nagar panchayat", "collector office",
    "tahsildar", "district collector", "state electricity board",
    "state road corporation", "state transport", "ration card", "e-ration",
    # State schemes
    "arogyasri", "kalaignar", "yeshasvini",
]

# Ambiguous — need AI hint or user clarification
AMBIGUOUS_CATEGORIES = {"other"}


def determine_jurisdiction(
    query: str,
    category: str,
    ai_jurisdiction_hint: str,
    entities: list[str],
) -> Tuple[str, str]:
    """
    Returns (jurisdiction, explanation).
    `jurisdiction` is "central" or "state" — final, deterministic.
    """
    q_lower = query.lower()
    entities_lower = " ".join(entities).lower()
    combined = q_lower + " " + entities_lower

    # Explicit state keyword match → State
    state_hits = [kw for kw in STATE_KEYWORDS if kw in combined]
    if state_hits:
        return (
            "state",
            (
                f"Your query mentions '{state_hits[0]}', which is a state government matter. "
                "State RTI applications must be filed with the respective State Information "
                "Commission — not through RTI Online (which handles only Central Government). "
                "Please contact your state's RTI portal or file a physical RTI with the "
                "concerned State Public Information Officer (SPIO)."
            ),
        )

    # Explicit central keyword match → Central
    central_hits = [kw for kw in CENTRAL_KEYWORDS if kw in combined]
    if central_hits:
        return (
            "central",
            (
                f"Your query involves '{central_hits[0]}', which falls under the "
                "Central Government's jurisdiction. This can be filed via RTI Online "
                "(rtionline.gov.in) or sent directly to the Central Public Information "
                "Officer (CPIO) of the relevant Ministry."
            ),
        )

    # Fall back to AI hint — it provided a reasoned guess
    if ai_jurisdiction_hint in ("central", "state"):
        label = "Central Government" if ai_jurisdiction_hint == "central" else "State Government"
        return (
            ai_jurisdiction_hint,
            (
                f"Based on the nature of your query (category: {category}), "
                f"this appears to be a {label} matter. "
                "If you believe this is incorrect, you can select a different authority manually."
            ),
        )

    # Default to central (RTI Online handles central; state portals vary)
    return (
        "central",
        (
            "Could not determine jurisdiction with certainty. "
            "Defaulting to Central Government — please verify the authority "
            "before filing to ensure your request reaches the right office."
        ),
    )
