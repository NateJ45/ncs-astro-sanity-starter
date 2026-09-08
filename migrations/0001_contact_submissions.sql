-- GENERATED FILE. Do not hand-edit.
-- Written by scripts/gen-contact-migration.mjs from SUBMISSIONS_DDL in
-- src/lib/contact-submission.ts, so the schema and the endpoint cannot drift.
--
-- Apply it with:
--   npx wrangler d1 migrations apply <DB_NAME> --remote

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Whether the notification email was accepted by the transport. A row with
  -- notified = 0 is the whole reason this table exists: the enquiry survives an
  -- email that never arrived.
  notified INTEGER NOT NULL DEFAULT 0,
  notify_error TEXT,
  user_agent TEXT,
  country TEXT
);
CREATE INDEX IF NOT EXISTS contact_submissions_received_at
  ON contact_submissions (received_at DESC);
