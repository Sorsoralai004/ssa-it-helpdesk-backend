# Update: IT ticket notes and permanent deletion

This update adds two IT-only capabilities:

1. Add multiple internal notes to a ticket, including who added the note and when.
2. Permanently delete a ticket.

## Database

For an existing database, run:

`migrations/20260909_add_ticket_notes.sql`

in the Neon SQL Editor before deploying the updated application.

## Deploy

Commit/push the updated source and redeploy the backend. The IT dashboard then supports
notes and permanent deletion from the ticket detail drawer.

Ticket deletion cascades to `ticket_status_history` and `ticket_notes`.


## LINE notifications

This update adds LINE Messaging API support for IT-only notifications.

### Render environment variables

Add these variables in Render (do not put real secrets in Git):

- `LINE_CHANNEL_ACCESS_TOKEN` — the long-lived Channel access token from LINE Developers.
- `LINE_CHANNEL_SECRET` — the Channel secret from LINE Developers.
- `LINE_IT_USER_ID` — the IT recipient's internal LINE user ID (`U...`).

### Webhook setup to discover the IT user ID

1. Deploy the updated app to Render.
2. In LINE Developers → Messaging API, set the Webhook URL to:
   `https://ssa-it-helpdesk-backend.onrender.com/api/line/webhook`
3. Enable **Use webhook** if LINE shows that switch.
4. From the IT LINE account, add the `SSA IT Helpdesk` Official Account as a friend and send a message such as `TEST`.
5. Open the Render service logs. The server will print `[line] user ID discovered: U...`.
6. Put that `U...` value into `LINE_IT_USER_ID` in Render and redeploy.

The webhook verifies LINE's `x-line-signature` using `LINE_CHANNEL_SECRET` before accepting events.

### Notification behavior

- New tickets send a LINE message only to `LINE_IT_USER_ID`.
- Ticket status changes also send a LINE message only to `LINE_IT_USER_ID`.
- If LINE, email, or Web Push fails, the ticket operation still succeeds; the failed notification is logged.
- The Channel access token and Channel secret are never returned by the API.
