-- Where form messages go, set in the Studio (PORTS.md card 174, /api/studio/form-recipients/).
-- Copied from FORM_RECIPIENTS_DDL in src/lib/form-recipients.ts; form-recipients.test.ts fails
-- if the two differ, so edit the DDL there first. CREATE TABLE IF NOT EXISTS, so applying it
-- again (or to a site that already made the table under another number) changes nothing.
--
-- Apply it to the same CONTACT_DB database as the earlier migrations:
--   npx wrangler d1 migrations apply <DB_NAME> --remote
-- (locally: --local -c dist/server/wrangler.json, see wrangler.jsonc)

CREATE TABLE IF NOT EXISTS form_recipient_addresses (
  recipient_key TEXT PRIMARY KEY,
  -- The confirmed address in use for this key, or NULL.
  email TEXT,
  confirmed_at TEXT,
  -- A new address waiting for its confirmation link to be pressed, or NULL.
  pending_email TEXT,
  pending_since TEXT,
  -- 'sent': a link went out. 'unconfirmed': no email backbone to send one (or it failed).
  pending_status TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
