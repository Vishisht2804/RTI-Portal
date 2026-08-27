from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class RtiStatus(str, Enum):
    READY_TO_FILE = "READY_TO_FILE"
    FILING = "FILING"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"
    SUBMITTED = "SUBMITTED"
    RECEIVED = "RECEIVED"
    FORWARDED = "FORWARDED"
    AWAITING_RESPONSE = "AWAITING_RESPONSE"
    RESPONSE_RECEIVED = "RESPONSE_RECEIVED"


class PaymentStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict[str, Any] | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


class QualityChecks(BaseModel):
    authority: bool
    jurisdiction: bool
    information_request: bool
    specificity: bool
    character_limit: bool

    def all_ready(self) -> bool:
        return all(
            [
                self.authority,
                self.jurisdiction,
                self.information_request,
                self.specificity,
                self.character_limit,
            ]
        )


class ReadyToFileRequest(BaseModel):
    draft_id: int
    authority_id: int
    authority_name: str = Field(min_length=2)
    jurisdiction: str = Field(pattern="^(central|state)$")
    category: str = Field(min_length=2, max_length=80)
    request_text: str = Field(min_length=20, max_length=3000)
    original_query: str = Field(min_length=5)
    validation_status: str = Field(pattern="^(ready|needs_review)$")
    quality_checks: QualityChecks

    @model_validator(mode="after")
    def must_be_ready(self):
        if self.validation_status != "ready" or not self.quality_checks.all_ready():
            raise ValueError("Ready-to-File payload must be fully validated before Track B accepts it.")
        return self


class ApplicantRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=255)
    phone: str = Field(min_length=10, max_length=30)


class OtpVerifyRequest(BaseModel):
    otp: str = Field(min_length=6, max_length=6)


class PaymentRequest(BaseModel):
    force_result: PaymentStatus | None = None


class NextAction(BaseModel):
    title: str
    description: str
    action: str | None = None
    action_url: str | None = None


class StatusEventResponse(BaseModel):
    id: int
    status: str
    title: str
    description: str
    timestamp: datetime | None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RtiCreatedResponse(BaseModel):
    rti_id: int
    status: RtiStatus
