# Project log and decisions

## Objective

Reduce the time and operational risk of preparing community meeting reminders while maintaining human control over final content and recipient eligibility.

## Key decisions

| Decision | Rationale | Result |
| --- | --- | --- |
| Use Gmail API rather than browser-scheduled drafts | Scheduled drafts depend on a user interface and are difficult to audit programmatically. | Reliable server-side delivery path. |
| Use Cloud Tasks rather than an in-process timer | Containers can restart or scale to zero. | Durable scheduling and retry behavior. |
| Store job state in Firestore | Delivery state must survive service restarts. | Auditable queue, attempts, and sent state. |
| Require preview before approval | Calendar and audience eligibility require human judgment. | A review checkpoint before sending. |
| Keep recipient updates explicitly gated | Membership changes are sensitive and error-prone. | Body edits remain possible; recipient changes require an approval flag. |
| Store attachments in Cloud Storage | PDF files do not belong in request bodies or source control. | Private, reusable attachments. |
| Load OAuth values from Secret Manager | Source control and normal environment variables are not safe storage for credentials. | Secrets are separated from code. |
| Sanitize this public repository | The live workflow involved real people and sensitive meeting data. | Portfolio value without exposing operational information. |

## Challenges addressed

1. **Reliable timing:** Cloud Tasks schedules delivery independently of the coordinator's computer.
2. **Duplicate sends:** Firestore transactions and a send lease ensure one job is claimed once.
3. **Transient failures:** unsuccessful jobs return to the queue for retry and retain an error record.
4. **Gmail OAuth fragility:** OAuth values are normalized before use because a pasted trailing newline can cause a credential failure.
5. **Private data:** source-control exclusions and managed-secret design keep sensitive data out of the public repository.
6. **Last-minute changes:** queued job updates can safely revise message content and, with explicit approval, recipients.

## Delivered capabilities

- Calendar attachment delivery
- One-off and batch reminder scheduling
- Recipient validation and duplicate prevention
- HTML and text email rendering
- Center/venue notice support
- Queued-message previews and edits
- Firestore delivery history
- Cloud Tasks retry integration
- Gmail OAuth delivery

## Outcome and evaluation criteria

Success is not merely that a task appears scheduled. The system is evaluated on:

- Correct audience and recipient counts before queueing
- Correct local send time
- Successful Gmail message ID after delivery
- Zero duplicate sends per job
- Clear failure visibility and retry behavior
- Absence of personal data and credentials in public code

See [evaluations.md](evaluations.md) for the practical test plan.
