# RTI Navigator Track B Contracts

Track B consumes a validated Ready-to-File payload from Track A through `POST /api/v1/rtis`.

Track B does not query Track A draft or authority tables. It persists the fields needed for the RTI lifecycle and owns every status change after creation.

All government submission, OTP, payment, document storage, and status progression are simulated for the MVP.

## Ready-to-File Payload

```json
{
  "draft_id": 101,
  "authority_id": 12,
  "authority_name": "Ministry of Health and Family Welfare",
  "jurisdiction": "central",
  "category": "health",
  "request_text": "Please provide...",
  "original_query": "How much did Ministry of Health spend on government hospitals in 2025?",
  "validation_status": "ready",
  "quality_checks": {
    "authority": true,
    "jurisdiction": true,
    "information_request": true,
    "specificity": true,
    "character_limit": true
  }
}
```

If `validation_status` is not `ready`, or any quality check is false, Track B rejects the payload.

