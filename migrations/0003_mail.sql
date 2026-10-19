-- The email backbone (PORTS.md card 121): the newsletter's subscribers, its send
-- log and per-person delivery claims, and RSVPs. Copied from MAIL_DDL in
-- src/lib/mail-db.ts; mail-db.test.ts fails if the two differ, so edit the DDL
-- there first.
--
-- Apply it to the same CONTACT_DB database as the earlier migrations:
--   npx wrangler d1 migrations apply <DB_NAME> --remote
-- (locally: --local -c dist/server/wrangler.json, see wrangler.jsonc)

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirm_sent_at TEXT,
  confirmed_at TEXT,
  unsubscribed_at TEXT
);
CREATE INDEX IF NOT EXISTS subscribers_status ON subscribers (status);

CREATE TABLE IF NOT EXISTS newsletter_sends (
  issue_id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  started_by TEXT
);

CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  issue_id TEXT NOT NULL,
  subscriber_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  at TEXT NOT NULL,
  error TEXT,
  PRIMARY KEY (issue_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  event_name TEXT NOT NULL,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT NOT NULL,
  answers TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  notify_error TEXT
);
CREATE INDEX IF NOT EXISTS rsvps_event ON rsvps (event_key, status);
