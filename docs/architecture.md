# Architecture

This document describes the high-level architecture, the reasoning behind key
decisions, and the boundaries every module must respect.

---

## 1. Goals

- **Real-time**, low-latency messaging over Socket.IO.
- **REST** for persistent CRUD and paginated reads.
- **Security-first**: HTTP-only cookies, argon2 hashing, Zod-validated inputs,
  object-level authorization enforced server-side.
- **Modular**: each domain (auth, users, conversations, messages, groups) is a
  self-contained module with its own controller / service / repository / routes
  / validation.
- **Portable data model**: normalized enough that migration to PostgreSQL is
  realistic.

---

## 2. High-level topology

```
┌─────────────────────┐        HTTPS         ┌────────────────────────┐
│     React SPA       │  ────────────────►  │   Express (REST API)   │
│  Redux + RTKQ +     │                     │                        │
│  Socket.IO client   │  ◄──── WSS ────────►│   Socket.IO server     │
└─────────────────────┘                     └──────────┬─────────────┘
                                                       │
                                                       ▼
                                            ┌────────────────────┐
                                            │  Prisma (single    │
                                            │  process instance) │
                                            └──────────┬─────────┘
                                                       ▼
                                            ┌────────────────────┐
                                            │  MongoDB (rs0)     │
                                            └────────────────────┘
```

Socket.IO and Express share the **same** HTTP server so cookies and CORS
behave identically for both transports.

---

## 3. Backend layers

```
Route  ──►  Controller  ──►  Service  ──►  Repository  ──►  Prisma  ──►  MongoDB
```

**Hard rules**

- Controllers never touch Prisma directly.
- Business logic never lives in routes or React components.
- Socket handlers never bypass the service layer.
- Repositories are the _only_ callers of Prisma methods.
- Prisma client is instantiated **exactly once** per process
  (`src/config/database.js`).

**Cross-cutting concerns**

- `src/config/` — env validation, Prisma client, logger.
- `src/middlewares/` — auth, validation, rate limiting, error, 404.
- `src/errors/` — `AppError` hierarchy; anything else = unexpected internal.
- `src/utils/` — pure helpers (`asyncHandler`, response envelopes, jwt helpers).
- `src/constants/` — enums shared across the app (mirrors the Prisma enums).

---

## 4. Real-time layer

```
Socket Event  ──►  Socket Handler  ──►  Service  ──►  Repository  ──►  Prisma
```

- **Auth**: sockets authenticate from the same HTTP-only cookie used by the REST
  API. Unauthenticated sockets are disconnected immediately.
- **Rooms**: each conversation is a room `conversation:<id>`. Each user also
  joins a personal room `user:<id>` for direct notifications.
- **Presence**: `userId → Set<socketId>` map. A user is offline only when the
  set becomes empty; disconnect of one socket does **not** flip presence.
- **Typing**: pure transport, never persisted.

---

## 5. Frontend architecture

Feature-first organization (see `client/src/features/`). Each feature owns:

- a **slice** for UI state,
- an **API module** injected into the shared RTK Query `apiSlice`,
- feature-scoped **components** and **hooks**.

Cross-cutting UI lives under `components/ui`; layouts under `layouts/`; routes
under `pages/`.

**Server state** is owned by RTK Query — it is **not** duplicated into
slices. Socket.IO events push updates by invalidating tags on the RTK Query
cache or by using `updateQueryData` for targeted patches.

---

## 6. Data model

See [database.md](database.md). Highlights:

- Unified `Conversation` model — `type: DIRECT | GROUP`.
- Membership as a separate `ConversationMember` collection with `role: OWNER | ADMIN | MEMBER`.
- Direct conversations enforce uniqueness via a sorted `directKey` (`userA:userB`).
- `Message` normalized with soft delete, edit trail, replies, and attachments.
- `MessageRead` per-user receipts.
- Refresh tokens rotated with a `familyId` so token reuse detection can revoke
  the whole family on compromise.

---

## 7. Security posture

- **Password hashing**: argon2id.
- **JWT**: short-lived access token (`15m`), long-lived rotated refresh token (`7d`).
- **Transport**: HTTP-only, `SameSite`-scoped, `Secure` in prod, signed cookies.
- **CSRF**: SameSite=Lax on cookies + strict CORS `origin` are the baseline; a
  double-submit or origin check is added in Phase 10.
- **Rate limiting**: global + per-route (auth endpoints stricter).
- **Object-level authorization**: every read/write cross-checks
  `ConversationMember` membership; group admin operations check role.
- **No trust of client-provided user IDs** — identity is always taken from the
  verified access token.

---

## 8. Error handling

Every response follows one of two envelopes:

```jsonc
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "message": "...", "code": "AUTH_INVALID_CREDENTIALS", "details": [...] }
```

All operational errors extend `AppError`. Any error that reaches the error
middleware without `isOperational=true` is logged as `error` and reported as a
generic `INTERNAL_ERROR` — internal messages/stacks are never returned in prod.

---

## 9. Testing strategy

- **Unit** — services and authorization logic (no I/O).
- **Integration** — Express + Prisma against a `chat_test` Mongo replica set.
- **Socket** — real Socket.IO client against a booted server.

Runs on the Node test runner (`node --test`) to keep the dep tree small.

---

## 10. Non-goals (for now)

- Multi-region horizontal scaling of Socket.IO (would require a Redis adapter — trivial to add).
- End-to-end encryption.
- Push notifications to native mobile.
- Video/voice calling.
