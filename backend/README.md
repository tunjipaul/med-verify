MedVerify Backend

Overview
- Express + TypeScript backend for NYSC Medical Verification System.
- Uses PostgreSQL via Prisma and Redis for auth/rate-limit/session-like token controls.

Prerequisites
- Node.js 20+
- PostgreSQL running locally or remotely
- Redis running locally or hosted (for example Upstash)

Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill values for:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `REFRESH_JWT_SECRET`
   - `VERIFICATION_CODE_SECRET`
3. Set `ALLOWED_ORIGINS` to your frontend URLs.
4. Security requirements:
   - `JWT_SECRET` and `REFRESH_JWT_SECRET` must be different.
   - `VERIFICATION_CODE_SECRET` must be a long random secret used for verification code hashing.
   - Keep `ALLOW_TEST_CODE_PLAINTEXT=false` outside automated test runs.

Install
- `npm install`

Database
1. Generate Prisma client:
   - `npx prisma generate`
2. Run migrations:
   - `npx prisma migrate dev --name init`
3. Seed data:
   - `npm run prisma:seed`

Run
- Development:
  - `npm run dev`
- Build:
  - `npm run build`
- Start built server:
  - `npm run start`

Testing
- Run integration tests:
  - `npm test`
- Watch mode:
  - `npm run test:watch`

Seeded Test Accounts
- Password for all seeded users: `Password123!`
- Accounts:
  - `admin@medverify.local`
  - `dg@medverify.local`
  - `coordinator@medverify.local`
  - `doctor@medverify.local`
  - `corper@medverify.local`

Health and Readiness
- Health:
  - `GET /api/v1/health`
- Dependency readiness:
  - `GET /api/v1/ready`

Swagger Docs
- Available only when `NODE_ENV !== production`.
- Local docs endpoints:
  - `GET /docs`
  - `GET /docs.json`

Security Baseline Implemented
- Helmet headers enabled
- Strict CORS allowlist from env
- Request ID middleware
- `trust proxy` enabled for deployment behind a reverse proxy/LB
- Rate limiting on:
  - `/api/v1/auth/login`
  - `/api/v1/auth/refresh`
  - `/api/v1/auth/logout`
  - `/api/v1/verification-codes/validate`
  - `/api/v1/verification-codes/extend`
- Refresh/logout CSRF protection (double-submit token):
  - Login returns `csrfToken`.
  - Clients must send `x-csrf-token` header matching CSRF cookie for:
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
- Verification codes are hashed at rest and are not returned in normal API responses.
- Request body size limits:
  - JSON: `100kb`
  - URL-encoded: `100kb`

Troubleshooting
- If Prisma client errors after schema changes:
  1. `npx prisma generate`
  2. restart server
- If migrations fail with shadow DB permissions:
  - grant `CREATEDB` to your DB user for local development.
