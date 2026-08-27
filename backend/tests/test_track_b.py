def create_rti(client, ready_payload):
    response = client.post("/api/v1/rtis", json=ready_payload)
    assert response.status_code == 201, response.text
    return response.json()["rti_id"]


def test_ready_to_file_validation_rejects_unready_payload(client, ready_payload):
    ready_payload["validation_status"] = "needs_review"
    response = client.post("/api/v1/rtis", json=ready_payload)
    assert response.status_code == 422


def test_rti_creation_and_dashboard(client, ready_payload):
    rti_id = create_rti(client, ready_payload)
    detail = client.get(f"/api/v1/rtis/{rti_id}").json()
    assert detail["status"] == "READY_TO_FILE"
    assert detail["next_action"]["action"] == "continue"
    dashboard = client.get("/api/v1/rtis").json()
    assert dashboard[0]["id"] == rti_id


def test_applicant_otp_payment_submission_flow(client, ready_payload):
    rti_id = create_rti(client, ready_payload)
    applicant = client.post(
        f"/api/v1/rtis/{rti_id}/applicant",
        json={"name": "Demo User", "email": "demo@example.com", "phone": "9999999999"},
    )
    assert applicant.status_code == 200
    otp = client.post(f"/api/v1/rtis/{rti_id}/otp/send").json()
    assert otp["otp"] == "123456"
    assert client.post(f"/api/v1/rtis/{rti_id}/otp/verify", json={"otp": "123456"}).status_code == 200
    assert client.post(f"/api/v1/rtis/{rti_id}/payment", json={"force_result": "SUCCESS"}).status_code == 200
    submitted = client.post(f"/api/v1/rtis/{rti_id}/submit")
    assert submitted.status_code == 200, submitted.text
    body = submitted.json()
    assert body["registration_number"].startswith("RTI/")
    detail = client.get(f"/api/v1/rtis/{rti_id}").json()
    assert detail["status"] == "AWAITING_RESPONSE"
    assert len(detail["status_events"]) >= 7
    assert detail["next_action"]["title"] == "No action required"


def test_payment_failure_retry_success(client, ready_payload):
    rti_id = create_rti(client, ready_payload)
    client.post(
        f"/api/v1/rtis/{rti_id}/applicant",
        json={"name": "Demo User", "email": "demo@example.com", "phone": "9999999999"},
    )
    failed = client.post(f"/api/v1/rtis/{rti_id}/payment", json={"force_result": "FAILED"})
    assert failed.status_code == 200
    assert client.get(f"/api/v1/rtis/{rti_id}").json()["status"] == "PAYMENT_FAILED"
    retried = client.post(f"/api/v1/rtis/{rti_id}/payment", json={"force_result": "SUCCESS"})
    assert retried.status_code == 200
    assert client.get(f"/api/v1/rtis/{rti_id}").json()["status"] == "PAYMENT_SUCCESS"


def test_submit_requires_applicant_otp_and_payment(client, ready_payload):
    rti_id = create_rti(client, ready_payload)
    response = client.post(f"/api/v1/rtis/{rti_id}/submit")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "APPLICANT_REQUIRED"


def test_document_validation(client, ready_payload):
    rti_id = create_rti(client, ready_payload)
    client.post(
        f"/api/v1/rtis/{rti_id}/applicant",
        json={"name": "Demo User", "email": "demo@example.com", "phone": "9999999999"},
    )
    bad = client.post("/api/v1/documents", data={"rti_id": rti_id}, files={"file": ("notes.exe", b"nope")})
    assert bad.status_code == 422
    good = client.post("/api/v1/documents", data={"rti_id": rti_id}, files={"file": ("proof.pdf", b"pdf")})
    assert good.status_code == 200
    assert good.json()["filename"] == "proof.pdf"


def test_demo_reset_seeds_known_rti(client):
    response = client.post("/api/v1/demo/reset")
    assert response.status_code == 200
    assert response.json()["demo_rti_id"] == 1

