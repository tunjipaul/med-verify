# Frontend ↔ Backend ↔ Fraud Engine Integration

**Purpose:** Define how the three runtime components communicate: what calls what, with which auth, payloads, and failure rules.

**Integration model (MVP):** **Synchronous HTTP** — backend calls fraud engine inline during the case workflow; frontend **never** calls the fraud engine directly.

**Governed by:** `documentation/system-rules.md` (permissions, signals, decision bands).

**Companion doc:** `documentation/project-architecture.md` (organogram, roles, build order).

**Last updated:** 2026-05-21

---

## 1. Golden rules

| # | Rule |
|---|------|
| 1 | **Frontend talks only to Backend** (`/api/v1/*`). |
| 2 | **Backend talks to Fraud Engine** (`POST /v1/score`) on internal network. |
| 3 | **Fraud Engine is stateless** — no DB, no JWT from corpers; receives a snapshot, returns score. |
| 4 | **Decision authority stays in Backend** — engine advises; Node applies policy + MCT transitions. |
| 5 | **Corper responses are sanitized** — no `risk_score`, no `risk_breakdown`, no fraud signal names. |
| 6 | **Scoring is sync on the critical path** — after verification code validation (primary trigger). |
| 7 | **Engine failure = safe path** — never auto-approve; route to review + audit. |

---

## 2. System topology

```mermaid
flowchart TB
  subgraph browser["Browser"]
    FE["React frontend<br/>Vite · localhost:5173"]
  end

  subgraph api_layer["Backend API"]
    BE["Express + TypeScript<br/>localhost:5000/api/v1"]
    PG[(PostgreSQL)]
    RD[(Redis)]
  end

  subgraph ml_layer["Fraud Engine — planned"]
    AI["FastAPI Python<br/>localhost:8000/v1"]
  end

  FE -->|"HTTPS JSON<br/>JWT + cookies"| BE
  BE --> PG
  BE --> RD
  BE -->|"HTTP JSON<br/>X-Internal-Api-Key"| AI

  style AI stroke-dasharray: 5 5
```

**Legend:** Solid = implemented today. Dashed fraud engine = contract defined here; implementation pending.

### Network boundaries

| From | To | Exposure |
|------|-----|----------|
| Internet / user device | Frontend static host | Public |
| Browser | Backend API | Public HTTPS, CORS allowlist |
| Backend | PostgreSQL, Redis | Private |
| Backend | Fraud Engine | **Private only** (Docker network / VPC) |
| Browser | Fraud Engine | **Blocked** — must not be routable |

---

## 3. Why synchronous scoring (locked for MVP)

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│ Fraud Engine│
│  (wait)     │◀────│  (wait)     │◀────│  (fast)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

- Rule-based scoring completes in **milliseconds to low hundreds of ms**.
- Corper needs a **definitive next status** after entering `MV-` code (or clear “under review”).
- One code path, one audit trail, simpler failure handling than queues.

**Future:** Async queue for batch re-score or ML v2 — same `/v1/score` contract, different caller (worker). Critical path stays sync.

---

## 4. Communication matrix

| Caller | Callee | Protocol | Auth |
|--------|--------|----------|------|
| Corper browser | Frontend | HTTPS | — |
| Frontend | Backend | REST JSON | `Authorization: Bearer <access_token>`, cookies (`withCredentials`) |
| Backend | PostgreSQL | Prisma | `DATABASE_URL` |
| Backend | Redis | TCP | `REDIS_URL` |
| Backend | Fraud Engine | REST JSON | `X-Internal-Api-Key` (+ optional `X-Request-Id`) |
| Doctor portal (future) | Backend | REST JSON | Staff JWT |
| Fraud Engine | Backend | — | **None** (engine does not call back in MVP) |

---

## 5. Frontend → Backend

### 5.1 Base configuration

| Setting | Value |
|---------|--------|
| Base URL | `VITE_API_BASE_URL` → default `http://localhost:5000/api/v1` |
| Client | `frontend/src/lib/api.ts` (Axios) |
| Credentials | `withCredentials: true` (refresh / CSRF cookies when used) |
| Token storage | `localStorage.access_token` |
| 401 handling | Clear `access_token`; user re-authenticates |

### 5.2 Implemented corper endpoints (today)

| User action | Method | Path | Frontend module |
|-------------|--------|------|-----------------|
| Request activation OTP | `POST` | `/corper/activation/request-otp` | `lib/activation.ts` |
| Verify OTP → session | `POST` | `/corper/activation/verify-otp` | `lib/activation.ts` |
| List own cases | `GET` | `/mct-cases?limit=&page=` | `lib/mct.ts` |
| Validate verification code | `POST` | `/verification-codes/validate` | `lib/mct.ts` |
| Health (dev) | `GET` | `/health` | — |

**Note:** `POST /mct-cases` is **not** exposed on the public API. MCT cases are provisioned by **SYSTEM** (mobilization / batch jobs). Corpers only list cases and validate codes.

### 5.3 Planned corper endpoints (target)

| User action | Method | Path | Response notes |
|-------------|--------|------|----------------|
| Dashboard summary | `GET` | `/corper/me/case` or `GET /mct-cases` (filtered) | Status label only, no risk fields |
| Enter MCT reference (if separate from MV-) | `POST` | `/corper/case/bind` | TBD in updated product docs |
| Case timeline | `GET` | `/mct-cases/:id/timeline` | Corper-safe events only |
| Notifications | `GET` | `/corper/notifications` | — |

### 5.4 Standard request envelope

Frontend sends:

```http
POST /api/v1/verification-codes/validate HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
Cookie: refresh_token=... (when set)

{"codeValue":"MV-12345678"}
```

### 5.5 Standard success envelope (backend)

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

### 5.6 Standard error envelope

```json
{
  "success": false,
  "message": "Error description",
  "code": "VALIDATION_ERROR",
  "requestId": "uuid-from-x-request-id"
}
```

Frontend maps `message` to toasts (`sonner`); never surfaces internal codes to corpers in production UI.

### 5.7 Corper-visible vs hidden fields

| Field | Corper API | HQ / Coordinator API |
|-------|------------|----------------------|
| `status` | ✅ | ✅ |
| `statusLabel` (derived) | ✅ | ✅ |
| `outcomeReason` (sanitized) | ✅ | ✅ |
| `riskScore` | ❌ | ✅ |
| `riskBreakdown` | ❌ | ✅ |
| `recommended_band` | ❌ | ✅ |
| Fraud signal codes | ❌ | ✅ |

Implement via **DTO mappers** in backend controllers (`toCorperCaseView()`), not ad hoc deletes in frontend.

---

## 6. End-to-end sequence: corper validates verification code

This is the **primary trigger** for fraud scoring in MVP.

```mermaid
sequenceDiagram
  autonumber
  participant U as Corper (browser)
  participant FE as Frontend
  participant BE as Backend
  participant DB as PostgreSQL
  participant RD as Redis
  participant AI as Fraud Engine

  U->>FE: Enter MV- code, submit
  FE->>BE: POST /verification-codes/validate<br/>Bearer JWT
  BE->>BE: RBAC: role === CORPER
  BE->>DB: Load code (hash), case, corper
  alt Invalid / expired / wrong owner
    BE-->>FE: 400 VALIDATION_ERROR
    FE-->>U: Toast error
  else Valid
    BE->>DB: Mark code usedAt, audit VALIDATED
    BE->>DB: Load full case snapshot inputs
    BE->>BE: Build ScoreSnapshot (counts, flags)
    BE->>AI: POST /v1/score (sync, timeout 3s)
    alt Engine OK
      AI-->>BE: risk_score, risk_breakdown
      BE->>DB: Update MctCase riskScore, riskBreakdown, scoredAt
      BE->>BE: Decision policy → outcome band
      BE->>DB: Optional transition + CaseDecision + audit
    else Engine down / timeout
      BE->>DB: audit FRAUD_SCORE_FAILED
      BE->>BE: Force REVIEW_REQUIRED (no auto-approve)
    end
    BE-->>FE: 200 success (corper-safe body)
    FE-->>U: Toast success, refresh case UI
  end
```

### 6.1 Target corper response (after integration)

```json
{
  "success": true,
  "message": "Verification code accepted. Your case is under review.",
  "data": {
    "caseId": "uuid",
    "status": "UNDER_REVIEW",
    "statusLabel": "Under review",
    "nextSteps": "You will be notified when NYSC completes review."
  }
}
```

No score in payload.

---

## 7. Other frontend flows (no fraud engine)

### 7.1 Activation (no scoring)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BE as Backend
  participant RD as Redis

  FE->>BE: POST /corper/activation/request-otp
  BE->>RD: Store OTP hash (TTL 10 min)
  BE-->>FE: maskedPhone, devOtp (dev only)

  FE->>BE: POST /corper/activation/verify-otp
  BE->>RD: Verify OTP
  BE-->>FE: access token, user, csrfToken
  FE->>FE: localStorage + auth store
```

### 7.2 Doctor issues code (future UI → backend only)

```mermaid
sequenceDiagram
  participant DOC as Doctor portal
  participant BE as Backend
  participant DB as PostgreSQL

  DOC->>BE: POST /mct-cases/:id/verification-codes
  BE->>BE: RBAC: DOCTOR on case
  BE->>DB: Create VerificationCode (hashed MV-)
  BE-->>DOC: expiry metadata (plaintext MV- only in dev/test flags)
  Note over DOC: Doctor gives MV- to corper offline
```

Fraud engine is **not** called at code generation — only after corper validates (or optionally after report submit in a later phase).

---

## 8. Backend → Fraud Engine (sync contract)

### 8.1 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Dependencies OK (optional) |
| `POST` | `/v1/score` | Compute risk score |

### 8.2 Authentication

```http
POST /v1/score HTTP/1.1
Host: fraud-engine:8000
Content-Type: application/json
X-Internal-Api-Key: <FRAUD_ENGINE_API_KEY>
X-Request-Id: <same as backend request id>
```

| Variable (backend `.env`) | Description |
|---------------------------|-------------|
| `FRAUD_ENGINE_URL` | e.g. `http://localhost:8000` |
| `FRAUD_ENGINE_API_KEY` | Shared secret; rotated in prod |
| `FRAUD_ENGINE_TIMEOUT_MS` | Default `3000` |
| `FRAUD_ENGINE_ENABLED` | `false` → use stub client in dev |
| `FRAUD_ENGINE_SCORING_VERSION` | Default `rules-v1` |

### 8.3 Request body: `ScoreSnapshot`

Backend **assembles** this from Prisma + Redis. Engine **does not** query the database.

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "scoring_version": "rules-v1",
  "evaluated_at": "2026-05-21T14:30:00.000Z",
  "trigger": "VERIFICATION_CODE_VALIDATED",
  "case": {
    "mct_case_id": "uuid",
    "status": "CREATED",
    "referral_tag": false,
    "identity_match": "EXACT"
  },
  "corper": {
    "corper_id": "uuid",
    "posted_state": "Lagos",
    "current_state": "Lagos",
    "phone_last4": "0001"
  },
  "hospital": {
    "hospital_id": "uuid",
    "name": "Lagos University Teaching Hospital",
    "state": "Lagos",
    "tier": "TIER_1"
  },
  "doctor": {
    "doctor_id": "uuid",
    "mdcn_number": "MDCN-XXXX"
  },
  "metrics": {
    "hospital_cases_last_60_minutes": 12,
    "doctor_cases_last_24_hours": 4,
    "corper_verification_failed_attempts": 0,
    "phone_reuse_count": 0
  },
  "flags": {
    "geo_mismatch": false,
    "diagnosis_cluster_hit": false,
    "referral_tag": false,
    "identity_partial_match": false,
    "identity_no_match": false,
    "tier2_hospital": false
  },
  "report": {
    "present": false,
    "diagnosis_code": null,
    "submitted_at": null
  }
}
```

#### Field sources (backend responsibility)

| Snapshot field | Source |
|----------------|--------|
| `identity_match` | `MctCase.identityMatch` / activation outcome |
| `geo_mismatch` | `corper.postedState !== hospital.state` |
| `tier2_hospital` | `hospital.tier === TIER_2` |
| `hospital_cases_last_60_minutes` | `COUNT(mct_cases)` + Redis sliding window cache |
| `doctor_cases_last_24_hours` | `COUNT` by `doctorId` + time filter |
| `phone_reuse_count` | Distinct corpers sharing phone hash (policy threshold) |
| `referral_tag` | `MctCase.referralTag` |

### 8.4 Response body: `ScoreResult`

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "scoring_version": "rules-v1",
  "risk_score": 7,
  "risk_breakdown": [
    {
      "signal": "TIER2_HOSPITAL",
      "weight": 2,
      "reason": "Hospital is Tier 2 (elevated baseline risk)"
    },
    {
      "signal": "REFERRAL_TAG",
      "weight": 1,
      "reason": "Case marked as referral"
    }
  ],
  "recommended_band": "REVIEW_REQUIRED",
  "engine_latency_ms": 18
}
```

| Response field | Used by |
|----------------|---------|
| `risk_score` | Persisted on `MctCase`, decision service |
| `risk_breakdown` | Persisted JSON on `MctCase`, HQ UI, audit |
| `recommended_band` | Advisory only; backend may override |
| `engine_latency_ms` | Audit / metrics |

### 8.5 Signal weights (`rules-v1`)

Aligned with `system-rules.md`:

| Signal | Weight |
|--------|--------|
| `GEO_MISMATCH` | +2 |
| `TIME_BURST_HOSPITAL` | +3 |
| `DOCTOR_THROUGHPUT_SPIKE` | +3 |
| `DIAGNOSIS_CLUSTERING` | +2 |
| `PHONE_REUSE` | +2 |
| `REFERRAL_TAG` | +1 |
| `TIER2_HOSPITAL` | +2 |
| `IDENTITY_PARTIAL_MATCH` | +2 |
| `IDENTITY_NO_MATCH` | +5 |
| `CODE_FAILED_ATTEMPTS_GT2` | +3 |

`TIME_BURST_HOSPITAL` thresholds (example):

| Cases / hour | Effect |
|--------------|--------|
| 0–20 | No signal |
| 21–50 | Watch (+1 optional) |
| 51–100 | Alert (+3) |
| 100+ | Lockdown (+5 policy) |

Exact bands live in fraud-engine `rules/rules_v1.py` — versioned with `scoring_version`.

### 8.6 HTTP status handling (backend client)

| Engine response | Backend action |
|-----------------|----------------|
| `200` + valid body | Persist score, run decision |
| `400` | Log, treat as failure → review path |
| `401` | Config alert, failure → review path |
| `408` / timeout | `FRAUD_SCORE_FAILED` audit → review path |
| `5xx` | Retry **0 times** on user path (optional 1 retry off critical path) → review path |

**Policy:** On any failure, **never** `AUTO_APPROVE`.

---

## 9. Backend internal pipeline (after score returns)

```mermaid
flowchart TD
  A[validateVerificationCode success] --> B[riskScoringService.scoreCase]
  B --> C{FraudEngineClient.score}
  C -->|OK| D[Persist riskScore + riskBreakdown]
  C -->|Fail| E[Set review-only flag / default score null]
  D --> F[decisionService.applySystemDecision]
  E --> F
  F --> G{Policy guards}
  G -->|identity NO_MATCH| H[Min band: REVIEW_REQUIRED]
  G -->|referralTag| I[Min band: REVIEW_REQUIRED]
  G -->|ambiguous high reject| J[Prefer REVIEW over REJECT]
  G -->|score 0-4| K[AUTO_APPROVE candidate]
  H --> L[Write CaseDecision + audit]
  I --> L
  J --> L
  K --> L
  L --> M[Optional MctStatus transition]
  M --> N[Return corper-safe DTO]
```

### 9.1 Decision bands (backend authoritative)

| `risk_score` | Default outcome |
|--------------|-----------------|
| 0–4 | `AUTO_APPROVE` |
| 5–9 | `REVIEW_REQUIRED` |
| 10–14 | `ESCALATE` |
| 15+ | `AUTO_REJECT` (unless policy guard → `REVIEW_REQUIRED`) |

Existing helper: `deriveDraftOutcome()` in `backend/src/services/decisions.service.ts` — extend with policy guards above.

### 9.2 Suggested backend modules (to implement)

```
backend/src/
  lib/
    fraud-engine.client.ts       # interface + Http + Stub
  services/
    risk-scoring.service.ts      # build snapshot, call client, persist
    risk-snapshot.builder.ts     # Prisma/Redis → ScoreSnapshot
    decisions.service.ts         # existing — consume score
  types/
    fraud-engine.ts              # ScoreSnapshot, ScoreResult Zod schemas
```

Hook point:

```ts
// verification-codes.service.ts — after successful validate
await riskScoringService.scoreAndDecide({
  mctCaseId: code.mctCaseId,
  trigger: "VERIFICATION_CODE_VALIDATED",
  actor: { userId, role: Role.SYSTEM },
});
```

---

## 10. Fraud engine service (Python) responsibilities

### 10.1 Does

- Validate `ScoreSnapshot` (Pydantic)
- Apply deterministic `rules-v1` weights
- Return `ScoreResult` with breakdown text for HQ
- Expose `/health`, `/v1/score`
- Log `request_id` (no long-term PII storage)

### 10.2 Does not

- Connect to PostgreSQL or Redis
- Issue JWTs or call frontend
- Transition MCT status
- Send SMS
- Store corper NIN, full phone, or plaintext `MV-` codes

### 10.3 Suggested layout

```
fraud-engine/
  app/
    main.py
    api/v1/score.py
    core/config.py
    rules/rules_v1.py
    schemas/snapshot.py
    schemas/result.py
  tests/test_rules_v1.py
  Dockerfile
  requirements.txt
```

---

## 11. Authentication & trust summary

```mermaid
flowchart LR
  subgraph public_trust["Public trust boundary"]
    FE[Frontend]
    BE[Backend]
  end

  subgraph internal_trust["Internal trust boundary"]
    BE2[Backend]
    AI[Fraud Engine]
  end

  FE -->|"User JWT"| BE
  BE2 -->|"Service API key"| AI
```

| Token | Issuer | Consumer | Lifetime |
|-------|--------|----------|----------|
| Access JWT | Backend auth | Frontend → Backend | ~15m |
| Refresh token | Backend (httpOnly cookie) | Backend refresh route | ~7d |
| OTP | Backend activation | Corper activation only | 10m |
| Internal API key | DevOps secret | Backend → Fraud only | Rotated |

---

## 12. Idempotency & duplicate scoring

| Scenario | Behavior |
|----------|----------|
| Corper double-clicks validate | Backend should use transaction; code already `usedAt` → 400 |
| Same case scored twice in 5 min | Return existing `riskScore` if `scoredAt` + same `trigger` (optional) |
| Coordinator requests re-score | New `request_id`, new audit event, update `riskScore` |

Store on `MctCase` (existing columns):

- `riskScore`
- `riskBreakdown` (JSON)
- Add when implementing: `scoredAt`, `scoringVersion`, `lastScoreRequestId`

---

## 13. Observability

| ID | Propagation |
|----|-------------|
| `X-Request-Id` | Frontend (optional) → Backend → Fraud Engine |
| `mct_case_id` | All audit logs for case |

Audit events to add:

| Event | When |
|-------|------|
| `FRAUD_SCORE_REQUESTED` | Before HTTP call |
| `FRAUD_SCORE_COMPLETED` | Success with score summary |
| `FRAUD_SCORE_FAILED` | Timeout / 5xx / invalid body |
| `DECISION_GENERATED` | Existing — include `request_id` |

Metrics (future): `fraud_score_latency_ms`, `fraud_score_errors_total`.

---

## 14. Local development

### 14.1 Processes

| Service | Port | Command |
|---------|------|---------|
| Frontend | 5173 | `cd frontend && npm run dev` |
| Backend | 5000 | `cd backend && npm run dev` |
| PostgreSQL | 5432 | Docker / local |
| Redis | 6379 | Docker / local |
| Fraud Engine | 8000 | `cd fraud-engine && uvicorn app.main:app --reload` |

### 14.2 Stub mode (backend without Python)

```env
FRAUD_ENGINE_ENABLED=false
```

`StubFraudEngineClient` returns `{ risk_score: 0, risk_breakdown: [], recommended_band: "AUTO_APPROVE" }` only in **development** — still run decision guards (identity, referral).

### 14.3 Example curl (engine direct — dev only)

```bash
curl -s -X POST http://localhost:8000/v1/score \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: dev-key" \
  -d @documentation/examples/score-snapshot-minimal.json
```

---

## 15. Implementation status

| Piece | Status |
|-------|--------|
| Frontend → Backend activation | ✅ |
| Frontend → Backend list cases | ✅ |
| Frontend → Backend validate code | ✅ |
| Backend → Fraud sync score | 📋 Specified here, not coded |
| Backend decision after score | 📋 Partial (`decisions.service` uses DB score only) |
| Fraud Engine FastAPI service | 📋 Not in repo |
| Corper-safe response DTOs | 📋 Partial |
| Doctor portal → generate code | 🔧 Backend only |

---

## 16. Implementation checklist (ordered)

1. Add Zod/TS types + `FraudEngineClient` (HTTP + stub) and env vars.
2. Implement `risk-snapshot.builder.ts` (metrics from DB/Redis).
3. Implement `risk-scoring.service.ts` (call engine, persist, audit).
4. Wire into `validateVerificationCode` success path.
5. Extend `decisions.service` policy guards; system actor transitions.
6. Add `toCorperCaseView()` — strip risk fields from corper routes.
7. Scaffold `fraud-engine/` with `rules-v1` matching weights table.
8. Integration test: validate code → mock engine → case has score → corper GET has no score.
9. Document OpenAPI for `/v1/score` in fraud-engine README.
10. Update `project-architecture.md` implementation matrix when done.

---

## 17. Quick reference diagram (all three)

```text
                    ┌──────────────────────────────────────┐
                    │           CORPER BROWSER              │
                    │  Landing · Activation · Dashboard     │
                    └─────────────────┬────────────────────┘
                                      │ REST + JWT
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (Express)                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ Activation  │  │ MCT lifecycle│  │ Verification│  │ Decision +     │ │
│  │ OTP / JWT   │  │ + audit      │  │ codes MV-   │  │ RBAC + audit   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └───────▲────────┘ │
│         │                │                 │                  │          │
│         ▼                ▼                 │    sync POST     │          │
│     ┌────────────────────────────────┐    │    /v1/score     │          │
│     │ PostgreSQL + Redis             │◀───┴──────────────────┼──────────┤
│     └────────────────────────────────┘                       │          │
└────────────────────────────────────────────────────────────│──────────┘
                                                               │
                                      ┌────────────────────────┘
                                      ▼
                    ┌──────────────────────────────────────┐
                    │      FRAUD ENGINE (FastAPI)           │
                    │  Stateless rules-v1 · score + breakdown │
                    └──────────────────────────────────────┘
```

---

## 18. Related files

| Path | Role |
|------|------|
| `documentation/system-rules.md` | Permissions, weights, bands |
| `documentation/project-architecture.md` | Full system map |
| `documentation/technical-documentation.md` | Stack per service |
| `frontend/src/lib/api.ts` | HTTP client |
| `frontend/src/lib/activation.ts` | Activation API |
| `frontend/src/lib/mct.ts` | Cases + validate code |
| `backend/src/services/verification-codes.service.ts` | Code validate hook point |
| `backend/src/services/decisions.service.ts` | Outcome from score |

---

*When product docs define MCT token entry vs `MV-` code separately, update §5.3 and §6 without changing the sync scoring model.*
