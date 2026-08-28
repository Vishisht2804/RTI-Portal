"""
AI output / schema validation tests + fallback trigger test.
Must pass before Day 4. Run: pytest tests/test_ai_output.py -v
"""
import json
import pytest
from app.ai.parsers import parse_intent_response, parse_draft_response
from app.ai.fallbacks import get_fallback_intent, get_fallback_draft


class TestIntentParser:
    def test_valid_intent_json(self):
        raw = json.dumps({
            "is_rti": True,
            "category": "health",
            "jurisdiction_hint": "central",
            "summary": "Expenditure on hospitals",
            "entities": ["Ministry of Health"],
            "time_period": "2025",
            "missing_information": [],
            "is_rti_suitable": True,
            "original_query": "How much did MoHFW spend on hospitals?",
        })
        result = parse_intent_response(raw)
        assert result is not None
        assert result["category"] == "health"
        assert result["jurisdiction_hint"] == "central"

    def test_invalid_json_returns_none(self):
        result = parse_intent_response("not json at all {{{")
        assert result is None

    def test_missing_required_field_returns_none(self):
        raw = json.dumps({"is_rti": True})  # missing category etc.
        result = parse_intent_response(raw)
        assert result is None

    def test_invalid_category_repaired(self):
        raw = json.dumps({
            "is_rti": True,
            "category": "HEALTHCARE_EXPENDITURE",  # invalid
            "jurisdiction_hint": "central",
            "summary": "test",
            "entities": [],
        })
        result = parse_intent_response(raw)
        assert result is not None
        assert result["category"] == "other"  # repaired

    def test_invalid_jurisdiction_hint_repaired(self):
        raw = json.dumps({
            "is_rti": True,
            "category": "health",
            "jurisdiction_hint": "federal",  # invalid
            "summary": "test",
            "entities": [],
        })
        result = parse_intent_response(raw)
        assert result is not None
        assert result["jurisdiction_hint"] == "central"  # repaired


class TestDraftParser:
    def test_valid_draft_json(self):
        raw = json.dumps({
            "draft_text": "To,\nThe CPIO...\nPlease provide information about expenditure.",
            "explanation": "This draft asks for expenditure records.",
            "missing_information": [],
        })
        result = parse_draft_response(raw)
        assert result is not None
        assert "draft_text" in result

    def test_missing_draft_text_returns_none(self):
        raw = json.dumps({"explanation": "something"})
        result = parse_draft_response(raw)
        assert result is None

    def test_over_limit_text_truncated(self):
        long_text = "x" * 5000
        raw = json.dumps({"draft_text": long_text})
        result = parse_draft_response(raw)
        assert result is not None
        assert len(result["draft_text"]) <= 3000


class TestFallbacks:
    """Fallback trigger test — demo never crashes even if AI key is invalid."""

    def test_health_fallback_is_rti_suitable(self):
        fb = get_fallback_intent("How much did Ministry of Health spend on hospitals in 2025?")
        assert fb["is_rti"] is True
        assert fb["category"] == "health"

    def test_state_fallback_triggers(self):
        fb = get_fallback_intent("Karnataka state hospital expenditure")
        assert fb["jurisdiction_hint"] == "state"

    def test_grievance_fallback_triggers(self):
        fb = get_fallback_intent("Why hasn't the government built this hospital?")
        assert fb["is_rti"] is False

    def test_draft_fallback_substitutes_authority(self):
        fb = get_fallback_draft("Indian Railways", "Train safety report")
        assert "Indian Railways" in fb["draft_text"]
        assert len(fb["draft_text"]) > 100
