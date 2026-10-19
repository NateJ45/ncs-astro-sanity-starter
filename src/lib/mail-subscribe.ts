// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// mail-subscribe - joining and leaving the newsletter list (PORTS.md card 121)
// =============================================================================
// DOUBLE OPT-IN. Signing up stores the address as "pending" and emails a signed
// link (src/lib/mail-token.ts). Only following that link makes it "subscribed",
// and only subscribed addresses ever get an issue. So nobody can sign a
// stranger up, and the list holds addresses that really asked.
//
// WHAT IS KEPT: the address, its status (pending, subscribed, unsubscribed) and
// when each change happened. The optional name is used once, to say hello in
// the confirmation email, and is not stored.
//
// THE SAME ANSWER WHATEVER THE LIST HOLDS. "Check your inbox" is returned for a
// new address, a pending one and one that is already subscribed, so the form
// cannot be used to find out who is on the list. An already-subscribed address
// gets no email at all; a pending one gets the link again at most every
// RESEND_AFTER_MINUTES.
//
// Unsubscribing never expires and never asks to log in: the link in the footer
// of every issue (and the List-Unsubscribe header Gmail and Apple Mail show as
// a button) is enough, one click, as CAN-SPAM and Gmail's sender rules ask.
//
// The routes (src/pages/api/subscribe/*.ts, src/pages/api/unsubscribe.ts) are
// thin; everything here takes its database, sender and secret as arguments so
// src/lib/mail-subscribe.test.ts runs it against real SQLite.
// =============================================================================
import { nowIso, type D1Database } from './mail-db.ts';
import { normalizeEmail, type Mailer } from './mail-send.ts';
import { renderEmail, type MailBrand } from './mail-template.ts';
import { confirmToken, verifyToken } from './mail-token.ts';

export const RESEND_AFTER_MINUTES = 10;
/** A pending address nobody confirmed is forgotten after this many days. */
export const PENDING_FORGET_DAYS = 30;

export interface ListDeps {
  db: D1Database | null;
  mailer: Mailer | null;
  /** MAIL_SECRET when it is long enough (secretUsable), else null. */
  secret: string | null;
  /** The site's origin for links in the email, e.g. https://example.org */
  origin: string;
  brand: MailBrand;
  /** Postal address for the footer. */
  address: string;
  /** What the list is called in sentences ("the First Baptist newsletter"). */
  listName: string;
  now?: () => number;
}

export const listReady = (d: ListDeps): boolean => Boolean(d.db && d.mailer && d.secret);

export interface SubscribeAnswer {
  status: number;
  body: {
    ok: boolean;
    pending?: boolean;
    unavailable?: boolean;
    error?: string;
    errors?: Record<string, string>;
  };
}

interface SubscriberRow {
  id: number;
  email: string;
  status: 'pending' | 'subscribed' | 'unsubscribed';
  confirm_sent_at: string | null;
}

const firstName = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  return (
    raw
      .replace(/[\r\n<>]/g, ' ')
      .trim()
      .split(/\s+/)[0]
      ?.slice(0, 40) ?? ''
  );
};

/** The confirmation email. Exported for the template screenshot and the tests. */
export function confirmationEmail(d: ListDeps, url: string, name: string) {
  return renderEmail({
    brand: d.brand,
    preheader: 'One click and you are on the list.',
    title: 'Please confirm your email',
    blocks: [
      {
        kind: 'paragraph',
        text: `${name ? `Hi ${name},` : 'Hello,'}\n\nThanks for signing up for ${d.listName}. Press the button to confirm this is your address, and the next issue will come to you.`,
      },
      { kind: 'button', label: 'Yes, sign me up', url },
      {
        kind: 'paragraph',
        text: 'If you did not ask for this, ignore this email and nothing will happen. You will not hear from us again.',
      },
    ],
    footer: {
      address: d.address,
      reason: `Someone asked for ${d.listName} to come to this address.`,
    },
  });
}

/** POST /api/subscribe/ */
export async function subscribe(
  raw: Record<string, unknown>,
  d: ListDeps,
): Promise<SubscribeAnswer> {
  const now = d.now?.() ?? Date.now();
  // A bot that fills the hidden box gets the answer a person gets, and nothing happens.
  const trap = [raw.website, raw.company].some((v) => typeof v === 'string' && v.trim() !== '');
  if (trap) return { status: 200, body: { ok: true, pending: true } };

  const email = normalizeEmail(raw.email);
  if (!email) {
    return {
      status: 422,
      body: { ok: false, errors: { email: 'Please enter a valid email address.' } },
    };
  }
  if (!listReady(d) || !d.db || !d.mailer || !d.secret) {
    return {
      status: 503,
      body: { ok: false, unavailable: true, error: 'Sign-up is not switched on yet.' },
    };
  }
  const db = d.db;

  // Housekeeping: forget addresses that never confirmed.
  await db
    .prepare(`DELETE FROM subscribers WHERE status = 'pending' AND created_at < ?`)
    .bind(nowIso(now - PENDING_FORGET_DAYS * 86_400_000))
    .run()
    .catch(() => undefined);

  const row = await db
    .prepare(`SELECT id, email, status, confirm_sent_at FROM subscribers WHERE email = ?`)
    .bind(email)
    .first<SubscriberRow>();

  if (row?.status === 'subscribed') return { status: 200, body: { ok: true, pending: true } };
  if (
    row?.status === 'pending' &&
    row.confirm_sent_at &&
    now - Date.parse(row.confirm_sent_at) < RESEND_AFTER_MINUTES * 60_000
  ) {
    return { status: 200, body: { ok: true, pending: true } };
  }

  if (!row) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO subscribers (email, status, created_at) VALUES (?, 'pending', ?)`,
      )
      .bind(email, nowIso(now))
      .run();
  } else if (row.status === 'unsubscribed') {
    // Coming back means confirming again.
    await db
      .prepare(
        `UPDATE subscribers SET status = 'pending', created_at = ?, confirm_sent_at = NULL WHERE id = ?`,
      )
      .bind(nowIso(now), row.id)
      .run();
  }

  const token = await confirmToken(d.secret, email, now);
  const url = `${d.origin}/api/subscribe/confirm/?t=${token}`;
  const mail = confirmationEmail(d, url, firstName(raw.name));
  const sent = await d.mailer.send({
    to: email,
    subject: `Please confirm: ${d.listName}`,
    ...mail,
  });
  if (!sent.ok) {
    console.error('[subscribe] confirmation email failed:', sent.error);
    return {
      status: 502,
      body: {
        ok: false,
        error: 'We could not send the confirmation email. Please try again later.',
      },
    };
  }
  await db
    .prepare(`UPDATE subscribers SET confirm_sent_at = ? WHERE email = ?`)
    .bind(nowIso(now), email)
    .run();
  return { status: 200, body: { ok: true, pending: true } };
}

export type LinkOutcome = 'confirmed' | 'unsubscribed' | 'invalid' | 'unavailable';

/** GET /api/subscribe/confirm/?t= */
export async function confirmSubscription(token: unknown, d: ListDeps): Promise<LinkOutcome> {
  if (!d.db || !d.secret) return 'unavailable';
  const now = d.now?.() ?? Date.now();
  const payload = await verifyToken(d.secret, token, 'confirm', now);
  const email = payload ? normalizeEmail(payload.e) : null;
  if (!email) return 'invalid';
  // The link proves the address asked; if the pending row was forgotten, add it back.
  await d.db
    .prepare(
      `INSERT INTO subscribers (email, status, created_at, confirmed_at) VALUES (?, 'subscribed', ?, ?)
       ON CONFLICT(email) DO UPDATE SET status = 'subscribed', confirmed_at = excluded.confirmed_at, unsubscribed_at = NULL
       WHERE subscribers.status != 'subscribed'`,
    )
    .bind(email, nowIso(now), nowIso(now))
    .run();
  return 'confirmed';
}

/** POST /api/unsubscribe/?t= (the footer link's button, and the one-click header). */
export async function unsubscribe(token: unknown, d: ListDeps): Promise<LinkOutcome> {
  if (!d.db || !d.secret) return 'unavailable';
  const now = d.now?.() ?? Date.now();
  const payload = await verifyToken(d.secret, token, 'unsub', now);
  const email = payload ? normalizeEmail(payload.e) : null;
  if (!email) return 'invalid';
  await d.db
    .prepare(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE email = ? AND status != 'unsubscribed'`,
    )
    .bind(nowIso(now), email)
    .run();
  return 'unsubscribed';
}

export interface ListCounts {
  subscribed: number;
  pending: number;
}

export async function listCounts(db: D1Database): Promise<ListCounts> {
  const rows =
    (
      await db
        .prepare(`SELECT status, COUNT(*) AS n FROM subscribers GROUP BY status`)
        .all<{ status: string; n: number }>()
    ).results ?? [];
  const n = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return { subscribed: n('subscribed'), pending: n('pending') };
}
