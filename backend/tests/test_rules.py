"""
Unit tests — P1 domain: classification, jurisdiction, validation.
Must pass before Day 3. Run: pytest tests/test_rules.py -v
"""
import pytest
from app.rules.rti_classifier import classify_rti_suitability
from app.rules.jurisdiction import determine_jurisdiction
from app.rules.validation_rules import validate_draft


# ─── RTI Classifier ────────────────────────────────────────────────────────────

class TestRTIClassifier:
    def test_health_expenditure_is_rti(self):
        ok, _, _ = classify_rti_suitability(
            "How much did Ministry of Health spend on government hospitals in 2025?",
            "health", True
        )
        assert ok is True

    def test_grievance_not_rti(self):
        ok, explanation, suggestion = classify_rti_suitability(
            "Why hasn't the government built this hospital?",
            "infrastructure", False
        )
        assert ok is False
        assert suggestion is not None

    def test_action_demand_not_rti(self):
        ok, _, _ = classify_rti_suitability(
            "Please fix the roads in my area immediately",
            "infrastructure", False
        )
        assert ok is False

    def test_information_request_is_rti(self):
        ok, _, _ = classify_rti_suitability(
            "Please provide certified copies of the work order for NH-44 construction",
            "infrastructure", True
        )
        assert ok is True


# ─── Jurisdiction ─────────────────────────────────────────────────────────────

class TestJurisdiction:
    def test_central_ministry_query(self):
        j, _ = determine_jurisdiction(
            "Ministry of Health expenditure 2025", "health", "central",
            ["Ministry of Health and Family Welfare"]
        )
        assert j == "central"

    def test_karnataka_state(self):
        j, explanation = determine_jurisdiction(
            "Karnataka state hospital expenditure", "health", "state",
            ["Karnataka", "state hospitals"]
        )
        assert j == "state"
        assert "state" in explanation.lower()

    def test_railway_is_central(self):
        j, _ = determine_jurisdiction(
            "Indian Railways budget allocation 2025", "infrastructure", "central", []
        )
        assert j == "central"

    def test_ai_hint_used_when_no_keyword(self):
        j, _ = determine_jurisdiction(
            "Public school teacher salaries", "education", "state", []
        )
        assert j == "state"  # AI hint used


# ─── Validation Rules ─────────────────────────────────────────────────────────

class TestValidationRules:
    GOOD_DRAFT = (
        "To,\nThe CPIO,\nMinistry of Health.\n\n"
        "Please provide certified copies of the budget allocated and expenditure incurred "
        "for government hospitals in the financial year 2024-25, including category-wise "
        "breakup of infrastructure, equipment, salaries, and medicines. "
        "Also provide the list of hospitals covered."
    )

    def test_good_draft_passes(self):
        checks, warnings = validate_draft(self.GOOD_DRAFT, 1, "Ministry of Health", "central")
        assert checks.character_limit is True
        assert checks.information_request is True

    def test_over_limit_fails(self):
        long_text = "Please provide information about " + "x " * 2000
        checks, warnings = validate_draft(long_text, 1, "Ministry of Health", "central")
        assert checks.character_limit is False
        assert any("character" in w.lower() for w in warnings)

    def test_action_request_fails(self):
        checks, warnings = validate_draft(
            "Please take action to fix the roads immediately.", 1, "MoRTH", "central"
        )
        assert checks.information_request is False

    def test_no_authority_fails(self):
        checks, _ = validate_draft(self.GOOD_DRAFT, 0, "", "central")
        assert checks.authority is False

    def test_demo_scenario_1_passes(self):
        """Demo scenario 1 draft must pass all checks."""
        demo_draft = (
            "To,\nThe Central Public Information Officer,\n"
            "Ministry of Health and Family Welfare,\nNew Delhi.\n\n"
            "I hereby request the following information under Section 6 of the RTI Act, 2005:\n"
            "1. Total budget allocated and expenditure incurred on government hospitals "
            "for the financial year 2024-25 and 2025-26.\n"
            "2. Category-wise breakup including infrastructure, equipment, salaries, and medicines.\n"
            "3. List of Central Government hospitals covered.\n\n"
            "Certified copies of relevant records may be provided. Fee of Rs. 10 enclosed."
        )
        checks, warnings = validate_draft(demo_draft, 12, "Ministry of Health and Family Welfare", "central")
        assert checks.authority is True
        assert checks.jurisdiction is True
        assert checks.character_limit is True
