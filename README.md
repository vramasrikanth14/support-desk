# SupportDesk — Support Ticket Management & Analytics

React (Vite + Tailwind) frontend · Node/Express backend · MongoDB (Mongoose)

## Quick start

```bash
# 1. Backend  (needs a running MongoDB)
cd backend
cp .env.example .env        # set JWT_SECRET (required) and MONGO_URI if needed
npm install
npm run seed                # optional: demo users + 40 demo tickets
npm run dev                 # http://localhost:5000

# 2. Frontend
cd ../frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

Default admin (created on first start): `admin@demo.com` / `admin123` (change via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
After `npm run seed`: `asha@demo.com` and `ravi@demo.com`, password `user123`.

## Running the tests

```bash
cd backend
npm test
```

Tests use `mongodb-memory-server`, so no local MongoDB is needed. The first run downloads a MongoDB binary (needs internet).
They cover: auth, input validation failures, valid/invalid status transitions, status history, assignment,
permissions, search / filter / sort / pagination (including combinations), and analytics with a date range.

## Roles & permissions

| Action | Admin | User |
|---|---|---|
| View tickets, create tickets | ✅ | ✅ |
| Edit a ticket / change its status | ✅ any | only tickets they created or are assigned to |
| Assign / unassign | ✅ | ❌ |
| Delete a ticket | ✅ | ❌ |
| Create users | ✅ | ❌ |

## Status workflow

```
Open ──► In Progress ──► Resolved ──► Closed
  ▲  ◄──────┘  ▲  ◄──────────┘          │
  └──────────────────────────────────────┘ (re-open)
```

Allowed: `Open → In Progress | Closed` · `In Progress → Open | Resolved` · `Resolved → In Progress | Closed` · `Closed → Open`.
Anything else returns **409**; setting the current status again returns **400**. The rules live in `backend/src/constants.js`
and are sent to the frontend via `GET /api/meta`, so the UI only offers valid moves.

## API reference

Base URL `http://localhost:5000/api` · JSON · `Authorization: Bearer <token>` on everything except login/health.

Errors always look like `{ "message": "...", "errors": [{ "field": "title", "message": "..." }] }` (`errors` only for validation).

| Method | Path | Auth | Description | Success |
|---|---|---|---|---|
| GET | `/health` | – | Liveness check | 200 |
| POST | `/auth/login` | – | `{ email, password }` → `{ token, user }` | 200 |
| GET | `/auth/me` | any | Current user | 200 |
| GET | `/meta` | any | Priorities, statuses, categories, allowed transitions | 200 |
| GET | `/users` | any | List users | 200 |
| POST | `/users` | admin | `{ name, email, password, role? }` | 201 |
| GET | `/tickets` | any | List with search / filters / sort / pagination (below) | 200 |
| POST | `/tickets` | any | `{ title, description, category, priority?, assignee? }` (assignee: admin only) | 201 |
| GET | `/tickets/analytics` | any | Dashboard metrics, optional `from` / `to` | 200 |
| GET | `/tickets/:id` | any | Ticket incl. full history | 200 |
| GET | `/tickets/:id/history` | any | Activity timeline entries | 200 |
| PATCH | `/tickets/:id` | admin / creator / assignee | Edit `title`, `description`, `priority`, `category` | 200 |
| PATCH | `/tickets/:id/status` | admin / creator / assignee | `{ status }` — validated transition | 200 |
| PATCH | `/tickets/:id/assignee` | admin | `{ assignee: userId \| null }` | 200 |
| DELETE | `/tickets/:id` | admin | Delete ticket | 200 |

Status codes used: 400 validation / bad id · 401 not authenticated · 403 forbidden · 404 not found · 409 invalid status transition or duplicate email · 500 unexpected.

### `GET /tickets` query parameters

| Param | Default | Notes |
|---|---|---|
| `page` | 1 | ≥ 1 |
| `limit` | 10 | 1–100 |
| `sortBy` | `createdAt` | `createdAt`, `updatedAt`, `title`, `priority` (ranked Low→Critical), `status` |
| `order` | `desc` | `asc` / `desc` |
| `search` | – | Case-insensitive match on title **or** description |
| `status`, `priority`, `category` | – | One value or comma-separated list, e.g. `status=Open,In Progress` |
| `assignee` | – | User id(s) and/or `unassigned`, comma-separated |

All filters combine with AND; `total` / `totalPages` always count the filtered result.

```json
{ "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }
```

### `GET /tickets/analytics`

Optional `from` / `to` as `YYYY-MM-DD` (UTC, inclusive) filter on creation date. Everything is computed by MongoDB aggregation.

```json
{
  "range": { "from": "2026-01-01", "to": null },
  "total": 40, "open": 12, "resolved": 9, "critical": 8,
  "byStatus":   [{ "name": "Open", "count": 12 }, ...],
  "byPriority": [{ "name": "Critical", "count": 8 }, ...]
}
```

## Data model

* **User** — name, email (unique), password (bcrypt, never returned), role.
* **Ticket** — title, description, priority, status, category, assignee → User, createdBy → User, timestamps,
  and an embedded `history[]` of `{ type: created | status | assignee | updated, from, to, note, by, at }`.
  History is embedded because it is always read with its ticket and never queried on its own.

## Bonus feature: activity timeline

Every create, edit, status change and assignment writes a history entry. Open any ticket on the Tickets page to see the
full timeline (who, what changed, when). Status changes carry the previous and new status plus a timestamp.

## Design notes

* Validation with `zod` (strict: unknown fields are rejected, so clients can't set `status` or `createdBy` on create).
* One centralized error handler; async routes are wrapped so rejections never crash the process.
* Frontend: context for auth + toasts, `useTickets` hook cancels stale requests and the search box is debounced;
  meta (enums/transitions) is fetched once; every mutation updates the UI without a page reload.
* Not included: bulk operations (the alternative bonus), refresh tokens, rate limiting, UI tests.
