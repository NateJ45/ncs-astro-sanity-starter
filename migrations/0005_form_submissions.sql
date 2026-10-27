-- The form builder's table (/api/form/, src/pages/api/form.ts; PORTS.md card 194).
-- Copied from FORM_SUBMISSIONS_DDL in src/lib/site-form.ts; site-form.test.ts
-- fails if the two differ, so edit the DDL there and copy it here.
--
-- Apply it to the same CONTACT_DB database as 0001 to 0004:
--   npx wrangler d1 migrations apply <site>-contact --remote
-- (locally: --local -c dist/server/wrangler.json)
--
-- IF NOT EXISTS throughout: a site that made this table under another number (FBC Auburn has it
-- as 0002_form_submissions.sql) can take this file and nothing changes.

CREATE TABLE IF NOT EXISTS form_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_title TEXT NOT NULL,
  recipient TEXT NOT NULL,
  mode TEXT NOT NULL,
  name TEXT,
  email TEXT,
  answers TEXT,
  -- Whether the notification email was accepted. A row with notified = 0 is a
  -- message that still needs reading here.
  notified INTEGER NOT NULL DEFAULT 0,
  notify_error TEXT,
  -- 1 once a private form's words have been removed after a good send.
  cleared INTEGER NOT NULL DEFAULT 0,
  country TEXT
);
CREATE INDEX IF NOT EXISTS form_submissions_received_at
  ON form_submissions (received_at DESC);
