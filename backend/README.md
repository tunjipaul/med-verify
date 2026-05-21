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
   - `npm run prisma:seed` (staff roles + one sample corper)
   - `npm run prisma:seed:lagos` (bulk Lagos mobilized corpers — dev/staging only)

### Lagos pilot bulk corpers (dev/staging)

Pre-provisions mobilized corpers the way NYSC would import before portal activation.

```bash
cd backend
npm run prisma:seed          # hospitals, doctors, admin accounts (run once)
npm run prisma:seed:lagos    # 1000 Lagos corpers (default)
```

Environment options:

| Variable | Default | Description |
|----------|---------|-------------|
| `LAGOS_CORPER_COUNT` | `1000` | Number of corpers to upsert (max 50000) |
| `LAGOS_CORPER_YEAR` | `2026` | Call-up year segment in `NYSC-LAG-{year}-{serial}` |
| `LAGOS_CORPER_PURGE` | `false` | Set to `true` to delete existing `NYSC-LAG-*` corpers (and their cases) before re-seeding |

Examples:

```bash
LAGOS_CORPER_COUNT=1000 npm run prisma:seed:lagos
LAGOS_CORPER_PURGE=true npm run prisma:seed:lagos
```

Each generated corper includes:

| Field | Example (serial 1) |
|-------|---------------------|
| Call-up | `NYSC-LAG-2026-000001` |
| NIN | `20000000001` |
| Phone | `08080000001` |
| State | `Lagos` (posted + current) |
| Mobilized | `true` |
| Email | `corper.lag.000001@medverify.local` |
| Password | `Password123!` (dev only; activation will use OTP later) |

After seeding, see `prisma/data/lagos-corpers-manifest.json` for sample credentials.

Export all corper details to JSON + CSV (for random/manual testing):

```bash
npm run export:lagos-corpers
# or: LAGOS_CORPER_COUNT=1000 npm run export:lagos-corpers
```

Outputs:

- `prisma/data/lagos-corpers-full.json` — all corpers in `corpers` array
- `prisma/data/lagos-corpers-full.csv` — same data for Excel/Sheets

**Do not run `prisma:seed:lagos` in production.**

### Corper portal activation (OTP)

Public endpoints:

- `POST /api/v1/corper/activation/request-otp` — body: `{ "callUpNumber", "nin" }`
- `POST /api/v1/corper/activation/verify-otp` — body: `{ "callUpNumber", "otp" }`

Dev-only: set `ALLOW_DEV_OTP_PLAINTEXT=true` in `.env` (never in production). The API may return `devOtp` and log it to the server console for testing without SMS.

Example (Lagos seed #1):

- Call-up: `NYSC-LAG-2026-000001` or `NYSC/LAG/2026/000001`
- NIN: `20000000001`

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
