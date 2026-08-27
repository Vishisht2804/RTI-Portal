from datetime import datetime

from sqlalchemy.orm import Session

from app.models.entities import RTI, StatusEvent
from app.schemas.rti import ApiError, NextAction, RtiStatus

TRANSITIONS: dict[str, set[str]] = {
    RtiStatus.READY_TO_FILE: {RtiStatus.FILING},
    RtiStatus.FILING: {RtiStatus.PAYMENT_PENDING},
    RtiStatus.PAYMENT_PENDING: {RtiStatus.PAYMENT_FAILED, RtiStatus.PAYMENT_SUCCESS},
    RtiStatus.PAYMENT_FAILED: {RtiStatus.PAYMENT_PENDING},
    RtiStatus.PAYMENT_SUCCESS: {RtiStatus.SUBMITTED},
    RtiStatus.SUBMITTED: {RtiStatus.RECEIVED},
    RtiStatus.RECEIVED: {RtiStatus.FORWARDED},
    RtiStatus.FORWARDED: {RtiStatus.AWAITING_RESPONSE},
    RtiStatus.AWAITING_RESPONSE: {RtiStatus.RESPONSE_RECEIVED},
    RtiStatus.RESPONSE_RECEIVED: set(),
}

EVENT_TEXT: dict[str, tuple[str, str]] = {
    RtiStatus.READY_TO_FILE: ("Request prepared", "The validated request was accepted into Track B for filing."),
    RtiStatus.FILING: ("Applicant details saved", "Applicant information was recorded for the simulated filing."),
    RtiStatus.PAYMENT_PENDING: ("Payment required", "The prototype is waiting for the demo application fee step."),
    RtiStatus.PAYMENT_FAILED: ("Payment failed", "The simulated payment failed and can be retried."),
    RtiStatus.PAYMENT_SUCCESS: ("Payment completed", "The demo payment was marked successful. No real money moved."),
    RtiStatus.SUBMITTED: ("Simulated submission completed", "The prototype generated a demo registration number."),
    RtiStatus.RECEIVED: ("Received by demo portal", "A synthetic acknowledgement event was created for the timeline."),
    RtiStatus.FORWARDED: ("Forwarded to authority", "The simulated portal routed the RTI to the selected authority."),
    RtiStatus.AWAITING_RESPONSE: ("Under processing", "No live government status is being fetched in this MVP."),
    RtiStatus.RESPONSE_RECEIVED: ("Response received", "A synthetic response event is available for the demo case."),
}

NEXT_ACTIONS: dict[str, NextAction] = {
    RtiStatus.READY_TO_FILE: NextAction(
        title="Complete applicant details",
        description="Add applicant details to continue the filing flow.",
        action="continue",
        action_url="/filing/{rti_id}/applicant",
    ),
    RtiStatus.FILING: NextAction(
        title="Continue filing",
        description="Review documents and continue to the demo payment step.",
        action="continue",
        action_url="/filing/{rti_id}/documents",
    ),
    RtiStatus.PAYMENT_PENDING: NextAction(
        title="Complete demo payment",
        description="Complete the simulated application fee before submission.",
        action="pay",
        action_url="/filing/{rti_id}/payment",
    ),
    RtiStatus.PAYMENT_FAILED: NextAction(
        title="Retry demo payment",
        description="The simulated payment failed. Retry before submitting.",
        action="retry_payment",
        action_url="/filing/{rti_id}/payment",
    ),
    RtiStatus.PAYMENT_SUCCESS: NextAction(
        title="Review and submit",
        description="Payment is complete. Review the RTI before simulated submission.",
        action="review",
        action_url="/filing/{rti_id}/review",
    ),
    RtiStatus.SUBMITTED: NextAction(
        title="Wait for processing",
        description="Your request has been submitted in the prototype. No real government filing occurred.",
    ),
    RtiStatus.RECEIVED: NextAction(title="No action required", description="The demo portal has acknowledged the request."),
    RtiStatus.FORWARDED: NextAction(title="No action required", description="The request is shown as forwarded in the demo."),
    RtiStatus.AWAITING_RESPONSE: NextAction(
        title="No action required",
        description="Wait for the authority response. This status is simulated for the prototype.",
    ),
    RtiStatus.RESPONSE_RECEIVED: NextAction(
        title="Review the response",
        description="A demo response is available for review.",
        action="review_response",
        action_url="/rtis/{rti_id}",
    ),
}


def add_status_event(db: Session, rti: RTI, status: str, metadata: dict | None = None) -> StatusEvent:
    title, description = EVENT_TEXT[status]
    event = StatusEvent(rti=rti, status=status, title=title, description=description, event_metadata=metadata or {})
    db.add(event)
    return event


def transition(db: Session, rti: RTI, target_status: str, metadata: dict | None = None) -> RTI:
    if target_status not in TRANSITIONS.get(rti.status, set()):
        raise ApiError(
            409,
            "INVALID_STATE_TRANSITION",
            f"Cannot transition RTI {rti.id} from {rti.status} to {target_status}.",
        )
    rti.status = target_status
    add_status_event(db, rti, target_status, metadata)
    return rti


def get_next_action(status: str, rti_id: int) -> dict:
    action = NEXT_ACTIONS.get(status) or NextAction(
        title="Check back later",
        description="The prototype does not have a mapped next action for this state.",
    )
    data = action.model_dump()
    if data.get("action_url"):
        data["action_url"] = data["action_url"].format(rti_id=rti_id)
    return data


def registration_number(rti_id: int) -> str:
    return f"RTI/{datetime.now().year}/{rti_id:05d}"

