-- The Studio's Messages inbox (PORTS.md card 114): one status per form message.
-- Copied from MESSAGE_STATUS_DDL in src/lib/studio-messages.ts;
-- studio-messages.test.ts fails if the two differ, so edit the DDL there first.
--
-- Apply it to the same CONTACT_DB database as 0001:
--   npx wrangler d1 migrations apply <DB_NAME> --remote
-- (locally: --local -c dist/server/wrangler.json, see wrangler.jsonc)

CREATE TABLE IF NOT EXISTS message_status (
  source TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- The Sanity user id of whoever set it. Never a name or an email.
  updated_by TEXT,
  PRIMARY KEY (source, message_id)
);
