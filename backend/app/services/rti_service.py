from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.models.entities import Document, Payment, RTI, StatusEvent, User
from app.schemas.rti import ApiError, ApplicantRequest, PaymentRequest, PaymentStatus, ReadyToFileRequest, RtiStatus
from app.services.lifecycle import add_status_event, get_next_action, registration_number, transition

ALLOWED_DOCUMENT_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_DOCUMENT_BYTES = 5 * 1024 * 1024


def _get_rti(db: Session, rti_id: int) -> RTI:
    rti = db.scalar(
        select(RTI)
        .where(RTI.id == rti_id)
        .options(selectinload(RTI.user), selectinload(RTI.status_events), selectinload(RTI.documents), selectinload(RTI.payments))
    )
    if not rti:
        raise ApiError(404, "RTI_NOT_FOUND", "The requested RTI was not found.")
    return rti


def create_rti_from_ready_to_file(db: Session, payload: ReadyToFileRequest) -> dict:
    rti = RTI(
        draft_id=payload.draft_id,
        authority_id=payload.authority_id,
        authority_name=payload.authority_name,
        original_query=payload.original_query,
        final_request=payload.request_text,
        jurisdiction=payload.jurisdiction,
        category=payload.category,
        status=RtiStatus.READY_TO_FILE,
    )
    db.add(rti)
    db.flush()
    add_status_event(db, rti, RtiStatus.READY_TO_FILE, {"source": "ready_to_file_contract"})
    db.commit()
    db.refresh(rti)
    return {"rti_id": rti.id, "status": rti.status}


def record_applicant(db: Session, rti_id: int, payload: ApplicantRequest) -> dict:
    rti = _get_rti(db, rti_id)
    if rti.status != RtiStatus.READY_TO_FILE:
        raise ApiError(409, "INVALID_RTI_STATE", "Applicant details can only be added before filing starts.")
    user = User(name=payload.name, email=payload.email, phone=payload.phone)
    db.add(user)
    db.flush()
    rti.user_id = user.id
    transition(db, rti, RtiStatus.FILING)
    transition(db, rti, RtiStatus.PAYMENT_PENDING)
    db.commit()
    return get_rti_detail(db, rti.id)


def send_demo_otp(db: Session, rti_id: int) -> dict:
    _get_rti(db, rti_id)
    return {
        "sent": True,
        "otp": settings.demo_otp,
        "message": "Demo OTP only. No SMS was sent.",
    }


def verify_demo_otp(db: Session, rti_id: int, otp: str) -> dict:
    rti = _get_rti(db, rti_id)
    if otp != settings.demo_otp:
        raise ApiError(422, "INVALID_OTP", "Use demo OTP 123456 for this prototype.")
    rti.otp_verified = True
    db.commit()
    return {"verified": True, "message": "Demo OTP accepted."}


def add_document(db: Session, rti_id: int, filename: str, size: int) -> dict:
    rti = _get_rti(db, rti_id)
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_DOCUMENT_SUFFIXES:
        raise ApiError(422, "UNSUPPORTED_DOCUMENT_TYPE", "Upload a PDF, PNG, JPG, or JPEG document.")
    if size > MAX_DOCUMENT_BYTES:
        raise ApiError(422, "DOCUMENT_TOO_LARGE", "Documents must be 5 MB or smaller for the demo.")
    if rti.status not in {RtiStatus.FILING, RtiStatus.PAYMENT_PENDING, RtiStatus.PAYMENT_FAILED, RtiStatus.PAYMENT_SUCCESS}:
        raise ApiError(409, "INVALID_RTI_STATE", "Documents can only be uploaded during filing.")
    doc = Document(rti_id=rti.id, filename=filename, size=size, path=f"local-demo://documents/{rti.id}/{filename}")
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "size": doc.size, "path": doc.path}


def retry_payment(db: Session, rti_id: int, payload: PaymentRequest) -> dict:
    rti = _get_rti(db, rti_id)
    if rti.status == RtiStatus.PAYMENT_FAILED:
        transition(db, rti, RtiStatus.PAYMENT_PENDING)
    if rti.status != RtiStatus.PAYMENT_PENDING:
        raise ApiError(409, "PAYMENT_NOT_ALLOWED", "Payment can only be attempted while payment is pending or failed.")
    result = payload.force_result or PaymentStatus.SUCCESS
    payment = Payment(rti_id=rti.id, status=result, amount=settings.payment_amount)
    db.add(payment)
    transition(db, rti, RtiStatus.PAYMENT_SUCCESS if result == PaymentStatus.SUCCESS else RtiStatus.PAYMENT_FAILED)
    db.commit()
    return {"status": result, "amount": settings.payment_amount, "simulated": True}


def submit_rti(db: Session, rti_id: int) -> dict:
    rti = _get_rti(db, rti_id)
    if not rti.user_id:
        raise ApiError(409, "APPLICANT_REQUIRED", "Complete applicant details before submitting.")
    if not rti.otp_verified:
        raise ApiError(409, "OTP_REQUIRED", "Verify the demo OTP before submitting.")
    if rti.status != RtiStatus.PAYMENT_SUCCESS:
        raise ApiError(409, "PAYMENT_REQUIRED", "Complete demo payment before submitting the RTI.")
    rti.registration_number = registration_number(rti.id)
    rti.submitted_at = datetime.utcnow()
    transition(db, rti, RtiStatus.SUBMITTED, {"simulated": True})
    transition(db, rti, RtiStatus.RECEIVED)
    transition(db, rti, RtiStatus.FORWARDED)
    transition(db, rti, RtiStatus.AWAITING_RESPONSE)
    db.commit()
    return {
        "registration_number": rti.registration_number,
        "status": rti.status,
        "simulated": True,
        "message": "Prototype submission only. No real government system was contacted.",
    }


def _serialize_rti(rti: RTI) -> dict:
    latest_event = rti.status_events[-1] if rti.status_events else None
    return {
        "id": rti.id,
        "registration_number": rti.registration_number,
        "authority_id": rti.authority_id,
        "authority_name": rti.authority_name,
        "jurisdiction": rti.jurisdiction,
        "category": rti.category,
        "original_query": rti.original_query,
        "final_request": rti.final_request,
        "status": rti.status,
        "created_at": rti.created_at,
        "submitted_at": rti.submitted_at,
        "applicant": None if not rti.user else {"id": rti.user.id, "name": rti.user.name, "email": rti.user.email, "phone": rti.user.phone},
        "documents": [{"id": d.id, "filename": d.filename, "size": d.size, "path": d.path, "created_at": d.created_at} for d in rti.documents],
        "payments": [{"id": p.id, "status": p.status, "amount": p.amount, "created_at": p.created_at} for p in rti.payments],
        "status_events": [
            {
                "id": e.id,
                "status": e.status,
                "title": e.title,
                "description": e.description,
                "timestamp": e.timestamp,
                "metadata": e.event_metadata or {},
            }
            for e in rti.status_events
        ],
        "last_update": latest_event.timestamp if latest_event else rti.created_at,
        "next_action": get_next_action(rti.status, rti.id),
    }


def get_rti_detail(db: Session, rti_id: int) -> dict:
    return _serialize_rti(_get_rti(db, rti_id))


def list_rtis(db: Session) -> list[dict]:
    rtis = db.scalars(
        select(RTI)
        .options(selectinload(RTI.user), selectinload(RTI.status_events), selectinload(RTI.documents), selectinload(RTI.payments))
        .order_by(RTI.created_at.desc(), RTI.id.desc())
    ).all()
    return [
        {
            "id": rti.id,
            "registration_number": rti.registration_number,
            "authority_name": rti.authority_name,
            "subject": rti.original_query[:96],
            "status": rti.status,
            "last_update": (rti.status_events[-1].timestamp if rti.status_events else rti.created_at),
            "next_action": get_next_action(rti.status, rti.id),
        }
        for rti in rtis
    ]


def reset_demo_state(db: Session) -> dict:
    for model in (Payment, Document, StatusEvent, RTI, User):
        db.execute(delete(model))
    db.commit()
    created = create_rti_from_ready_to_file(
        db,
        ReadyToFileRequest(
            draft_id=101,
            authority_id=12,
            authority_name="Ministry of Health and Family Welfare",
            jurisdiction="central",
            category="health",
            request_text="Please provide the sanctioned budget, expenditure incurred, current completion status, and completion date for government hospital infrastructure projects funded by the Ministry of Health and Family Welfare during 2025.",
            original_query="How much did Ministry of Health spend on government hospitals in 2025?",
            validation_status="ready",
            quality_checks={
                "authority": True,
                "jurisdiction": True,
                "information_request": True,
                "specificity": True,
                "character_limit": True,
            },
        ),
    )
    return {"reset": True, "demo_rti_id": created["rti_id"], "status": created["status"]}

