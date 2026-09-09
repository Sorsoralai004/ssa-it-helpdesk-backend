# SSA+ IT Helpdesk — Backend

REST API for the ticketing system. Matches the fields and statuses used in the
prototype (`new`, `progress`, `done`, `cancel`) — status is never deleted from
the database, only flagged.

## Setup

```bash
npm install
cp .env.example .env      # then edit DATABASE_URL to point at your Postgres
npm run db:init           # creates tables + seeds the 4 example tickets
npm run dev
```

API will run on `http://localhost:4000` (or `PORT` from `.env`).

## Endpoints

| Method | Path                     | Purpose                                              |
|--------|--------------------------|-------------------------------------------------------|
| GET    | `/api/tickets`           | List tickets. `?status=new\|progress\|done\|cancel`   |
| GET    | `/api/tickets/:id`       | One ticket + its full status-change history           |
| POST   | `/api/tickets`           | Submit a new ticket (no login needed)                 |
| PATCH  | `/api/tickets/:id/status`| Change status, cancel, or reopen a cancelled ticket    |
| GET    | `/api/overview`          | Counts by status / category / department, for charts  |

### Create a ticket

```bash
curl -X POST http://localhost:4000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "สมชาย ใจดี",
    "department": "บัญชี ชั้น 3",
    "category": "เครื่องคอมพิวเตอร์",
    "urgency": "mid",
    "detail": "เปิดเครื่องไม่ติด"
  }'
```

### Change status / cancel / reopen

```bash
curl -X PATCH http://localhost:4000/api/tickets/5/status \
  -H "Content-Type: application/json" \
  -d '{"status": "cancel"}'
```

Sending `status: "cancel"` remembers the ticket's prior status. Sending any
other status while it's cancelled restores that prior status automatically —
this is the "reopen" behavior from the prototype.

## Notifications

`src/notifications.js` sends two things whenever a ticket is created or its
status changes:

1. **Web Push** — a browser notification to every IT staff member who has
   clicked "🔔 เปิดการแจ้งเตือน" on the dashboard (`public/it-helpdesk.html`).
   Requires `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in `.env` — generate a
   pair with `npx web-push generate-vapid-keys` and paste both values in.
   iPhone note: Safari only delivers push to a site that's been added to the
   Home Screen first; opening the page in the browser tab isn't enough.
2. **Email** — a plain-text email to `MAIL_TO`, sent via whatever SMTP server
   you put in `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (Gmail with an App
   Password, or a free-tier relay like Brevo/Resend both work).

Both channels are optional and independent — if you leave `VAPID_PUBLIC_KEY`
or `SMTP_HOST` blank, that channel just logs to the console and skips
instead of erroring.

`public/` also holds `sw.js` (the push service worker) and `push-client.js`
(the browser-side subscribe logic) — both are served as static files by
`src/server.js`, alongside `it-helpdesk.html` itself, so the whole app is one
URL.

## Notes

- No authentication yet — every route is open, matching the "IT dashboard
  Login" step that comes after this one. Once that's built, `assigned_to` /
  `changed_by` should be set from the logged-in user instead of being null.
- `schema.sql` is safe to re-run (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).
