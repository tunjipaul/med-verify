# NYSC Medical Verification System - Technical Documentation

This document defines the implementation roadmap and technical architecture for the NYSC Medical Verification System.

## 1. Project Structure Overview

The platform is organized into three primary services:

- Frontend: React + TypeScript user interfaces
- Backend API: Express.js + TypeScript business logic and data access
- Fraud Engine: Python service for rule-based risk scoring (and future ML extensions)

## 2. Phase 0 - Foundation and Planning

Before implementation, complete these artifacts:

- Entity Relationship Diagram (ERD): Corpers, MCT Cases, Hospitals, Doctors, VerificationCodes, RiskSignals, Decisions, AuditLogs
- API Contract: endpoint definitions with request and response schemas
- State Machine Diagram: MCT lifecycle (`CREATED -> UNDER_REVIEW -> APPROVED/REJECTED -> CLOSED`)
- Role Permission Matrix: role-based read and write privileges

Recommended tools:

- Diagrams: draw.io or Excalidraw
- Documentation: Notion or Confluence
- API Spec: OpenAPI/Swagger

## 3. Backend (Express.js + TypeScript)

### 3.1 Core Stack

- Runtime: Node.js 20 LTS
- Framework: Express.js
- Language: TypeScript (`strict` enabled)
- ORM: Prisma
- Database: PostgreSQL
- Authentication: JWT (`jsonwebtoken`) + `bcrypt` for credential hashing
- Cache: Redis (`ioredis`) for verification-code TTL
- Validation: Zod
- Config: `dotenv` + `envalid`

Optional session layer:

- Use `express-session` only if stateful session requirements exist.
- Default recommendation is stateless JWT for API requests.

### 3.2 Key Libraries

- `express-rate-limit` for endpoint throttling and code-entry lockout protection
- `helmet` for secure HTTP headers
- `cors` with strict environment-based origin allowlist
- `morgan` for request logging
- `winston` for structured app logs
- `uuid` for MCT identifiers
- `date-fns` for expiry and time calculations
- `node-cron` for scheduled maintenance jobs
- `axios` (or `node-fetch`) for external service calls
- `swagger-jsdoc` + `swagger-ui-express` for API documentation

### 3.3 Recommended Architecture

Use layered architecture:

- `routes/` for route mappings
- `controllers/` for HTTP handlers
- `services/` for business logic
- `repositories/` for Prisma data access
- `middleware/` for auth and role policies
- `jobs/` for scheduled tasks
- `types/` for shared TypeScript contracts

### 3.4 Core Modules

1. Auth module: login and token issuance by role
2. MCT module: case creation, transitions, lifecycle queries
3. Verification Code module: generation, binding, validation, expiry
4. Hospital Registry module: onboarding, accreditation tiering
5. Doctor Registry module: identity linkage and throughput metrics
6. Risk Engine integration module: call Python scoring service
7. Decision Engine module: score-to-outcome routing
8. Audit Log module: append-only event ledger
9. Notification module: SMS/email event messaging

### 3.5 Database Design Notes

- Include `created_at`, `updated_at`, `deleted_at` where soft-delete is needed
- Persist `risk_score` and `risk_breakdown` (JSONB) on MCT case records
- Keep audit logs insert-only
- Consider PostgreSQL row-level security for high-sensitivity data domains

## 4. Frontend (React + TypeScript)

### 4.1 Core Stack

- React 18
- TypeScript (`strict`)
- Vite
- React Router v6
- Zustand for client state
- TanStack Query for server-state and caching
- React Hook Form + Zod for forms
- Tailwind CSS
- shadcn/ui + Radix primitives
- Axios with interceptors
- Recharts for analytics views
- Framer Motion for constrained UI transitions

### 4.2 Supporting Libraries

- `react-hot-toast` or `sonner` for alerts
- `date-fns` for date formatting
- `clsx` + `tailwind-merge` for class composition
- `lucide-react` icons
- `@tanstack/react-table` for operational tables

### 4.3 Role-Based Views

- Corper Portal: case status, code entry, outcomes
- Doctor Portal: diagnosis capture and caseload
- Hospital Admin Portal: doctor administration and metrics
- State Coordinator Dashboard: flagged-case review and overrides
- Abuja Admin Dashboard: national monitoring and explanation panel
- DG Approval View: escalated final decisions

### 4.4 Frontend Structure

- `pages/` role-focused routes
- `components/` shared UI
- `features/` feature modules with co-located hooks
- `hooks/` domain hooks (`useAuth`, `useMCT`, etc.)
- `lib/` API client, query setup, utilities
- `types/` shared generated contracts
- `stores/` Zustand stores

## 5. Fraud Engine (Python)

### 5.1 Core Stack

- Python 3.11+
- FastAPI
- Pydantic v2
- Optional async queue: Celery + Redis
- NumPy and Pandas for aggregation logic where needed

### 5.2 MVP Scope (Rule-Based)

MVP is deterministic rule scoring, not machine learning.

- Expose `POST /score` endpoint
- Validate input with Pydantic schemas
- Return score and signal breakdown

Example signal checks:

- Geo mismatch between posting and reporting location
- Hospital time-burst counts in rolling windows
- Doctor throughput spikes
- Diagnosis clustering across recent cases

### 5.3 Post-MVP ML Roadmap

After at least 18 months of reliable labeled data:

- `scikit-learn` for anomaly detection
- `XGBoost` or `LightGBM` for calibrated risk prediction
- `NetworkX` for fraud-ring graph analysis
- `spaCy` or HuggingFace pipelines for clinical note patterning
- `MLflow` for model lifecycle management
- `SHAP` for explainability

Keep ML as a separate service boundary from MVP scoring.

## 6. Infrastructure and DevOps

### 6.1 Development Tooling

- Docker + Docker Compose for full local stack
- ESLint + Prettier for TypeScript
- Ruff + Black for Python
- Husky + lint-staged for pre-commit quality gates
- Conventional Commits for structured history

### 6.2 Testing Strategy

- Backend: Vitest or Jest + Supertest
- Frontend: Vitest + React Testing Library
- Python: pytest + pytest-asyncio
- End-to-end: Playwright

### 6.3 Deployment Notes

- Cloud options: AWS or Azure with region selection based on data-governance requirements
- Container runtime: AWS ECS (simpler ops) or Kubernetes (advanced ops)
- Managed database: PostgreSQL (for example AWS RDS)
- Managed cache: Redis (for example ElastiCache)
- Object storage: S3 for exports and generated artifacts
- CDN: CloudFront for frontend delivery
- SMS providers: Termii or Africa's Talking

## 7. CI/CD

- GitHub Actions for build-test-deploy automation
- Separate pipelines for frontend, backend, and Python services
- Environment promotion flow: `development -> staging -> production`

## 8. Security Baseline (Mandatory)

- TLS/HTTPS on all environments
- Short-lived access tokens (for example 15 minutes) with secure refresh strategy
- Rate limiting on auth and verification endpoints
- Strict server-side validation of all inputs
- Parameterized queries through Prisma
- Append-only audit integrity controls
- Centralized secrets management (AWS Secrets Manager, Vault, or equivalent)
- Strict CORS allowlists
- Route-level role authorization on every protected endpoint

## 9. Recommended Build Order

1. Set up monorepo and service boundaries
2. Define Prisma schema and run initial migrations
3. Build authentication and authorization
4. Implement MCT lifecycle state machine
5. Implement verification code subsystem with Redis TTL
6. Build Python rule-scoring endpoint
7. Integrate decision engine in backend
8. Build Abuja admin dashboard
9. Build corper and doctor portals
10. Implement audit and explanation module
11. Implement coordinator override controls
12. Complete testing, security review, and staging release
