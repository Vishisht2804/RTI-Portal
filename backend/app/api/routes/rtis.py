from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.rti import (
    ApplicantRequest,
    OtpVerifyRequest,
    PaymentRequest,
    ReadyToFileRequest,
)
from app.services.rti_service import (
    create_rti_from_ready_to_file,
    get_rti_detail,
    list_rtis,
    record_applicant,
    retry_payment,
    send_demo_otp,
    submit_rti,
    verify_demo_otp,
)

router = APIRouter(prefix="/rtis", tags=["rtis"])


@router.post("", status_code=201)
def create_rti(payload: ReadyToFileRequest, db: Session = Depends(get_db)):
    return create_rti_from_ready_to_file(db, payload)


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    return list_rtis(db)


@router.get("/{rti_id}")
def detail(rti_id: int, db: Session = Depends(get_db)):
    return get_rti_detail(db, rti_id)


@router.post("/{rti_id}/applicant")
def applicant(rti_id: int, payload: ApplicantRequest, db: Session = Depends(get_db)):
    return record_applicant(db, rti_id, payload)


@router.post("/{rti_id}/otp/send")
def otp_send(rti_id: int, db: Session = Depends(get_db)):
    return send_demo_otp(db, rti_id)


@router.post("/{rti_id}/otp/verify")
def otp_verify(rti_id: int, payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    return verify_demo_otp(db, rti_id, payload.otp)


@router.post("/{rti_id}/payment")
def payment(rti_id: int, payload: PaymentRequest | None = None, db: Session = Depends(get_db)):
    return retry_payment(db, rti_id, payload or PaymentRequest())


@router.post("/{rti_id}/submit")
def submit(rti_id: int, db: Session = Depends(get_db)):
    return submit_rti(db, rti_id)

