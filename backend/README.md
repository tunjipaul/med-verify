# MedVerify Backend

Express + TypeScript API for the NYSC Medical Verification System. Uses **PostgreSQL** (Prisma) and **Redis** (OTP, rate limits, sessions).

Default URL: **http://localhost:5000**  
API base path: **/api/v1**

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | LTS recommended |
| **PostgreSQL** | Local install, Docker, or remote (e.g. Neon) |
| **Redis** | Local (`redis://127.0.0.1:6379`) or hosted (e.g. Upstash) |

---

## Quick start (run the server)

From the repo root:

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — at minimum DATABASE_URL, REDIS_URL, JWT secrets
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

You should see: `Server running on http://localhost:5000`

**Check it works:**

```bash
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/ready
```

**API docs (development only):** open [http://localhost:5000/docs](http://localhost:5000/docs)

---

## Environment (`.env`)

1. Copy `.env.example` to `.env`.
2. Set these values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing (24+ chars in production) |
| `REFRESH_JWT_SECRET` | Refresh token signing (**must differ** from `JWT_SECRET`) |
| `VERIFICATION_CODE_SECRET` | HMAC for verification codes / activation OTP |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs (include your Vite port, e.g. `http://localhost:5173`, `http://localhost:5174`) |
| `ALLOW_DEV_OTP_PLAINTEXT` | `true` locally to show activation OTP in API + console (**never** in production) |

Optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | `production` disables Swagger |
| `ALLOW_TEST_CODE_PLAINTEXT` | `false` | `true` only for automated tests |

---

## Database

```bash
cd backend

# After schema changes
npx prisma generate
npx prisma migrate dev

# Base seed: hospitals, doctors, staff users, sample corper
npm run prisma:seed

# Optional: 1000 Lagos mobilized corpers (dev/staging only)
npm run prisma:seed:lagos
```

**Inspect data:** `npx prisma studio`

### Lagos bulk corpers (dev/staging)

Pre-provisions mobilized corpers before portal activation.

| Variable | Default | Description |
|----------|---------|-------------|
| `LAGOS_CORPER_COUNT` | `1000` | Number to upsert (max 50000) |
| `LAGOS_CORPER_YEAR` | `2026` | Call-up year in `NYSC-LAG-{year}-{serial}` |
| `LAGOS_CORPER_PURGE` | `false` | `true` deletes existing `NYSC-LAG-*` corpers (and cases) before re-seed |

```bash
npm run prisma:seed
LAGOS_CORPER_COUNT=1000 npm run prisma:seed:lagos
# LAGOS_CORPER_PURGE=true npm run prisma:seed:lagos
```

Example Lagos corper #1 (after seed):

| Field | Value |
|-------|--------|
| Call-up | `NYSC-LAG-2026-000001` or `NYSC/LAG/2026/000001` |
| NIN | `20000000001` |
| Phone | `08080000001` |

Export full Lagos list:

```bash
npm run export:lagos-corpers
# → prisma/data/lagos-corpers-full.json
# → prisma/data/lagos-corpers-full.csv
```

**Do not run `prisma:seed:lagos` in production.**

---

## Run commands

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start dev server with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled `dist/server.js` (production-style) |

---

## Testing

Integration tests use **Vitest** + **Supertest**. They need a real `.env` with `DATABASE_URL` and `REDIS_URL` (same as dev).

```bash
cd backend

# One-off full run
npm test

# Watch mode while developing
npm run test:watch
```

Tests set `ALLOW_TEST_CODE_PLAINTEXT` and `ALLOW_DEV_OTP_PLAINTEXT` automatically via `tests/setup.ts`.

**Before first test run:** migrations applied + `npm run prisma:seed` recommended.

**Current suite:** auth, corper activation, MCT cases, verification codes, decisions, audit integrity (32 tests).

---

## Manual API testing (without frontend)

### Staff login (email + password)

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"doctor@medverify.local\",\"password\":\"Password123!\"}"
```

Use the returned `token` as `Authorization: Bearer <token>`.

### Corper activation (call-up + NIN + OTP)

Requires `ALLOW_DEV_OTP_PLAINTEXT=true` in `.env` for local OTP in response.

```bash
# 1) Request OTP
curl -X POST http://localhost:5000/api/v1/corper/activation/request-otp \
  -H "Content-Type: application/json" \
  -d "{\"callUpNumber\":\"NYSC-LAG-2026-000001\",\"nin\":\"20000000001\"}"

# 2) Verify OTP (use devOtp from response or server log)
curl -X POST http://localhost:5000/api/v1/corper/activation/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"callUpNumber\":\"NYSC-LAG-2026-000001\",\"otp\":\"123456\"}"
```

### Important: MCT case creation

Per `documentation/system-rules.md`, **only SYSTEM** provisions MCT cases. Corpers **cannot** `POST /api/v1/mct-cases` (route removed; returns 404). Cases are created by mobilization/seed jobs or internal services.

Corper can:

- `GET /api/v1/mct-cases` — list own cases  
- `POST /api/v1/verification-codes/validate` — enter doctor-issued `MV-` code  

---

## Seeded accounts

Password for all seeded staff users: **`Password123!`**

| Email | Role |
|-------|------|
| `admin@medverify.local` | Abuja Admin |
| `dg@medverify.local` | DG |
| `coordinator@medverify.local` | Coordinator |
| `doctor@medverify.local` | Doctor |
| `corper@medverify.local` | Corper (legacy password login; portal uses OTP activation) |

---

## Health & docs

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Liveness |
| `GET /api/v1/ready` | DB + Redis readiness |
| `GET /docs` | Swagger UI (non-production) |
| `GET /docs.json` | OpenAPI JSON (non-production) |

---

## NPM scripts reference

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Production start | `npm run start` |
| Tests | `npm test` |
| Test watch | `npm run test:watch` |
| Prisma generate | `npm run prisma:generate` |
| Migrate | `npm run prisma:migrate` |
| Seed | `npm run prisma:seed` |
| Lagos seed | `npm run prisma:seed:lagos` |
| Export Lagos JSON/CSV | `npm run export:lagos-corpers` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Prisma client out of date | `npx prisma generate`, restart server |
| Migration / shadow DB errors | Grant `CREATEDB` to local Postgres user, or use `npx prisma migrate deploy` against a fresh DB |
| CORS errors from frontend | Add your Vite origin to `ALLOWED_ORIGINS` (e.g. `http://localhost:5174`) |
| Redis connection failed | Check `REDIS_URL`; `/api/v1/ready` will fail until Redis is up |
| Activation OTP not shown | Set `ALLOW_DEV_OTP_PLAINTEXT=true` and restart backend |

---

## Related docs

- `documentation/system-rules.md` — permissions and MCT rules  
- `documentation/frontend-backend-fraud-engine.md` — how frontend and fraud engine integrate  
- `documentation/project-architecture.md` — full system map  
