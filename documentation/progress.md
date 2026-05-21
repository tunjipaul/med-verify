# MedVerify Project Progress

Last Updated: 2026-05-17
Owner: Engineering (shared context file for all LLM/human contributors)

## Purpose
This file is the single progress ledger for the MedVerify project.
Use it to:
- keep technical context across sessions,
- show what is done vs pending,
- track decisions and blockers,
- preserve project flow from start to finish.

Update rule:
- Always update `Last Updated`.
- Append new entries to `Update Log` (do not rewrite history).
- Keep status fields explicit: `Not Started`, `In Progress`, `Blocked`, `Done`.

## Project Technical Flow (Start to Finish)
1. Scope and policy definition:
- Lock MVP boundaries, roles, permissions, and governance rules.

2. Platform foundation:
- Backend scaffold (Express + TypeScript), DB (PostgreSQL/Prisma), cache (Redis), CI baseline.
- Frontend scaffold (role-based app shell and routing).
- Fraud service scaffold (FastAPI scoring contract).

3. Identity and access:
- Auth login/refresh/logout.
- RBAC middleware and protected routes.
- Audit framework for privileged actions.

4. Case lifecycle (MCT):
- Create and manage medical cases.
- Enforce one-active-case policy per corper.
- Persist lifecycle transitions and actor traceability.

5. Verification workflow:
- Generate/validate one-time verification codes.
- TTL, retry lockout, invalidation, extension controls.
- Notifications abstraction.

6. Decisioning and governance:
- Decision outcomes and explanation payloads.
- Coordinator override with mandatory reason + audit.
- Abuja admin + DG governance flow.

7. Hardening and quality:
- Security controls, error contract, indexes/performance.
- Test coverage expansion and reliability checks.
- CI/CD and rollback runbooks.

8. Pilot readiness and go-live:
- UAT sign-off, staging parity, production checklist.
- Monitoring, incident response, and operational handoff.

## Milestone Tracker
| Milestone | Target Date | Status | Notes |
|---|---|---|---|
| Architecture Locked | 2026-05-22 | In Progress | Timeline defined; lock confirmation pending. |
| Identity and RBAC Complete | 2026-05-29 | In Progress | Backend auth/RBAC present in code; full cross-service sign-off pending. |
| MCT Lifecycle Complete | 2026-06-05 | In Progress | Migration for one-active-case exists; end-to-end verification ongoing. |
| Verification Workflow Complete | 2026-06-12 | In Progress | Routes/services/tests exist; production validation pending. |
| Governance and Dashboards Complete | 2026-06-19 | In Progress | Backend governance APIs present; frontend/dashboard completion not confirmed here. |
| Hardening Complete | 2026-06-26 | Not Started | Requires full security/perf/ops hardening pass. |
| UAT Sign-off | 2026-07-03 | Not Started | Planned. |
| Pilot Launch Ready | 2026-07-10 | Not Started | Planned. |

## Workstream Status Snapshot
### Backend
Status: In Progress
What is clearly present:
- CI workflow with build + migrations + tests.
- Auth, RBAC, audit, MCT, decisions, verification code services/routes.
- Prisma migrations including one-active-case policy migration.
- Health/readiness endpoints and production checklist document.
- Local verification evidence:
- `npm run build` passed on 2026-05-16.
- `npm test` passed twice on 2026-05-16 with `5` test files and `29` tests passed each run.

Remaining for production sign-off:
- Explicit checklist completion evidence (currently checklist is procedural, not marked complete).
- Deployment environment validation in production-like target.
- Post-deploy smoke verification evidence.
- Address recurring `pg` deprecation warning in tests (`client.query()` while another query is executing), before `pg@9`.

### Frontend
Status: Not Started (in this repository context)
Notes:
- No frontend application code is currently visible under this repository root.
- Frontend completion cannot be confirmed from current files.

### Fraud Engine (Python)
Status: Not Started (in this repository context)
Notes:
- No FastAPI fraud service code is currently visible under this repository root.

### DevOps/Infra
Status: In Progress
What is present:
- Backend CI pipeline.
Pending:
- Full staged deployment promotion flow and release runbooks confirmation.

### Security/Compliance
Status: In Progress
What is present:
- Baseline controls documented and partially implemented (helmet, CORS allowlist, rate limiting, audit pathways).
Pending:
- Final security evidence pack and formal pre-production sign-off.

## Blockers / Risks
- Production readiness is not yet formally signed off in documentation.
- Cross-workstream completion (frontend and fraud service) is not visible in current repo tree.
- If timeline remains fixed, integration and UAT windows are schedule-critical.

## Current Focus
- Execute backend production sign-off checklist in target environment and capture evidence.
- Resolve `pg` deprecation warning from concurrent `client.query()` usage before `pg@9`.
- Enforce conditional access gating across backend/frontend workflow surfaces.
- Keep this file updated at each major engineering change.

## Active Technical Tasks
| Task | Status | Owner | Target Date | Exit Criteria |
|---|---|---|---|---|
| Resolve `pg` deprecation warning (`client.query()` while client is already executing query) | In Progress | Backend Engineering | 2026-06-26 | `npm test` runs with no `pg` deprecation warnings and query flow is `await`-safe/pooled correctly. |

## Update Log
### 2026-05-17
- Added a mandatory conditional access requirement to project memory:
- Modules, workflows, and administrative actions must remain inaccessible until prerequisite actions, validations, or approval states are completed by authorized actors in the workflow chain.
- Registered this as an active engineering constraint for backend and frontend implementation.

### 2026-05-16
- Created `progress.md` as shared continuity document for human + LLM contributors.
- Added end-to-end technical flow, milestone tracker, workstream status, and risk register.
- Recorded backend as `In Progress` (not yet formally `Done` for production sign-off).
- Verified backend gates with execution evidence:
- Local build passed (`npm run build`).
- Local tests passed twice (`npm test` -> `5 passed`, `29/29 tests`).
- Logged non-blocking risk: `pg` deprecation warning observed during test runs.
- Converted backend production checklist to explicit release sign-off template (`PASS`/`FAIL`/`PENDING`) with evidence fields.
