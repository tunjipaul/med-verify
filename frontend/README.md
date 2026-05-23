# MedVerify Frontend

React + TypeScript + Vite app for the NYSC Medical Verification System (corper portal, landing page, and future staff portals).

Default dev URL: **http://localhost:5173** (Vite may use **5174** if 5173 is busy)

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Same as backend |
| **Backend API running** | See `../backend/README.md` — default **http://localhost:5000** |

---

## Quick start (run the dev server)

**Terminal 1 — backend** (required first):

```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, REDIS_URL, secrets, ALLOWED_ORIGINS (include http://localhost:5173)
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
# Optional: npm run prisma:seed:lagos
npm run dev
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

---

## Environment

Create `frontend/.env` (optional; defaults work if backend is on port 5000):

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Backend API base URL |

After changing `.env`, restart `npm run dev`.

**CORS:** If you use a port other than 5173, add it to backend `ALLOWED_ORIGINS` in `backend/.env`. In development, the backend also allows any `localhost` / `127.0.0.1` origin.

---

## Run commands

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

---

## Testing the app manually

### 1. Landing page

- Open **/** — marketing / entry page  
- Use **Secure Login** → `/corper/login`

### 2. Corper activation (OTP login)

Backend must have:

```env
ALLOW_DEV_OTP_PLAINTEXT=true
```

in `backend/.env` (restart backend after changing).

**With Lagos seed** (after `npm run prisma:seed:lagos`):

| Field | Example |
|-------|---------|
| Call-up | `NYSC-LAG-2026-000001` or `NYSC/LAG/2026/000001` |
| NIN | `20000000001` |

Flow on `/corper/login`:

1. Enter call-up number and NIN → **Send OTP**  
2. In dev, OTP appears in the yellow panel and/or backend console  
3. Enter OTP → redirects to **/corper/dashboard**

**Without Lagos seed:** use a corper that exists in the DB with matching call-up + NIN (see `backend/README.md` for `corper@medverify.local` vs activation rules).

### 3. Corper dashboard

Route: **/corper/dashboard** (requires login, role `CORPER`)

| Feature | Status |
|---------|--------|
| Case list / status | Wired to `GET /api/v1/mct-cases` |
| Enter verification code (`MV-`) | Wired to `POST /api/v1/verification-codes/validate` |
| Open / create MCT case | **Not available** — cases are provisioned by SYSTEM, not corpers |
| Hospital directory | Placeholder (“coming soon”) |
| Notifications | Placeholder |

### 4. Staff portals

Hospital / doctor / coordinator / HQ UIs are **not implemented** in this app yet. Staff can be tested via backend API or Swagger at [http://localhost:5000/docs](http://localhost:5000/docs).

---

## Routes (current)

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page |
| `/corper/login` | Public | Activation (call-up + NIN + OTP) |
| `/login` | Redirect | → `/corper/login` |
| `/corper/dashboard` | Corper only | Dashboard |
| `/dashboard` | Redirect | → `/corper/dashboard` |

Protected routes use JWT in `localStorage` (`access_token`).

---

## Project structure (high level)

```
frontend/src/
  pages/           LandingPage, LoginPage, DashboardPage
  components/      Shared UI (e.g. NigeriaMapBackground, corper/*)
  lib/             api.ts, activation.ts, mct.ts
  routes/          AppRouter, ProtectedRoute
  store/           auth.store.ts (Zustand)
  providers/       QueryProvider (TanStack Query)
```

UI design reference: `../UI/corper-dashboard.html` and `../UI/corper-dashboard.md`

---

## Build for production

```bash
cd frontend
npm run build
npm run preview   # optional: test production build locally
```

Serve the `dist/` folder with any static host (Nginx, Vercel, etc.). Set `VITE_API_BASE_URL` at **build time** to your production API URL.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network error / CORS | Backend running? `ALLOWED_ORIGINS` includes your frontend URL? |
| 401 on dashboard | Log in again at `/corper/login`; token may have expired |
| OTP not shown | `ALLOW_DEV_OTP_PLAINTEXT=true` on backend; call-up + NIN must match DB |
| Wrong API URL | Set `VITE_API_BASE_URL` in `frontend/.env` and restart Vite |
| Port in use | Vite picks next port (e.g. 5174) — use that URL and add it to `ALLOWED_ORIGINS` |

---

## Related docs

- `../backend/README.md` — API, seeds, integration tests  
- `../documentation/frontend-backend-fraud-engine.md` — API integration contract  
- `documentation/frontend-architecture.md` — planned multi-portal UI  
