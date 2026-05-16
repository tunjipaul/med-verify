# Backend Upgrade Plan (Toward 1M-User Readiness)

Last Updated: 2026-05-16
Scope: `medverify/backend`

## Objective
Upgrade the current backend from strong MVP readiness to high-scale production readiness with clear milestones, measurable SLOs, and operational proof.

## Current Baseline
- Core backend features implemented (auth, RBAC, MCT flow, verification flow, decisions, audit).
- CI/build/tests in place.
- Security hardening improved (CSRF on refresh/logout, secret separation, hashed verification codes at rest, stricter RBAC).
- Missing large-scale architecture, reliability, and observability layers.

## Target Definition (Done Criteria)
- Sustains agreed peak traffic with error budget intact.
- Meets SLOs for latency/availability under load and failure scenarios.
- Has safe deployment controls, rollback, and incident response.
- Has continuous security and dependency risk controls.

---

## Phase 1: Foundations and SLO Contract (Week 1)
Status: Not Started

### Deliverables
- Define service SLOs and traffic model:
  - Peak QPS target
  - P95/P99 latency
  - Availability target
  - Error budget
  - Cost ceiling per request/user
- Define critical user journeys and API critical path list.
- Define production and staging topology.

### Implementation Tasks
1. Create SLO document in `documentation/`.
2. Add API endpoint tiering (`critical`, `important`, `best-effort`).
3. Add performance budgets to PR checklist.

### Acceptance Criteria
- SLOs are approved and versioned.
- Every critical endpoint has latency/error targets.

---

## Phase 2: Edge, Ingress, and Runtime Platform (Weeks 2-3)
Status: Not Started

### Deliverables
- Deployment behind CDN/WAF/API gateway.
- Stateless horizontally scalable runtime.
- Autoscaling policy based on meaningful signals.

### Implementation Tasks
1. Infrastructure:
   - Add CDN + WAF + DDoS protection.
   - Add gateway-level rate limits and bot mitigation.
2. Runtime:
   - Containerize backend if not already.
   - Deploy multiple replicas in orchestrator (Kubernetes/ECS).
3. Autoscaling:
   - Scale on request latency, error rate, and queue depth.
4. Networking:
   - Confirm proxy trust chain and forwarded header policy.

### Acceptance Criteria
- Multi-instance active deployment in staging.
- Zero-downtime rolling deploys verified.
- Autoscaling test demonstrates stable latency under burst.

---

## Phase 3: Data and Caching Scale Path (Weeks 3-5)
Status: Not Started

### Deliverables
- Connection and read-scaling strategy.
- Redis usage elevated to production-grade caching plan.
- Initial partitioning/sharding plan defined.

### Implementation Tasks
1. PostgreSQL:
   - Add PgBouncer pooling.
   - Add read replicas for read-heavy paths.
   - Review/add indexes based on query profile.
2. Data model strategy:
   - Define shard key strategy (user/tenant/state driven).
   - Document migration path to sharding/partitioning.
3. Caching:
   - Introduce cache-aside for top hot reads.
   - Define invalidation strategy (event-driven where needed).
4. Load safety:
   - Add query timeouts and slow-query alerting.

### Acceptance Criteria
- Read-heavy endpoints show measurable latency reduction.
- DB connection saturation eliminated under target load tests.
- Sharding/partition strategy documented and approved.

---

## Phase 4: Async Workflows and Consistency Controls (Weeks 5-7)
Status: Not Started

### Deliverables
- Event bus and background worker architecture.
- Reliable event publishing with outbox pattern.
- Idempotency on mutating APIs.

### Implementation Tasks
1. Introduce queue/event platform (Kafka/Pulsar equivalent).
2. Implement Outbox pattern for critical domain events.
3. Move non-critical synchronous work to workers.
4. Add idempotency key middleware for mutation endpoints.
5. Add retry policies with jitter and bounded attempts.

### Acceptance Criteria
- Critical writes are idempotent and retry-safe.
- Event loss tests pass under broker disruption simulation.
- Request path latency reduced for async-eligible flows.

---

## Phase 5: Observability, Reliability, and Ops (Weeks 6-8)
Status: Not Started

### Deliverables
- Full telemetry stack and actionable alerts.
- Runbooks and incident response workflow.
- Chaos/failure validation of resilience.

### Implementation Tasks
1. Instrument backend with OpenTelemetry.
2. Export metrics/logs/traces to:
   - Prometheus
   - Grafana
   - Jaeger/Tempo
   - Loki/ELK
3. Build dashboards for golden signals:
   - latency
   - traffic
   - errors
   - saturation
4. Configure alert routing and on-call playbooks.
5. Run chaos drills (DB partial outage, Redis outage, pod kills).

### Acceptance Criteria
- Alerting detects and routes priority incidents.
- Runbooks used successfully in game-day drills.
- System remains within SLO during controlled failure tests.

---

## Phase 6: Security and Delivery Maturity (Weeks 7-9)
Status: Not Started

### Deliverables
- Continuous security controls in CI/CD.
- Progressive delivery + safe rollback patterns.

### Implementation Tasks
1. CI/CD:
   - Enforce dependency/security scans with fail thresholds.
   - Add secret scanning and policy checks.
2. Delivery:
   - Canary/blue-green rollout support.
   - Feature flags for risky changes.
   - One-click rollback and verification script.
3. Access/security:
   - IAM least privilege review.
   - Secret rotation plan and audit evidence.

### Acceptance Criteria
- Security gates block non-compliant builds.
- Canary deploy + rollback validated in staging.
- Secrets rotation runbook tested.

---

## Phase 7: Scale Validation and Production Readiness (Weeks 9-10)
Status: Not Started

### Deliverables
- Load test evidence at and above expected peak.
- Formal readiness sign-off.

### Implementation Tasks
1. Load and soak testing with k6/Locust:
   - 1x, 1.5x, 2x expected peak
   - long-running soak
2. Profile hotspots and tune bottlenecks.
3. Execute production checklist and attach evidence.
4. Final go/no-go review.

### Acceptance Criteria
- SLOs met at agreed load levels.
- Error budget and rollback criteria satisfied.
- Sign-off documents completed.

---

## Cross-Cutting Engineering Rules
- No new synchronous dependency in request path without timeout, retry policy, and circuit-breaker behavior.
- Every mutating endpoint must be idempotent or explicitly justified.
- Every production change must support rollback.
- Every critical service must emit golden-signal telemetry.

## Suggested Work Breakdown (Execution Order)
1. SLO contract + topology decisions
2. Edge/gateway/runtime autoscaling
3. DB pooling/read-scaling + cache strategy
4. Event/outbox/idempotency
5. Observability and chaos drills
6. Delivery/security gates
7. Load evidence and final sign-off

## Tracking Template
Use this section to update progress weekly.

| Workstream | Owner | Status | ETA | Risks | Notes |
|---|---|---|---|---|---|
| SLO + Capacity Model |  | Not Started |  |  |  |
| Edge + Gateway |  | Not Started |  |  |  |
| Runtime + Autoscaling |  | Not Started |  |  |  |
| DB + Caching |  | Not Started |  |  |  |
| Events + Outbox |  | Not Started |  |  |  |
| Observability + Alerts |  | Not Started |  |  |  |
| Security + CI Gates |  | Not Started |  |  |  |
| Load Test + Sign-Off |  | Not Started |  |  |  |
