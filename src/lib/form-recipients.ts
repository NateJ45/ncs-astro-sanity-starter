// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// form-recipients - where form messages go, set in the Studio (PORTS.md card 174)
// =============================================================================
// A form sends to a recipient KEY. The Contact page's key is "contact"; a site with more forms
// can name others ("office", "events"). Without this file the address behind a key lives only in
// a Worker secret or var (CONTACT_TO, and on some sites FORM_RECIPIENTS), so changing it means
// asking whoever looks after the website. With it, a signed-in Studio ADMINISTRATOR sets it from
// Site settings > Forms, and it is kept in the Worker's own D1 database (CONTACT_DB, table
// form_recipient_addresses, migrations/*_form_recipients.sql), never in the public dataset.
//
// A NEW ADDRESS IS CONFIRMED BEFORE IT IS USED. Saving one keeps it as "pending" and, when the
// email backbone is set up (a sender plus MAIL_SECRET), emails it a link; the address starts
// receiving messages only once someone presses "Yes" on that link's page. Until then messages
// keep going where they went before. Without the email backbone the address is stored as
// unconfirmed and the Studio says so plainly: nothing is sent to it.
//
// WHERE A MESSAGE GOES (recipientAddressFor): this key's confirmed D1 address, else the secret's
// address for it, else the fallback key's (D1, then secret; "office" unless the caller names
// another), else the Contact address (D1 "contact", then CONTACT_TO). The Contact form itself
// uses contactRecipient(): the confirmed "contact" row, else CONTACT_TO. D1 first, then the
// secret, so a site that never opens the panel (or never applies the migration) behaves
// exactly as before.
//
// Pure apart from the injected database, mailer and clock, so form-recipients.test.ts runs the
// real SQL on node:sqlite (mail-sqlite.ts) and drives every branch. Per-site words (the Studio
// panel, the routes' colours) live in the non-marked callers, so this file stays identical in
// every repo.
// =============================================================================

import type { D1Database } from './mail-db.ts';
import type { Mailer } from './mail-send.ts';
import { looksLikeEmail } from './contact-submission.ts';

/** The D1 table; migrations/*_form_recipients.sql is checked against it by the test. */
export const FORM_RECIPIENTS_DDL = `
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
`.trim();

/** The Contact page's own address. */
export const CONTACT_KEY = 'contact';

/** The key a form falls back to when its own has no address (callers may name another). */
export const FALLBACK_KEY = 'office';

/** A recipient key as Site settings > Forms writes it ("office"), or "contact". */
export const RECIPIENT_KEY = /^[a-z][a-z0-9-]{1,30}$/;

/** How long a confirmation link works. */
export const CONFIRM_DAYS = 7;

export interface RecipientRow {
  key: string;
  /** In use, or null. */
  email: string | null;
  confirmedAt: string | null;
  pendingEmail: string | null;
  pendingSince: string | null;
  pendingStatus: 'sent' | 'unconfirmed' | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface DbRow {
  recipient_key: string;
  email: string | null;
  confirmed_at: string | null;
  pending_email: string | null;
  pending_since: string | null;
  pending_status: string | null;
  updated_at: string;
  updated_by: string | null;
}

const toRow = (r: DbRow): RecipientRow => ({
  key: r.recipient_key,
  email: r.email,
  confirmedAt: r.confirmed_at,
  pendingEmail: r.pending_email,
  pendingSince: r.pending_since,
  pendingStatus:
    r.pending_status === 'sent' || r.pending_status === 'unconfirmed' ? r.pending_status : null,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
});

export async function listRecipientRows(db: D1Database): Promise<RecipientRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM form_recipient_addresses ORDER BY recipient_key')
    .all<DbRow>();
  return (results ?? []).map(toRow);
}

async function getRow(db: D1Database, key: string): Promise<RecipientRow | null> {
  const r = await db
    .prepare('SELECT * FROM form_recipient_addresses WHERE recipient_key = ?')
    .bind(key)
    .first<DbRow>();
  return r ? toRow(r) : null;
}

/** The confirmed addresses, key to address. Anything that fails reads as empty (the secret then decides). */
export async function confirmedAddresses(
  db: D1Database | null | undefined,
): Promise<Record<string, string>> {
  if (!db) return {};
  try {
    const { results } = await db
      .prepare('SELECT recipient_key, email FROM form_recipient_addresses WHERE email IS NOT NULL')
      .all<{ recipient_key: string; email: string }>();
    const out: Record<string, string> = {};
    for (const r of results ?? []) {
      if (RECIPIENT_KEY.test(r.recipient_key) && looksLikeEmail(r.email)) {
        out[r.recipient_key] = r.email;
      }
    }
    return out;
  } catch {
    // No table yet (the migration not applied): behave exactly as before.
    return {};
  }
}

/**
 * Where a form with this recipient key goes: D1 first, then the secret, key by key; then the
 * fallback key ("office" by default); then the Contact address. Null when there is nowhere at all.
 */
export function recipientAddressFor(
  key: string,
  fromD1: Record<string, string>,
  fromSecret: Record<string, string>,
  contactTo?: string | null,
  fallbackKey: string = FALLBACK_KEY,
): string | null {
  const merged: Record<string, string> = { ...fromSecret, ...fromD1 };
  delete merged[CONTACT_KEY];
  const contact = fromD1[CONTACT_KEY] ?? (contactTo?.trim() || null);
  return merged[key] ?? merged[fallbackKey] ?? contact;
}

/**
 * The Contact page form's address: the confirmed "contact" row, else CONTACT_TO. Null when
 * neither is set. A missing database or table reads as "no row", so CONTACT_TO decides.
 */
export async function contactRecipient(
  db: D1Database | null | undefined,
  contactTo: string | null | undefined,
): Promise<string | null> {
  const fromD1 = await confirmedAddresses(db);
  return fromD1[CONTACT_KEY] ?? (contactTo?.trim() || null);
}

// ── Signed confirmation links ────────────────────────────────────────────────
// The same idea as the newsletter's links (mail-token.ts, MAIL_SECRET), with its own purpose and
// its own key derivation, so a newsletter link can never be replayed here or the other way.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(`form-recipient|${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface RecipientToken {
  /** Recipient key. */
  k: string;
  /** The address, lower-cased. */
  e: string;
  /** Expiry, epoch seconds. */
  x: number;
}

export async function recipientToken(
  secret: string,
  key: string,
  email: string,
  nowMs: number,
): Promise<string> {
  const payload: RecipientToken = {
    k: key,
    e: email.toLowerCase(),
    x: Math.floor(nowMs / 1000) + CONFIRM_DAYS * 86_400,
  };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

export async function readRecipientToken(
  secret: string,
  token: unknown,
  nowMs: number,
): Promise<RecipientToken | null> {
  if (typeof token !== 'string' || token.length > 1000) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const given = unb64url(sig);
  if (!given || !sameBytes(given, await hmac(secret, body))) return null;
  const raw = unb64url(body);
  if (!raw) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(raw)) as RecipientToken;
    if (typeof p?.k !== 'string' || typeof p.e !== 'string' || typeof p.x !== 'number') return null;
    if (!RECIPIENT_KEY.test(p.k) || p.x * 1000 < nowMs) return null;
    return p;
  } catch {
    return null;
  }
}

// ── The Studio route: /api/studio/form-recipients/ ───────────────────────────

export interface RecipientUser {
  id: string;
  roles: string[];
}

export interface RecipientDeps {
  sameOrigin: (request: Request) => boolean;
  verify: (request: Request) => Promise<RecipientUser | null>;
  db: D1Database | null;
  /** The email backbone's sender, or null. */
  mailer: Mailer | null;
  /** MAIL_SECRET when it is long enough, else null. */
  secret: string | null;
  /** The site's own origin, for the link. */
  origin: string;
  siteName: string;
  /** Which keys the Worker secret (FORM_RECIPIENTS) and CONTACT_TO already cover. */
  fallbacks: Record<string, boolean>;
  now?: () => number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Only a project administrator may change where messages go. */
export const isAdministrator = (u: RecipientUser) =>
  u.roles.some((r) => r.toLowerCase() === 'administrator');

/** The confirmation email. */
export function confirmationEmail(opts: { siteName: string; keyName: string; link: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const what = opts.keyName ? `"${opts.keyName}" messages` : 'messages';
  const subject = `Please confirm: website ${what} for ${opts.siteName}`;
  const text = [
    `Someone who looks after the ${opts.siteName} website asked for its ${what} to be sent to this address.`,
    '',
    `If that is right, open this link and press "Yes, send them to me":`,
    opts.link,
    '',
    `The link works for ${CONFIRM_DAYS} days. If you were not expecting this, ignore it and nothing will change.`,
  ].join('\n');
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html =
    `<p>Someone who looks after the ${esc(opts.siteName)} website asked for its ${esc(what)} to be sent to this address.</p>` +
    `<p><a href="${esc(opts.link)}">Confirm this address</a></p>` +
    `<p style="color:#666;font-size:13px">The link works for ${CONFIRM_DAYS} days. If you were not expecting this, ignore it and nothing will change.</p>`;
  return { subject, text, html };
}

async function sendConfirmation(
  deps: RecipientDeps,
  key: string,
  email: string,
  keyName: string,
  nowMs: number,
): Promise<boolean> {
  if (!deps.mailer || !deps.secret) return false;
  const token = await recipientToken(deps.secret, key, email, nowMs);
  const link = `${deps.origin}/api/form-recipient/confirm/?t=${encodeURIComponent(token)}`;
  const mail = confirmationEmail({ siteName: deps.siteName, keyName, link });
  const r = await deps.mailer.send({
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    fromName: `${deps.siteName} website`,
  });
  if (!r.ok) console.error('[form-recipients] confirmation send failed:', r.error);
  return r.ok;
}

export async function handleRecipientStudio(
  request: Request,
  deps: RecipientDeps,
): Promise<Response> {
  if (!deps.sameOrigin(request)) return json({ ok: false, error: 'Not allowed from here.' }, 403);
  const user = await deps.verify(request);
  if (!user) return json({ ok: false, error: 'Please sign in to the Studio again.' }, 401);
  if (!isAdministrator(user)) {
    return json(
      { ok: false, error: 'Only an administrator can see or change where form messages go.' },
      403,
    );
  }
  const canConfirm = Boolean(deps.mailer && deps.secret);
  if (!deps.db) {
    return json({ ok: false, configured: false, canConfirm, fallbacks: deps.fallbacks }, 503);
  }
  const db = deps.db;
  const nowMs = (deps.now ?? Date.now)();

  if (request.method === 'GET') {
    try {
      return json({
        ok: true,
        configured: true,
        canConfirm,
        fallbacks: deps.fallbacks,
        rows: await listRecipientRows(db),
      });
    } catch (err) {
      console.error('[form-recipients] could not read the table:', err);
      return json({ ok: false, configured: false, canConfirm, needsMigration: true }, 503);
    }
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    key?: unknown;
    email?: unknown;
    name?: unknown;
  } | null;
  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  if (!RECIPIENT_KEY.test(key)) return json({ ok: false, error: 'That is not a recipient.' }, 400);
  const keyName = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
  const at = new Date(nowMs).toISOString();
  const row = await getRow(db, key).catch(() => null);

  if (body?.action === 'clear') {
    await db
      .prepare('DELETE FROM form_recipient_addresses WHERE recipient_key = ?')
      .bind(key)
      .run();
    return json({ ok: true, status: 'cleared' });
  }

  if (body?.action === 'cancel') {
    if (row) {
      await db
        .prepare(
          `UPDATE form_recipient_addresses SET pending_email = NULL, pending_since = NULL,
             pending_status = NULL, updated_at = ?, updated_by = ? WHERE recipient_key = ?`,
        )
        .bind(at, user.id, key)
        .run();
    }
    return json({ ok: true, status: row?.email ? 'confirmed' : 'cleared' });
  }

  if (body?.action === 'resend') {
    if (!row?.pendingEmail) return json({ ok: false, error: 'There is no address waiting.' }, 409);
    const sent = await sendConfirmation(deps, key, row.pendingEmail, keyName, nowMs);
    await db
      .prepare(
        'UPDATE form_recipient_addresses SET pending_status = ?, updated_at = ? WHERE recipient_key = ?',
      )
      .bind(sent ? 'sent' : 'unconfirmed', at, key)
      .run();
    return json({ ok: true, status: sent ? 'sent' : 'unconfirmed', canConfirm });
  }

  if (body?.action !== 'set') return json({ ok: false, error: 'Unknown action.' }, 400);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !looksLikeEmail(email)) {
    return json({ ok: false, error: 'That email address does not look right.' }, 422);
  }
  if (row?.email && row.email.toLowerCase() === email) {
    // Already the address in use: nothing to confirm, and any waiting one is dropped.
    await db
      .prepare(
        `UPDATE form_recipient_addresses SET pending_email = NULL, pending_since = NULL,
           pending_status = NULL, updated_at = ?, updated_by = ? WHERE recipient_key = ?`,
      )
      .bind(at, user.id, key)
      .run();
    return json({ ok: true, status: 'confirmed', unchanged: true });
  }
  const sent = await sendConfirmation(deps, key, email, keyName, nowMs);
  const status = sent ? 'sent' : 'unconfirmed';
  await db
    .prepare(
      `INSERT INTO form_recipient_addresses
         (recipient_key, email, confirmed_at, pending_email, pending_since, pending_status, updated_at, updated_by)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)
       ON CONFLICT(recipient_key) DO UPDATE SET pending_email = excluded.pending_email,
         pending_since = excluded.pending_since, pending_status = excluded.pending_status,
         updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
    .bind(key, email, at, status, at, user.id)
    .run();
  return json({ ok: true, status, canConfirm });
}

// ── The confirmation page: /api/form-recipient/confirm/ ──────────────────────
// GET shows a page with one button (a link opened by a mail scanner changes nothing); the
// button POSTs the same token, and only then does the address start receiving messages.

export interface ConfirmDeps {
  db: D1Database | null;
  secret: string | null;
  siteName: string;
  /** The page's colours (light), from the site's brand; neutral when left out. */
  theme?: Partial<ConfirmTheme>;
  /** Dark colours for a site that ships a dark theme; left out, the page stays light. */
  darkTheme?: Partial<ConfirmTheme>;
  now?: () => number;
}

export interface ConfirmTheme {
  background: string;
  text: string;
  heading: string;
  button: string;
  buttonText: string;
}

const NEUTRAL: ConfirmTheme = {
  background: '#fbfbfa',
  text: '#2a2d31',
  heading: '#2a2d31',
  button: '#2a2d31',
  buttonText: '#ffffff',
};

/** A colour as CSS, or the fallback when it is not a plain #hex value (no injection). */
const hex = (v: string | undefined, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : fallback;

function themeCss(t: Partial<ConfirmTheme> | undefined, base: ConfirmTheme): string {
  const c = {
    background: hex(t?.background, base.background),
    text: hex(t?.text, base.text),
    heading: hex(t?.heading, base.heading),
    button: hex(t?.button, base.button),
    buttonText: hex(t?.buttonText, base.buttonText),
  };
  return `--bg:${c.background};--ink:${c.text};--head:${c.heading};--btn:${c.button};--btn-ink:${c.buttonText}`;
}

function page(
  deps: Pick<ConfirmDeps, 'siteName' | 'theme' | 'darkTheme'>,
  title: string,
  inner: string,
  status = 200,
): Response {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const light = themeCss(deps.theme, NEUTRAL);
  const dark = deps.darkTheme
    ? `@media (prefers-color-scheme:dark){:root{color-scheme:dark;${themeCss(deps.darkTheme, NEUTRAL)}}}`
    : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | ${esc(deps.siteName)}</title><style>:root{color-scheme:light;${light}}${dark}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:34rem;margin:12vh auto;padding:0 20px}h1{font-size:1.6rem;line-height:1.2;margin:0 0 .75rem;color:var(--head)}button{min-height:48px;padding:10px 22px;border:0;border-radius:8px;background:var(--btn);color:var(--btn-ink);font:inherit;font-weight:600;cursor:pointer}button:focus-visible{outline:3px solid var(--head);outline-offset:3px}p{margin:0 0 1rem;overflow-wrap:anywhere}</style></head><body><main><h1>${esc(title)}</h1>${inner}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}

const escHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function handleRecipientConfirm(
  request: Request,
  deps: ConfirmDeps,
): Promise<Response> {
  const nowMs = (deps.now ?? Date.now)();
  const expired = () =>
    page(
      deps,
      'This link has run out',
      '<p>It is more than a week old, or the address was changed again since. Ask whoever looks after the website to save the address once more, and a new link will come.</p>',
      410,
    );
  if (!deps.db || !deps.secret) {
    return page(deps, 'Not switched on', '<p>This website cannot confirm addresses yet.</p>', 503);
  }
  let token: unknown = new URL(request.url).searchParams.get('t');
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    token = form?.get('t');
  } else if (request.method !== 'GET') {
    return page(deps, 'Not allowed', '<p>Open the link from the email.</p>', 405);
  }
  const t = await readRecipientToken(deps.secret, token, nowMs);
  if (!t) return expired();
  const row = await getRow(deps.db, t.k).catch(() => null);
  if (row?.email?.toLowerCase() === t.e && !row.pendingEmail) {
    return page(deps, 'Already confirmed', `<p>Messages already come to ${escHtml(t.e)}.</p>`);
  }
  if (!row?.pendingEmail || row.pendingEmail.toLowerCase() !== t.e) return expired();

  if (request.method === 'GET') {
    return page(
      deps,
      'Send website messages to you?',
      `<p>Messages people send through the ${escHtml(deps.siteName)} website forms will come to <strong>${escHtml(t.e)}</strong>.</p>` +
        `<form method="post"><input type="hidden" name="t" value="${escHtml(String(token))}"><button type="submit">Yes, send them to me</button></form>`,
    );
  }
  const at = new Date(nowMs).toISOString();
  await deps.db
    .prepare(
      `UPDATE form_recipient_addresses SET email = pending_email, confirmed_at = ?,
         pending_email = NULL, pending_since = NULL, pending_status = NULL, updated_at = ?
       WHERE recipient_key = ? AND lower(pending_email) = ?`,
    )
    .bind(at, at, t.k, t.e)
    .run();
  return page(
    deps,
    'Thank you, that is confirmed',
    `<p>From now on, website messages for this form come to <strong>${escHtml(t.e)}</strong>. You can close this page.</p>`,
  );
}

/** Which keys already have somewhere to go without the Studio (for the Studio's words). */
export function fallbackKeys(
  secretMap: Record<string, string>,
  contactTo: string | null | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of Object.keys(secretMap)) out[k] = true;
  if (contactTo?.trim()) out[CONTACT_KEY] = true;
  return out;
}
