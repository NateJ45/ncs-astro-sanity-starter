// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// studio-messages - the Studio's "Messages" inbox, pure half (PORTS.md card 114)
// =============================================================================
// The site's forms write to the Worker's own D1 database (binding CONTACT_DB):
// /api/contact/ into contact_submissions, and on sites with the form builder
// /api/form/ into form_submissions. The Studio's Messages tool lists them
// through /api/studio/messages/, with a status per message (New, Needs a
// person, Replied, Spam) kept in a third table, message_status.
//
// NOTHING PERSONAL EVER GOES INTO SANITY. The dataset is public on most sites
// in the family; the inbox reads D1 through the Worker and writes its status
// back to D1. The Studio only ever holds the answer in memory.
//
// PRAYER REQUESTS. A form in prayer mode has its words wiped from D1 as soon as
// the email is accepted (cleared = 1). The inbox goes further and never shows a
// prayer request's name, email or words at all, even before the wipe: only
// that one arrived, when, and whether the email went out.
//
// The handler takes its database and its auth check as arguments, so
// src/lib/studio-messages.test.ts covers the auth rules, the mapping and the
// privacy rule with a fake store; d1Store() below is the real one.
// =============================================================================

export const MESSAGE_STATUSES = ['new', 'needs-person', 'replied', 'spam'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const STATUS_LABELS: Record<MessageStatus, string> = {
  new: 'New',
  'needs-person': 'Needs a person',
  replied: 'Replied',
  spam: 'Spam',
};

export type MessageSource = 'contact' | 'form';

/** The migration's table. migrations/*_message_status.sql must match (the test checks). */
export const MESSAGE_STATUS_DDL = `CREATE TABLE IF NOT EXISTS message_status (
  source TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- The Sanity user id of whoever set it. Never a name or an email.
  updated_by TEXT,
  PRIMARY KEY (source, message_id)
);`;

/** The newest this many messages per source are listed. */
export const LIST_LIMIT = 200;

// ---------------------------------------------------------------------------
// Row shapes (what D1 returns) and what the Studio gets
// ---------------------------------------------------------------------------

export interface ContactRow {
  id: number;
  received_at: string;
  name: string;
  email: string;
  subject: string;
  message?: string;
  notified: number;
  notify_error?: string | null;
}

export interface FormRow {
  id: number;
  received_at: string;
  form_id: string;
  form_title: string;
  recipient?: string;
  mode: string;
  name?: string | null;
  email?: string | null;
  answers?: string | null;
  notified: number;
  notify_error?: string | null;
  cleared?: number;
}

export interface StatusRow {
  source: string;
  message_id: number;
  status: string;
}

export interface MessageListItem {
  key: string;
  source: MessageSource;
  id: number;
  from: string;
  form: string;
  receivedAt: string;
  status: MessageStatus;
  emailed: boolean;
  prayer: boolean;
}

export interface MessageDetail extends MessageListItem {
  email: string | null;
  subject: string | null;
  answers: Array<{ label: string; value: string }>;
  sentTo: string | null;
  note: string | null;
}

export const keyOf = (source: MessageSource, id: number) => `${source}-${id}`;

/** `form-12` -> { source: 'form', id: 12 }, or null. */
export function parseKey(key: unknown): { source: MessageSource; id: number } | null {
  if (typeof key !== 'string') return null;
  const m = /^(contact|form)-(\d{1,12})$/.exec(key);
  return m ? { source: m[1] as MessageSource, id: Number(m[2]) } : null;
}

export function isStatus(value: unknown): value is MessageStatus {
  return MESSAGE_STATUSES.includes(value as MessageStatus);
}

/**
 * A message nobody has marked yet is New, unless its notification email never
 * went out: then nobody has seen it anywhere, so it starts as Needs a person.
 */
export function statusFor(stored: string | undefined, emailed: boolean): MessageStatus {
  if (isStatus(stored)) return stored;
  return emailed ? 'new' : 'needs-person';
}

const isPrayer = (row: FormRow) => row.mode === 'prayer';

export function contactItem(row: ContactRow, stored?: string): MessageListItem {
  const emailed = row.notified === 1;
  return {
    key: keyOf('contact', row.id),
    source: 'contact',
    id: row.id,
    from: row.name || 'No name given',
    form: 'Contact form',
    receivedAt: row.received_at,
    status: statusFor(stored, emailed),
    emailed,
    prayer: false,
  };
}

export function formItem(row: FormRow, stored?: string): MessageListItem {
  const emailed = row.notified === 1;
  const prayer = isPrayer(row);
  return {
    key: keyOf('form', row.id),
    source: 'form',
    id: row.id,
    from: prayer ? 'Prayer request' : row.name || 'No name given',
    form: row.form_title || 'A form',
    receivedAt: row.received_at,
    status: statusFor(stored, emailed),
    emailed,
    prayer,
  };
}

function parseAnswers(json: string | null | undefined): Array<{ label: string; value: string }> {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((a): a is { label: unknown; value: unknown } => Boolean(a) && typeof a === 'object')
      .map((a) => ({ label: String(a.label ?? ''), value: String(a.value ?? '') }));
  } catch {
    return [];
  }
}

export function contactDetail(row: ContactRow, stored?: string): MessageDetail {
  return {
    ...contactItem(row, stored),
    email: row.email || null,
    subject: row.subject || null,
    answers: row.message ? [{ label: 'Message', value: row.message }] : [],
    sentTo: null,
    note: row.notified === 1 ? null : 'The notification email did not go out. Read it here.',
  };
}

export function formDetail(row: FormRow, stored?: string): MessageDetail {
  const item = formItem(row, stored);
  if (item.prayer) {
    // The privacy rule: nothing but the fact that it arrived.
    return {
      ...item,
      email: null,
      subject: null,
      answers: [],
      sentTo: null,
      note:
        row.notified === 1
          ? 'A prayer request arrived and was emailed. Its words are not kept or shown here.'
          : 'A prayer request arrived but the email did not go out. Its words are held privately and are not shown here. Ask for help to have it sent again.',
    };
  }
  return {
    ...item,
    email: row.email || null,
    subject: null,
    answers: parseAnswers(row.answers),
    sentTo: row.recipient || null,
    note: row.notified === 1 ? null : 'The notification email did not go out. Read it here.',
  };
}

/** Both sources, newest first. */
export function mergeList(
  contacts: ContactRow[],
  forms: FormRow[],
  statuses: StatusRow[],
): MessageListItem[] {
  const stored = new Map(statuses.map((s) => [`${s.source}-${s.message_id}`, s.status]));
  return [
    ...contacts.map((r) => contactItem(r, stored.get(keyOf('contact', r.id)))),
    ...forms.map((r) => formItem(r, stored.get(keyOf('form', r.id)))),
  ].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0));
}

// ---------------------------------------------------------------------------
// The store: what the handler needs from D1
// ---------------------------------------------------------------------------

export interface MessageStore {
  tables(): Promise<Set<string>>;
  list(source: MessageSource, limit: number): Promise<Array<ContactRow | FormRow>>;
  get(source: MessageSource, id: number): Promise<ContactRow | FormRow | null>;
  statuses(): Promise<StatusRow[]>;
  status(source: MessageSource, id: number): Promise<string | undefined>;
  setStatus(
    source: MessageSource,
    id: number,
    status: MessageStatus,
    at: string,
    by: string,
  ): Promise<void>;
}

const TABLE: Record<MessageSource, string> = {
  contact: 'contact_submissions',
  form: 'form_submissions',
};

// Columns read per source. A prayer request's `answers` is read for nothing:
// formDetail never returns it, and the list never reads it at all.
const LIST_COLUMNS: Record<MessageSource, string> = {
  contact: 'id, received_at, name, subject, notified',
  form: "id, received_at, form_id, form_title, mode, CASE WHEN mode = 'prayer' THEN NULL ELSE name END AS name, notified",
};
const DETAIL_COLUMNS: Record<MessageSource, string> = {
  contact: 'id, received_at, name, email, subject, message, notified, notify_error',
  form:
    'id, received_at, form_id, form_title, recipient, mode, ' +
    "CASE WHEN mode = 'prayer' THEN NULL ELSE name END AS name, " +
    "CASE WHEN mode = 'prayer' THEN NULL ELSE email END AS email, " +
    "CASE WHEN mode = 'prayer' THEN NULL ELSE answers END AS answers, " +
    'notified, notify_error, cleared',
};

/** The minimum of the D1 binding this file uses. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[] }>;
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
}

/** The real store over the CONTACT_DB binding. */
export function d1Store(db: D1Like): MessageStore {
  return {
    async tables() {
      const r = await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('contact_submissions', 'form_submissions', 'message_status')",
        )
        .bind()
        .all<{ name: string }>();
      return new Set(r.results.map((t) => t.name));
    },
    async list(source, limit) {
      const r = await db
        .prepare(
          `SELECT ${LIST_COLUMNS[source]} FROM ${TABLE[source]} ORDER BY received_at DESC LIMIT ?`,
        )
        .bind(limit)
        .all<ContactRow | FormRow>();
      return r.results;
    },
    async get(source, id) {
      return db
        .prepare(`SELECT ${DETAIL_COLUMNS[source]} FROM ${TABLE[source]} WHERE id = ?`)
        .bind(id)
        .first<ContactRow | FormRow>();
    },
    async statuses() {
      const r = await db
        .prepare('SELECT source, message_id, status FROM message_status')
        .bind()
        .all<StatusRow>();
      return r.results;
    },
    async status(source, id) {
      const r = await db
        .prepare('SELECT status FROM message_status WHERE source = ? AND message_id = ?')
        .bind(source, id)
        .first<{ status: string }>();
      return r?.status;
    },
    async setStatus(source, id, status, at, by) {
      await db
        .prepare(
          'INSERT INTO message_status (source, message_id, status, updated_at, updated_by) VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT (source, message_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by',
        )
        .bind(source, id, status, at, by)
        .run();
    },
  };
}

// ---------------------------------------------------------------------------
// The handler behind /api/studio/messages/
// ---------------------------------------------------------------------------

export interface MessagesDeps {
  store: MessageStore | null;
  /** Same origin AND a Sanity project member, or null (src/lib/studio-auth.ts). */
  verify: (request: Request) => Promise<{ id: string } | null>;
  sameOrigin: (request: Request) => boolean;
  now?: () => Date;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * GET  /api/studio/messages/           -> { configured, statusReady, messages }
 * GET  /api/studio/messages/?key=form-3 -> { configured, message }
 * POST /api/studio/messages/ { key, status } -> { ok, status }
 * Every method: same origin and a signed-in member first, before the database
 * is even looked at. A missing binding is { configured: false }, which the
 * tool shows as "Forms are not set up yet".
 */
export async function handleMessages(request: Request, deps: MessagesDeps): Promise<Response> {
  if (!deps.sameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await deps.verify(request);
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);
  if (!deps.store) return json({ ok: true, configured: false });

  const store = deps.store;
  let tables: Set<string>;
  try {
    tables = await store.tables();
  } catch {
    return json({ ok: false, error: 'The messages database did not answer.' }, 502);
  }
  const has = (s: MessageSource) => tables.has(TABLE[s]);
  const statusReady = tables.has('message_status');
  if (!has('contact') && !has('form')) return json({ ok: true, configured: false });

  if (request.method === 'GET') {
    const key = parseKey(new URL(request.url).searchParams.get('key'));
    if (key) {
      if (!has(key.source)) return json({ ok: false, error: 'Message not found.' }, 404);
      const row = await store.get(key.source, key.id);
      if (!row) return json({ ok: false, error: 'Message not found.' }, 404);
      const stored = statusReady ? await store.status(key.source, key.id) : undefined;
      const message =
        key.source === 'contact'
          ? contactDetail(row as ContactRow, stored)
          : formDetail(row as FormRow, stored);
      return json({ ok: true, configured: true, statusReady, message });
    }
    const [contacts, forms, statuses] = await Promise.all([
      has('contact') ? store.list('contact', LIST_LIMIT) : Promise.resolve([]),
      has('form') ? store.list('form', LIST_LIMIT) : Promise.resolve([]),
      statusReady ? store.statuses() : Promise.resolve([]),
    ]);
    return json({
      ok: true,
      configured: true,
      statusReady,
      messages: mergeList(contacts as ContactRow[], forms as FormRow[], statuses),
    });
  }

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => null)) as {
      key?: unknown;
      status?: unknown;
    } | null;
    const key = parseKey(body?.key);
    if (!key || !isStatus(body?.status)) {
      return json({ ok: false, error: 'That request was not understood.' }, 400);
    }
    if (!statusReady) {
      return json({ ok: false, error: 'The inbox needs its database update first.' }, 409);
    }
    if (!has(key.source) || !(await store.get(key.source, key.id))) {
      return json({ ok: false, error: 'Message not found.' }, 404);
    }
    const at = (deps.now ?? (() => new Date()))().toISOString();
    await store.setStatus(key.source, key.id, body.status, at, user.id);
    return json({ ok: true, status: body.status });
  }

  return json({ ok: false, error: 'Not allowed.' }, 405);
}
