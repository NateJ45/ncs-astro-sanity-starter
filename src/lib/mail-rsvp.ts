// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// mail-rsvp - RSVPs for an event page (PORTS.md card 127)
// =============================================================================
// An "RSVP" section on any page (VBS, Easter breakfast, homecoming) asks for a
// name, an email, how many are coming and the editor's own questions
// (formQuestion, the same rows the forms use). /api/rsvp/ stores the reply in D1
// and emails a confirmation through the backbone (src/lib/mail-send.ts).
//
// THE EVENT IS THE BLOCK. Sites in the family keep their calendar elsewhere
// (FBC Auburn's lives in Church Trac), so there is no events collection: the
// RSVP block holds the event's name, time, capacity, waitlist switch and
// closing date. Its key is "<page id>:<block _key>", stable for the block's
// life. The route loads the PUBLISHED block from Sanity itself and never trusts
// the page for the capacity, the questions or the closing date.
//
// CAPACITY WITHOUT A RACE. The seat check and the insert are ONE SQL statement
// (INSERT ... SELECT ... WHERE the seats taken plus this party fit), and SQLite
// runs one statement at a time, so two replies arriving together cannot both
// take the last seats. A party that does not fit goes on the waitlist when the
// block allows one, and is told "full" when it does not.
//
// No payments, ever: a paid event links to the church's own payment page.
// =============================================================================
import { normalizeCustomFields, type CustomFormField } from './custom-form-fields.ts';
import { nowIso, type D1Database } from './mail-db.ts';
import { normalizeEmail } from './mail-send.ts';
import { renderEmail, type MailBrand } from './mail-template.ts';

export const MAX_PARTY_DEFAULT = 10;
export const MAX_ANSWER = 1000;

export interface RsvpEvent {
  /** "<published page id>:<block _key>" */
  key: string;
  name: string;
  /** ISO datetime, when the block has one. */
  startsAt: string | null;
  /** Free words: "Fellowship Hall", "Meet at the front doors". */
  where: string;
  /** Seats in total (people, not replies). Null = no limit. */
  capacity: number | null;
  waitlist: boolean;
  /** Replies stop at this time. Defaults to the start time. */
  closesAt: string | null;
  /** The most people one reply can bring. */
  maxParty: number;
  questions: CustomFormField[];
  /** Words added to the confirmation email ("Bring a towel"). */
  confirmationNote: string;
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ID = /^[A-Za-z0-9][\w.-]{0,119}$/;
const KEY = /^[A-Za-z0-9_-]{1,64}$/;

export function eventKey(pageId: string, blockKey: string): string | null {
  const page = pageId.replace(/^drafts\./, '');
  return ID.test(page) && KEY.test(blockKey) ? `${page}:${blockKey}` : null;
}

export function parseEventKey(key: unknown): { pageId: string; blockKey: string } | null {
  if (typeof key !== 'string') return null;
  const i = key.lastIndexOf(':');
  if (i < 1) return null;
  const pageId = key.slice(0, i);
  const blockKey = key.slice(i + 1);
  return ID.test(pageId) && !pageId.startsWith('drafts.') && KEY.test(blockKey)
    ? { pageId, blockKey }
    : null;
}

const isoOrNull = (v: unknown) =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;

/** The Sanity block, shaped and capped. Null when it cannot take replies (no name). */
export function normalizeRsvpBlock(raw: unknown, pageId: string): RsvpEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const key = eventKey(pageId, str(b._key, 64));
  const name = str(b.eventName, 120);
  if (!key || !name) return null;
  const cap = typeof b.capacity === 'number' && b.capacity > 0 ? Math.floor(b.capacity) : null;
  const maxParty =
    typeof b.maxParty === 'number' && b.maxParty >= 1
      ? Math.min(Math.floor(b.maxParty), 50)
      : MAX_PARTY_DEFAULT;
  const startsAt = isoOrNull(b.startsAt);
  return {
    key,
    name,
    startsAt,
    where: str(b.where, 200),
    capacity: cap,
    waitlist: b.waitlist === true,
    closesAt: isoOrNull(b.closesAt) ?? startsAt,
    maxParty,
    questions: normalizeCustomFields(b.questions),
    confirmationNote: str(b.confirmationNote, 1000),
  };
}

export const isClosed = (ev: RsvpEvent, now: number) =>
  ev.closesAt !== null && Date.parse(ev.closesAt) <= now;

export interface RawRsvp {
  name?: unknown;
  email?: unknown;
  partySize?: unknown;
  /** Answer per question index, as strings. A checkbox posts "yes" or nothing. */
  answers?: unknown;
  website?: unknown;
  renderedAt?: unknown;
}

export interface CleanRsvp {
  name: string;
  email: string;
  partySize: number;
  answers: Array<{ label: string; value: string }>;
}

export function validateRsvp(
  ev: RsvpEvent,
  raw: RawRsvp,
): { ok: boolean; errors: Record<string, string>; value?: CleanRsvp } {
  const errors: Record<string, string> = {};
  const name = str(raw.name, 120);
  if (!name) errors.name = 'Please tell us your name.';
  const email = normalizeEmail(raw.email);
  if (!email) errors.email = 'Please enter a valid email address, so we can confirm.';
  const party = Number(raw.partySize ?? 1);
  if (!Number.isInteger(party) || party < 1 || party > ev.maxParty) {
    errors.partySize = `Please choose between 1 and ${ev.maxParty}.`;
  }
  const given = (raw.answers && typeof raw.answers === 'object' ? raw.answers : {}) as Record<
    string,
    unknown
  >;
  const answers: CleanRsvp['answers'] = [];
  ev.questions.forEach((q, i) => {
    let value = str(given[String(i)], MAX_ANSWER);
    if (q.kind === 'checkbox') value = value ? 'Yes' : '';
    if (q.kind === 'select' && value && !q.options.includes(value)) value = '';
    if (q.kind === 'email' && value && !normalizeEmail(value)) {
      errors[`q${i}`] = 'Please check this email address.';
      return;
    }
    if (!value) {
      if (q.required) errors[`q${i}`] = 'Please answer this one.';
      return;
    }
    answers.push({ label: q.label, value });
  });
  if (Object.keys(errors).length || !email) return { ok: false, errors };
  return { ok: true, errors, value: { name, email, partySize: party, answers } };
}

export type Placement = { status: 'going' | 'waitlist'; id: number } | { status: 'full' };

/** Store the reply, deciding going / waitlist / full in the same statement as the insert. */
export async function placeRsvp(
  db: D1Database,
  ev: RsvpEvent,
  v: CleanRsvp,
  now: number,
): Promise<Placement> {
  const values = [
    ev.key,
    ev.name,
    nowIso(now),
    v.name,
    v.email,
    v.partySize,
    JSON.stringify(v.answers),
  ];
  if (ev.capacity === null) {
    const r = await db
      .prepare(
        `INSERT INTO rsvps (event_key, event_name, received_at, name, email, party_size, answers, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'going')`,
      )
      .bind(...values)
      .run();
    return { status: 'going', id: Number(r.meta?.last_row_id ?? 0) };
  }
  const going = await db
    .prepare(
      `INSERT INTO rsvps (event_key, event_name, received_at, name, email, party_size, answers, status)
       SELECT ?, ?, ?, ?, ?, ?, ?, 'going'
       WHERE (SELECT COALESCE(SUM(party_size), 0) FROM rsvps WHERE event_key = ? AND status = 'going') + ? <= ?`,
    )
    .bind(...values, ev.key, v.partySize, ev.capacity)
    .run();
  if (Number(going.meta?.changes ?? 0) === 1) {
    return { status: 'going', id: Number(going.meta?.last_row_id ?? 0) };
  }
  if (!ev.waitlist) return { status: 'full' };
  const r = await db
    .prepare(
      `INSERT INTO rsvps (event_key, event_name, received_at, name, email, party_size, answers, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'waitlist')`,
    )
    .bind(...values)
    .run();
  return { status: 'waitlist', id: Number(r.meta?.last_row_id ?? 0) };
}

export interface EventCounts {
  key: string;
  name: string;
  /** People (party sizes added up) with a place. */
  going: number;
  /** People waiting. */
  waiting: number;
  /** Replies, of either kind. */
  replies: number;
  latest: string | null;
}

export async function eventCounts(db: D1Database, key?: string): Promise<EventCounts[]> {
  const rows =
    (
      await db
        .prepare(
          `SELECT event_key AS key, MAX(event_name) AS name,
             COALESCE(SUM(CASE WHEN status = 'going' THEN party_size END), 0) AS going,
             COALESCE(SUM(CASE WHEN status = 'waitlist' THEN party_size END), 0) AS waiting,
             COUNT(*) AS replies, MAX(received_at) AS latest
           FROM rsvps ${key ? 'WHERE event_key = ?' : ''} GROUP BY event_key ORDER BY latest DESC`,
        )
        .bind(...(key ? [key] : []))
        .all<EventCounts>()
    ).results ?? [];
  return rows.map((r) => ({
    ...r,
    going: Number(r.going),
    waiting: Number(r.waiting),
    replies: Number(r.replies),
  }));
}

/** Seats left for the public form, or null for no limit. */
export async function seatsLeft(db: D1Database, ev: RsvpEvent): Promise<number | null> {
  if (ev.capacity === null) return null;
  const [c] = await eventCounts(db, ev.key);
  return Math.max(0, ev.capacity - (c?.going ?? 0));
}

export interface RsvpRow {
  id: number;
  received_at: string;
  name: string;
  email: string;
  party_size: number;
  status: string;
  answers: string | null;
}

export async function eventRows(db: D1Database, key: string): Promise<RsvpRow[]> {
  return (
    (
      await db
        .prepare(
          `SELECT id, received_at, name, email, party_size, status, answers FROM rsvps WHERE event_key = ? ORDER BY id`,
        )
        .bind(key)
        .all<RsvpRow>()
    ).results ?? []
  );
}

const csvCell = (v: string | number) => {
  let s = String(v);
  // A cell starting with = + - @ is a formula to a spreadsheet; neutralise it.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The organiser's download: one line per reply, one column per question. */
export function rsvpCsv(rows: RsvpRow[]): string {
  const parsed = rows.map((r) => {
    let answers: Array<{ label: string; value: string }> = [];
    try {
      answers = r.answers ? (JSON.parse(r.answers) as typeof answers) : [];
    } catch {
      answers = [];
    }
    return { r, answers };
  });
  const labels: string[] = [];
  for (const p of parsed)
    for (const a of p.answers) if (!labels.includes(a.label)) labels.push(a.label);
  const head = ['Received', 'Name', 'Email', 'How many', 'Status', ...labels];
  const lines = parsed.map(({ r, answers }) =>
    [
      r.received_at,
      r.name,
      r.email,
      r.party_size,
      r.status === 'waitlist' ? 'Waiting list' : r.status === 'going' ? 'Going' : r.status,
      ...labels.map((l) => answers.find((a) => a.label === l)?.value ?? ''),
    ]
      .map(csvCell)
      .join(','),
  );
  // The BOM makes Excel read the accents in names correctly.
  return `﻿${[head.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}

/** The "when" line, in the site's time zone. */
export function whenWords(iso: string | null, timeZone: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function rsvpConfirmationEmail(
  ev: RsvpEvent,
  v: CleanRsvp,
  status: 'going' | 'waitlist',
  opts: { brand: MailBrand; address: string; timeZone: string; pageUrl?: string },
) {
  const when = whenWords(ev.startsAt, opts.timeZone);
  const people = v.partySize === 1 ? 'one person' : `${v.partySize} people`;
  const details = [when && `When: ${when}`, ev.where && `Where: ${ev.where}`, `How many: ${people}`]
    .filter(Boolean)
    .join('\n');
  return renderEmail({
    brand: opts.brand,
    preheader:
      status === 'going'
        ? `You are booked in for ${ev.name}.`
        : `You are on the waiting list for ${ev.name}.`,
    title: status === 'going' ? `See you at ${ev.name}` : `You are on the waiting list`,
    blocks: [
      {
        kind: 'paragraph',
        text:
          status === 'going'
            ? `Hi ${v.name.split(/\s+/)[0]},\n\nThank you for letting us know you are coming. Here are the details.`
            : `Hi ${v.name.split(/\s+/)[0]},\n\n${ev.name} is full at the moment, so we have put you on the waiting list. If a place opens up, someone will be in touch.`,
      },
      { kind: 'paragraph', text: details },
      ...(v.answers.length
        ? [
            {
              kind: 'items' as const,
              heading: 'What you told us',
              items: v.answers.map((a) => ({ title: a.value, meta: a.label })),
            },
          ]
        : []),
      ...(ev.confirmationNote ? [{ kind: 'note' as const, text: ev.confirmationNote }] : []),
      ...(opts.pageUrl
        ? [{ kind: 'button' as const, label: 'See the event page', url: opts.pageUrl }]
        : []),
      {
        kind: 'paragraph',
        text: 'Plans changed? Just reply to this email and let us know.',
      },
    ],
    footer: {
      address: opts.address,
      reason: `You are getting this because you replied to the RSVP for ${ev.name}. This is a one-off email, not a mailing list.`,
    },
  });
}
