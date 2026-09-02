# REST API

> This document tracks the API surface as it grows phase-by-phase.
> Phase 1 exposes only health endpoints; all others are placeholders.

## Response envelopes

```jsonc
// success
{ "success": true, "data": { ... } }

// error
{
  "success": false,
  "message": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": [ ... ] // optional
}
```

## Health

| Method | Path                | Auth | Description                                     |
| ------ | ------------------- | ---- | ----------------------------------------------- |
| GET    | `/api/health/live`  | no   | Liveness probe (process is up).                 |
| GET    | `/api/health/ready` | no   | Readiness probe (DB reachable, ready to serve). |

## Coming next (Phase 2 — Auth)

| Method | Path                 | Auth | Description                             |
| ------ | -------------------- | ---- | --------------------------------------- |
| POST   | `/api/auth/register` | no   | Create account.                         |
| POST   | `/api/auth/login`    | no   | Set HTTP-only access + refresh cookies. |
| POST   | `/api/auth/logout`   | yes  | Revoke refresh token; clear cookies.    |
| POST   | `/api/auth/refresh`  | rt   | Rotate refresh token, issue new access. |
| GET    | `/api/auth/me`       | yes  | Current authenticated user.             |
