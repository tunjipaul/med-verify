# NYSC Medical Verification System Rules Bible

Purpose:
This document is the technical source of truth for implementation rules. If any other document conflicts with this file, this file governs engineering behavior for MVP.

Last updated:
May 16, 2026

## 1) Core Roles

- CORPER
- DOCTOR
- COORDINATOR
- ABUJA_ADMIN
- DG
- SYSTEM (non-human service actor)

## 2) Action-Level Permission Matrix

Legend:
- ALLOW = action permitted
- DENY = action not permitted
- CONDITIONAL = permitted only under listed conditions

`AUTH`
- Login:
  - CORPER ALLOW
  - DOCTOR ALLOW
  - COORDINATOR ALLOW
  - ABUJA_ADMIN ALLOW
  - DG ALLOW
- Refresh token:
  - All authenticated roles ALLOW

`MCT CASES`
- Create MCT:
  - SYSTEM ALLOW (triggered after call-up issuance)
  - Human roles DENY
- Get own MCT:
  - CORPER ALLOW (own record only)
- Get assigned/visible MCT list:
  - DOCTOR ALLOW (hospital/assignment scope only)
  - COORDINATOR ALLOW (state scope only)
  - ABUJA_ADMIN ALLOW (national scope)
  - DG ALLOW (escalated cases scope)
- Transition MCT status:
  - DOCTOR CONDITIONAL (only to UNDER_REVIEW via report submission)
  - COORDINATOR CONDITIONAL (REVIEW_REQUIRED flows with mandatory reason)
  - ABUJA_ADMIN CONDITIONAL (review/escalate decisions in national scope)
  - DG CONDITIONAL (final action on escalated cases)
  - CORPER DENY

`MEDICAL REPORTS`
- Create report:
  - DOCTOR CONDITIONAL (only within active MCT and same hospital scope)
- Update report:
  - DOCTOR CONDITIONAL (before terminal decision only; edits audited)
- Delete report:
  - All roles DENY (use supersede/version pattern only)
- View report:
  - CORPER ALLOW (own case report summary only)
  - DOCTOR ALLOW (own submitted reports + assigned case details)
  - COORDINATOR ALLOW (state scope)
  - ABUJA_ADMIN ALLOW (national)
  - DG ALLOW (escalated scope)

`VERIFICATION CODE`
- Generate code:
  - SYSTEM ALLOW (called by backend during doctor workflow)
  - Human roles DENY for direct generation endpoint
- Submit/validate code:
  - CORPER ALLOW (own active case only)
- Extend code expiry:
  - COORDINATOR CONDITIONAL (one extension only, reason mandatory, audited)
  - ABUJA_ADMIN CONDITIONAL (one extension only, reason mandatory, audited)
  - DOCTOR DENY
  - CORPER DENY

`DECISIONING`
- Compute risk score:
  - SYSTEM ALLOW
- Write decision outcome:
  - SYSTEM CONDITIONAL (auto outcome paths)
  - COORDINATOR CONDITIONAL (review decision with reason)
  - ABUJA_ADMIN CONDITIONAL (escalation decisions)
  - DG CONDITIONAL (final decision on escalated cases)
- Override decision:
  - COORDINATOR CONDITIONAL (allowed reasons only, threshold monitored)
  - ABUJA_ADMIN CONDITIONAL (national review authority)
  - DG ALLOW (final authority)

`ADMINISTRATION`
- Manage hospitals:
  - ABUJA_ADMIN ALLOW
  - DG ALLOW
  - Others DENY
- Manage doctors:
  - ABUJA_ADMIN ALLOW
  - COORDINATOR CONDITIONAL (state-level recommendations only)
  - Others DENY
- View audit logs:
  - ABUJA_ADMIN ALLOW
  - DG ALLOW
  - COORDINATOR CONDITIONAL (state-only slice)
  - Others DENY

## 3) MCT Lifecycle and Transition Rules

States:
- CREATED
- UNDER_REVIEW
- REVIEW_REQUIRED
- ESCALATED
- APPROVED
- REJECTED
- CLOSED

Terminal states:
- CLOSED

Allowed transitions:
1. CREATED -> UNDER_REVIEW
   - Actor: DOCTOR (via report submission) or SYSTEM
2. UNDER_REVIEW -> APPROVED
   - Actor: SYSTEM (auto low-risk) or ABUJA_ADMIN or DG
3. UNDER_REVIEW -> REVIEW_REQUIRED
   - Actor: SYSTEM (score band) or ABUJA_ADMIN
4. UNDER_REVIEW -> ESCALATED
   - Actor: SYSTEM (score band) or ABUJA_ADMIN
5. UNDER_REVIEW -> REJECTED
   - Actor: SYSTEM (high confidence) or ABUJA_ADMIN or DG
6. REVIEW_REQUIRED -> APPROVED
   - Actor: COORDINATOR or ABUJA_ADMIN or DG
7. REVIEW_REQUIRED -> REJECTED
   - Actor: COORDINATOR or ABUJA_ADMIN or DG
8. REVIEW_REQUIRED -> ESCALATED
   - Actor: COORDINATOR or ABUJA_ADMIN
9. ESCALATED -> APPROVED
   - Actor: DG
10. ESCALATED -> REJECTED
   - Actor: DG
11. APPROVED -> CLOSED
   - Actor: SYSTEM
12. REJECTED -> CLOSED
   - Actor: SYSTEM

Forbidden transitions:
- Any transition from CLOSED
- CREATED -> APPROVED/REJECTED/ESCALATED directly
- APPROVED -> UNDER_REVIEW
- REJECTED -> UNDER_REVIEW
- Any transition not explicitly listed in allowed transitions

## 4) Verification Code Rules

Code properties:
- Single-use
- Bound to one tuple: corper_id + mct_case_id + hospital_id + doctor_id
- Default TTL: 12 hours
- One extension maximum

Invalidation triggers:
- Successful use (immediate invalidation)
- Expiry reached
- Case enters CLOSED
- Failed attempts > 2 (three failed attempts total)

Extension policy:
- Max 1 extension per code
- Extension duration configurable (default +6 hours)
- Mandatory reason and actor logging

## 5) Risk Signal Model (MVP)

Scoring is deterministic and additive.

Default signal weights:
- GEO_MISMATCH: +2
- TIME_BURST_HOSPITAL: +3
- DOCTOR_THROUGHPUT_SPIKE: +3
- DIAGNOSIS_CLUSTERING: +2
- PHONE_REUSE: +2
- REFERRAL_TAG: +1
- TIER2_HOSPITAL: +2
- IDENTITY_PARTIAL_MATCH: +2
- IDENTITY_NO_MATCH: +5
- CODE_FAILED_ATTEMPTS_GT2: +3

Decision bands:
- 0 to 4: AUTO_APPROVE
- 5 to 9: REVIEW_REQUIRED
- 10 to 14: ESCALATE
- 15 and above: AUTO_REJECT

Policy guardrail:
- If evidence confidence is ambiguous, prefer REVIEW_REQUIRED over reject.

## 6) API Contract Baseline (MVP)

Auth:
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

MCT:
- GET /api/v1/mct/:id
- GET /api/v1/mct
- POST /api/v1/mct/:id/transition

Reports:
- POST /api/v1/reports
- PATCH /api/v1/reports/:id
- GET /api/v1/reports/:id

Verification:
- POST /api/v1/verification/generate
- POST /api/v1/verification/validate
- POST /api/v1/verification/extend

Decision:
- POST /api/v1/decision/score
- POST /api/v1/decision/resolve
- POST /api/v1/decision/override

Audit:
- GET /api/v1/audit
- GET /api/v1/audit/:id

Admin:
- POST /api/v1/admin/hospitals
- PATCH /api/v1/admin/hospitals/:id
- POST /api/v1/admin/doctors
- PATCH /api/v1/admin/doctors/:id

Minimum response shape for decision endpoints:
- case_id
- outcome
- risk_score
- risk_breakdown (array of signal, weight, reason)
- decided_by
- decided_at

## 7) Database Constraints (Non-Negotiable)

1. One active MCT per corper:
- Partial unique index on mct_cases(corper_id) where status not in (APPROVED, REJECTED, CLOSED)

2. Verification code uniqueness:
- Unique(code_value)

3. Verification code single-use:
- used_at nullable timestamp; validation requires used_at is null

4. Audit log immutability:
- No update/delete application paths; insert-only

5. Doctor identity uniqueness:
- Unique(mdcn_number)

6. Hospital identity uniqueness:
- Unique(hospital_license_number or approved_registry_id)

7. Decision traceability:
- Every decision row must reference case_id and actor_id (or SYSTEM actor id)

## 8) Audit Logging Rules

Mandatory logged events:
- Login success/failure
- MCT created
- MCT status transition attempted and result
- Report create/update
- Verification code generated/validated/failed/extended
- Decision generated/overridden/finalized
- Privileged admin actions

Minimum log fields:
- event_id
- event_type
- actor_id
- actor_role
- case_id (nullable when not case-bound)
- target_id (nullable)
- payload_summary
- timestamp
- source_ip

## 9) Acceptance Tests (Must Pass Before Pilot)

1. Cannot create two active MCTs for same corper.
2. Corper cannot view another corper’s case.
3. Doctor cannot approve relocation outcome directly.
4. Expired verification code always fails.
5. Used verification code cannot be reused.
6. Three failed code attempts lock that code.
7. Any forbidden MCT transition is rejected with 4xx.
8. Every transition writes an audit log entry.
9. Every override requires non-empty reason.
10. Every decision response returns score and breakdown.
11. CLOSED cases cannot be mutated.
12. DG can act only on ESCALATED cases for final decision.

## 10) Change Control

Rule change policy:
- Any change to this file must include:
  - Change reason
  - Affected modules
  - Migration impact (if any)
  - Test updates required

Versioning:
- Start at rules version v1.0
- Record increments in project changelog

Current version:
v1.0
