// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-db - the D1 tables behind the newsletter and RSVPs (PORTS.md card 121)
// =============================================================================
// ONE database for everything people send the site: the contact form, the form
// builder, the Messages statuses, and now the subscriber list, the newsletter
// send log and RSVPs. It is the CONTACT_DB binding; no second database to create.
//
// MAIL_DDL is the source of truth; migrations/NNNN_mail.sql carries a copy and
// src/lib/mail-db.test.ts fails if the two differ (the same rule as the other
// migrations). A site numbers its file after its own last migration.
//
// WHAT IS STORED, AND WHAT IS NOT.
//   subscribers            the email address, a status and timestamps. Nothing
//                          else: no name (the optional name on the sign-up box is
//                          used once, in the confirmation greeting, and dropped).
//   newsletter_sends       one row per issue ever sent to the list: the
//                          "never sends twice" lock, and the send log.
//   newsletter_deliveries  one row per (issue, subscriber), CLAIMED BEFORE the
//                          email goes. The primary key is what makes a second
//                          send to the same person impossible, even with two
//                          batches racing.
//   rsvps                  what the RSVP form asks: name, email, party size,
//                          answers. People's details, so it lives here and never
//                          in Sanity (the dataset is public).
// =============================================================================

export const MAIL_DDL = `
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
`.trim();

/**
 * The slice of D1 the mail routes use, declared structurally (rule 8: no type
 * package for one interface). src/lib/mail-sqlite.ts gives the tests the same
 * shape over node:sqlite, so the SQL itself is under test, not a fake.
 */
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta?: { changes?: number; last_row_id?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1Database {
  prepare(sql: string): D1Statement;
}

export const nowIso = (ms: number = Date.now()) => new Date(ms).toISOString();
