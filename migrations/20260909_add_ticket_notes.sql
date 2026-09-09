-- Run this once on the existing PostgreSQL/Neon database.
-- Adds multiple internal IT notes to each ticket.
CREATE TABLE IF NOT EXISTS ticket_notes (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_by   VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket
  ON ticket_notes(ticket_id, created_at);
