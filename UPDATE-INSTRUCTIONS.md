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
