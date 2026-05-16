Project Timeline for NYSC Medical Verification System
Scope: Full Project Timeline (not backend-only)
Start Date: Saturday, May 16, 2026

Project objective:
Deliver a secure, auditable, role-based medical relocation verification platform including frontend portals, backend services, fraud scoring service, operational dashboards, QA coverage, security hardening, and pilot deployment readiness.

Timeline structure:
This plan is organized into 8 weeks with parallel workstreams:
1. Product and Policy
2. Backend Platform
3. Frontend Applications
4. Fraud Engine (Python)
5. QA and Test Automation
6. DevOps and Infrastructure
7. Security and Compliance
8. Pilot Readiness and Go-Live

Week 1: May 16 to May 22, 2026
Theme: Foundation and architecture lock

Product and Policy:
- Finalize MVP scope and non-MVP boundaries.
- Confirm role-permission matrix for Corper, Doctor, Coordinator, Abuja Admin, and DG.
- Approve MCT lifecycle and decision policy thresholds.
- Document override governance and escalation authority.

Backend Platform:
- Scaffold Express + TypeScript service and baseline architecture.
- Set up PostgreSQL and Redis.
- Define Prisma schema and create first migration.
- Implement health checks and environment validation.

Frontend Applications:
- Scaffold React + TypeScript app with route structure for role-based portals.
- Define design tokens and reusable UI shell.
- Set up auth-aware routing skeleton and state management.

Fraud Engine:
- Scaffold FastAPI service and contract for score endpoint.
- Define input and output schema with Pydantic.
- Establish placeholder deterministic scoring interface.

QA and Test Automation:
- Configure test frameworks for frontend, backend, and Python service.
- Define initial test strategy and critical-path test cases.

DevOps and Infrastructure:
- Create Docker Compose for all services.
- Create initial CI workflows for lint, test, and build.

Security and Compliance:
- Define baseline controls: TLS policy, JWT policy, logging policy, secret handling.

Exit criteria for Week 1:
- Architecture and policy decisions are locked.
- All services scaffolded and runnable locally.
- CI baseline is active.

Week 2: May 23 to May 29, 2026
Theme: Core identity and access

Product and Policy:
- Validate role actions against real operational scenarios.
- Approve user onboarding flows per role.

Backend Platform:
- Implement authentication (login, token refresh, role claims).
- Add route guards and role-based authorization middleware.
- Add structured audit event framework.

Frontend Applications:
- Build login and session handling.
- Implement role-based navigation and protected route behavior.

Fraud Engine:
- Finalize score API handshake with backend.
- Add service-level validation and error model.

QA and Test Automation:
- Add auth integration tests and access-control test matrix.

DevOps and Infrastructure:
- Add staging environment variable templates and secrets placeholders.

Security and Compliance:
- Add rate limits on auth endpoints.
- Validate session and token expiry behavior.

Exit criteria for Week 2:
- End-to-end authenticated access works by role.
- Unauthorized access is consistently blocked and logged.

Week 3: May 30 to June 5, 2026
Theme: MCT and case lifecycle

Product and Policy:
- Validate business rules for one active case per corper.
- Approve lifecycle exception scenarios.

Backend Platform:
- Implement MCT creation, retrieval, and transition services.
- Enforce transition guards and actor constraints.
- Persist lifecycle events in audit logs.

Frontend Applications:
- Build Corper case status screens.
- Build Doctor basic case queue and case detail views.

Fraud Engine:
- Provide stub score responses for integrated lifecycle testing.

QA and Test Automation:
- Add unit and integration tests for lifecycle transitions and guards.

DevOps and Infrastructure:
- Add DB backup policy for staging and local restore test procedure.

Security and Compliance:
- Verify immutable behavior for audit records.

Exit criteria for Week 3:
- MCT lifecycle fully functional and policy-compliant.
- Corper and Doctor core flows are visible in UI.

Week 4: June 6 to June 12, 2026
Theme: Verification code workflow and notifications

Product and Policy:
- Lock one-time code policy, retry limits, and extension policy.

Backend Platform:
- Implement code generation, binding, validation, TTL expiry, retry lockout.
- Integrate Redis-backed code state and invalidation rules.
- Add SMS/email notification abstraction layer.

Frontend Applications:
- Build verification code entry flow for corpers.
- Build doctor report submission form with validation.

Fraud Engine:
- Add deterministic scoring signals and weighted breakdown output.

QA and Test Automation:
- Add integration tests for expiry, retries, invalidation, and edge cases.

DevOps and Infrastructure:
- Add background job scheduling for expirations and operational cleanup.

Security and Compliance:
- Harden anti-bruteforce controls and monitoring on verification routes.

Exit criteria for Week 4:
- Verification flow is secure, time-bound, and reliable.
- Notifications are triggered and logged.

Week 5: June 13 to June 19, 2026
Theme: Decisioning, dashboards, and governance features

Product and Policy:
- Finalize decision reason templates and explanation transparency requirements.
- Approve state override controls and threshold audit policy.

Backend Platform:
- Implement decision engine and reasoned outcome payloads.
- Implement coordinator overrides with mandatory reason and audit.
- Build Abuja admin dashboard APIs for national visibility.

Frontend Applications:
- Build Coordinator review queue and override interface.
- Build Abuja Admin dashboard tables/charts and explanation panel.
- Build DG escalated-case approval view.

Fraud Engine:
- Complete MVP ruleset implementation aligned to policy thresholds.

QA and Test Automation:
- Add end-to-end tests for review, escalation, override, and DG final action.

DevOps and Infrastructure:
- Add service-level monitoring dashboards and alert thresholds.

Security and Compliance:
- Add privileged action monitoring and anomaly alerts for admin abuse.

Exit criteria for Week 5:
- Governance workflows are implemented and auditable.
- Dashboard experience supports national operational control.

Week 6: June 20 to June 26, 2026
Theme: Hardening and system quality

Product and Policy:
- Conduct policy conformance review with edge-case walkthroughs.

Backend Platform:
- Standardize error handling and response contracts.
- Optimize queries and add indexes for high-frequency reads/writes.

Frontend Applications:
- Improve UX consistency, loading states, and failure handling.
- Complete accessibility pass for critical flows.

Fraud Engine:
- Tune rule performance and add trace fields for explanation quality.

QA and Test Automation:
- Raise test coverage for all critical modules.
- Run regression, performance smoke, and reliability checks.

DevOps and Infrastructure:
- Finalize CI/CD pipelines for staged deployment promotion.
- Add rollback procedures and deployment runbooks.

Security and Compliance:
- Run security checklist: dependency scan, secret scan, role misuse tests.

Exit criteria for Week 6:
- System is stable under expected pilot load and error conditions.
- All critical defects resolved or accepted with mitigation.

Week 7: June 27 to July 3, 2026
Theme: Pilot preparation and UAT

Product and Policy:
- Confirm pilot state operational process and escalation protocol.
- Produce user guidance for each role.

Backend Platform:
- Freeze feature scope and focus on bug fixes.

Frontend Applications:
- Complete role-specific UAT scripts and in-app guidance copy.

Fraud Engine:
- Validate signal outputs on pilot sample datasets.

QA and Test Automation:
- Execute user acceptance testing with scripted scenarios.
- Track defects, triage daily, and verify fixes.

DevOps and Infrastructure:
- Deploy to staging candidate environment mirroring production settings.

Security and Compliance:
- Perform final pre-pilot access review and credential rotation.

Exit criteria for Week 7:
- UAT sign-off achieved for core journeys.
- Pilot release candidate is approved.

Week 8: July 4 to July 10, 2026
Theme: Pilot launch readiness and operational handoff

Product and Policy:
- Confirm governance reporting cadence and incident communication workflow.

Backend Platform:
- Final production-readiness checks and launch checklist completion.

Frontend Applications:
- Final UI bug sweep and usability checks.

Fraud Engine:
- Enable production scoring with conservative threshold configuration.

QA and Test Automation:
- Execute final smoke tests in pre-production.

DevOps and Infrastructure:
- Promote release to production pilot environment.
- Activate monitoring and on-call support.

Security and Compliance:
- Final audit logging verification and compliance evidence pack.

Exit criteria for Week 8:
- Pilot goes live with observability, incident response, and rollback readiness.

Cross-workstream governance for every week:
- Monday: planning and priority lock.
- Daily: 20-minute standup with blocker escalation.
- Wednesday: midweek integration checkpoint.
- Friday: demo, risk review, and next-week lock.

Major milestones:
1. Architecture Locked: May 22, 2026
2. Identity and RBAC Complete: May 29, 2026
3. MCT Lifecycle Complete: June 5, 2026
4. Verification Workflow Complete: June 12, 2026
5. Governance and Dashboards Complete: June 19, 2026
6. Hardening Complete: June 26, 2026
7. UAT Sign-off: July 3, 2026
8. Pilot Launch Ready: July 10, 2026

Definition of done for full project timeline:
1. All role-based user journeys are implemented and tested.
2. MCT lifecycle and verification code workflow are policy-compliant.
3. Fraud scoring and decision explanations are available and auditable.
4. Admin governance, overrides, and DG final authority are operational.
5. Monitoring, CI/CD, and incident procedures are in place.
6. Security baseline controls are enforced and verified.
7. Pilot deployment is launch-ready with support runbooks.
