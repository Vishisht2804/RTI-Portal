from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.rti_service import add_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("")
async def upload_document(
    rti_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return add_document(db, rti_id=rti_id, filename=file.filename or "document", size=file.size or 0)

