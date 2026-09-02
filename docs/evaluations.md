# Evaluation plan

## Goal

Measure whether the workflow is dependable enough to replace manual reminder sending without losing human review.

## Pre-send checks

| Check | Pass condition |
| --- | --- |
| Content | Preview matches the approved meeting details, audience, venue note, and attachment. |
| Recipients | Counts match the approved group rules; no person appears in multiple fields. |
| Timing | `sendAt` is future ISO-8601 time and maps to the intended local time. |
| Attachment | Object exists in the private bucket and has the expected filename/content type. |
| Privacy | Public repository and preview exports contain no real contact lists or addresses. |

## Delivery checks

| Scenario | Expected result |
| --- | --- |
| Normal task delivery | Job changes `QUEUED` → `SENDING` → `SENT`; Gmail message ID is recorded. |
| Duplicate task callback | Second callback returns `already-sent`; no second message is sent. |
| Temporary Gmail/API error | Job returns to `QUEUED`; Cloud Tasks retries; error is visible. |
| Service restart during delivery | Send lease permits recovery after expiration. |
| Invalid recipient | Preview rejects the request before a job or task is created. |
| Unapproved recipient edit | Update is rejected unless explicit approval flag is present. |

## Metrics to track per campaign

- Total planned emails
- Preview validation failures
- Queued jobs
- Sent jobs
- Retry count and reasons
- Final failed jobs
- Time from intended schedule to successful delivery
- Manual interventions required

## Acceptance threshold

For a campaign to be considered automated, every planned job must either be `SENT` with a message ID or have a visible, actionable failure. A scheduled-looking task without delivery evidence does not count as success.
