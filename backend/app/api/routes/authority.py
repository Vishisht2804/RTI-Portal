from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.authority import AuthorityRecommendRequest, AuthorityRecommendResponse
from app.services.authority_service import recommend_authority

router = APIRouter()


@router.post("/recommend", response_model=AuthorityRecommendResponse)
def recommend(req: AuthorityRecommendRequest, db: Session = Depends(get_db)):
    """
    F3: Recommend the best-matched authority from curated DB
    using keyword + category scoring.
    """
    return recommend_authority(
        db=db,
        category=req.category,
        entities=req.entities,
        jurisdiction=req.jurisdiction,
        original_query=req.original_query,
    )
