Backend Production Sign-Off Checklist

Purpose
- Use this file as release evidence before promoting backend to production.
- Every item must be marked `PASS`, `FAIL`, or `PENDING`.

Release Metadata
- Release version/tag:
- Environment:
- Change window date:
- Change owner:
- Reviewer/approver:
- Last updated:

Status legend
- `PASS`: verified with evidence.
- `FAIL`: attempted and failed (must include rollback/mitigation note).
- `PENDING`: not yet verified.

Environment Variables Verification
| Item | Expected | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|
| `NODE_ENV` | `production` | PENDING |  |  |  |
| `PORT` | Set (for example `5000`) | PENDING |  |  |  |
| `DATABASE_URL` | Production PostgreSQL | PENDING |  |  |  |
| `REDIS_URL` | Production Redis (TLS if hosted) | PENDING |  |  |  |
| `JWT_SECRET` | Strong 24+ chars | PENDING |  |  |  |
| `REFRESH_JWT_SECRET` | Strong 24+ chars, different | PENDING |  |  |  |
| `ACCESS_TOKEN_EXPIRES_IN` | Set (for example `15m`) | PENDING |  |  |  |
| `REFRESH_TOKEN_EXPIRES_IN` | Set (for example `7d`) | PENDING |  |  |  |
| `ALLOWED_ORIGINS` | Production domains only (no localhost) | PENDING |  |  |  |

Pre-Deploy Gates
| Check | Command | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|
| Install dependencies | `npm ci` | PENDING |  |  |  |
| Generate Prisma client | `npx prisma generate` | PENDING |  |  |  |
| Build backend | `npm run build` | PENDING |  |  |  |
| Run tests | `npm test` | PENDING |  |  |  |

Database Migration
| Check | Command | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|
| Apply production migrations | `npx prisma migrate deploy` | PENDING |  |  |  |

Seed Policy Confirmation
| Check | Requirement | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|
| Seed execution | Do not run seed in production | PENDING |  |  |  |
| Exception handling | One-time bootstrap only with explicit approval + audit | PENDING |  |  |  |

Health and Readiness Checks
| Endpoint | Expected | Actual | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|---|
| `GET /api/v1/health` | `200` + success response |  | PENDING |  |  |  |
| `GET /api/v1/ready` | `200` + dependencies ready |  | PENDING |  |  |  |

Post-Deploy Smoke Verification
| Check | Expected | Actual | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|---|
| Login flow (`POST /api/v1/auth/login`) | Success with valid credentials |  | PENDING |  |  |  |
| Protected route (`GET /api/v1/me`) | `200` with valid token |  | PENDING |  |  |  |
| Audit logging | Privileged actions create audit records |  | PENDING |  |  |  |
| Rate limiting headers | Present on protected/auth endpoints |  | PENDING |  |  |  |
| Error contract | Responses match documented `ApiError` shape |  | PENDING |  |  |  |

Rollback Readiness
| Check | Requirement | Status | Evidence/Notes | Verified By | Date |
|---|---|---|---|---|---|
| App rollback path | Revert traffic to last known good release | PENDING |  |  |  |
| DB rollback path | Restore from latest backup/snapshot if needed | PENDING |  |  |  |
| Post-rollback validation | `/api/v1/health`, `/api/v1/ready`, auth smoke | PENDING |  |  |  |

Final Sign-Off
| Role | Name | Decision (`PASS`/`FAIL`) | Date | Notes |
|---|---|---|---|---|
| Engineering Owner |  | PENDING |  |  |
| Reviewer/Approver |  | PENDING |  |  |
