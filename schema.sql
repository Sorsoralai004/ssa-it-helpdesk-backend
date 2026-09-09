-- ============================================================
-- SSA+ IT Helpdesk — Database schema (PostgreSQL)
-- ============================================================

-- Ticket numbers continue from the prototype's mock data (IT-1042)
CREATE SEQUENCE IF NOT EXISTS ticket_seq START WITH 1043;

CREATE TABLE IF NOT EXISTS tickets (
  id             SERIAL PRIMARY KEY,
  ticket_no      VARCHAR(20) UNIQUE NOT NULL,
  reporter_name  VARCHAR(255) NOT NULL,
  department     VARCHAR(255) NOT NULL,          -- free-text: แผนก/สถานที่
  category       VARCHAR(100) NOT NULL,          -- เครื่องคอมพิวเตอร์ / เครือข่าย / ปริ้นเตอร์ / ...
  urgency        VARCHAR(10)  NOT NULL CHECK (urgency IN ('low','mid','high')),
  detail         TEXT NOT NULL,
  status         VARCHAR(10)  NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','progress','done','cancel')),
  prev_status    VARCHAR(10),                    -- remembers status before it was cancelled
  assigned_to    VARCHAR(255),                   -- IT staff handling it (nullable until login exists)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created  ON tickets(created_at);

-- Full audit trail of every status change — this is what lets us
-- keep "cancelled" tickets (and everything else) instead of deleting rows.
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  old_status   VARCHAR(10),
  new_status   VARCHAR(10) NOT NULL,
  changed_by   VARCHAR(255),        -- NULL for now; fill in once IT login exists
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_status_history(ticket_id);

-- Internal IT work notes. Multiple notes can be added to each ticket so the
-- resolution steps and troubleshooting history are preserved.
CREATE TABLE IF NOT EXISTS ticket_notes (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_by   VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket ON ticket_notes(ticket_id, created_at);

-- Auto-generate ticket_no on insert (IT-1043, IT-1044, ...)
CREATE OR REPLACE FUNCTION set_ticket_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_no IS NULL THEN
    NEW.ticket_no := 'IT-' || nextval('ticket_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ticket_no ON tickets;
CREATE TRIGGER trg_set_ticket_no
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_ticket_no();

-- Keep updated_at current, and log every status change automatically
CREATE OR REPLACE FUNCTION touch_ticket() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by)
    VALUES (OLD.id, OLD.status, NEW.status, NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_ticket ON tickets;
CREATE TRIGGER trg_touch_ticket
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION touch_ticket();

-- Web Push subscriptions — one row per browser/device that has enabled
-- notifications from the IT dashboard ("เปิดการแจ้งเตือน" button).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data mirroring the prototype, so the dashboard isn't empty on first run
INSERT INTO tickets (ticket_no, reporter_name, department, category, urgency, detail, status, created_at)
VALUES
  ('IT-1041', 'พิมพ์ใจ ศรีสุข', 'บัญชี', 'ปริ้นเตอร์', 'mid',
   'ปริ้นเตอร์ชั้น 2 ปริ้นแล้วมีเส้นขาวพาดกลางกระดาษทุกแผ่น', 'done', now() - interval '2 days'),
  ('IT-1040', 'ธนกร วงศ์สวัสดิ์', 'ขาย', 'เครือข่าย / อินเทอร์เน็ต', 'high',
   'เน็ตหลุดตลอดตั้งแต่เช้า ใช้ระบบ CRM ไม่ได้เลย กระทบลูกค้าที่รออยู่', 'progress', now() - interval '2 days'),
  ('IT-1039', 'อรุณี ทองแท้', 'คลังสินค้า', 'เครื่องคอมพิวเตอร์', 'low',
   'จอมอนิเตอร์กะพริบเป็นบางครั้ง ยังพอใช้งานได้', 'new', now() - interval '3 days'),
  ('IT-1038', 'สุพจน์ มีชัย', 'ผลิต', 'ซอฟต์แวร์ / ระบบงาน', 'mid',
   'โปรแกรม ERP ค้างตอนบันทึกใบสั่งผลิต ต้องปิดโปรแกรมทุกครั้ง', 'new', now() - interval '3 days')
ON CONFLICT (ticket_no) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name VARCHAR(255), is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
