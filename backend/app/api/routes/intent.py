from fastapi import APIRouter
from app.schemas.intent import IntentRequest, IntentResponse
from app.services.intent_service import analyze_intent

router = APIRouter()


@router.post("/analyze", response_model=IntentResponse)
def analyze(req: IntentRequest) -> IntentResponse:
    """
    F1 + F2: Extract intent from citizen query + run deterministic RTI
    suitability and jurisdiction classification.
    """
    return analyze_intent(req.text)
