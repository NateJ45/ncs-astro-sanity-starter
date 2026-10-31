// Safe to edit by hand
// =============================================================================
// /api/form/ - where the form builder's forms are sent (PORTS.md card 194)
// =============================================================================
// The Form block (src/components/sections/FormSection.astro) posts here. The
// Contact page keeps its own endpoint, /api/contact/ (PORTABLE). Both share the
// pure helpers (honeypot and timing check, email check, the recipient lookup).
//
// GET  /api/form/?id=<form id>  -> { ready }  Can forms be delivered at all?
//      The block asks before it shows a form, and shows "please use the contact
//      page" until the answer is yes. It says nothing about the configuration.
// POST /api/form/                -> { ok } | { ok: false, errors | error | unavailable }
//
// THE ORDER (the same as the contact endpoint, PORTS.md card 45):
//   1. refuse a body over MAX_BODY_BYTES; drop bots silently (honeypot, too fast);
//   2. a best-effort per-visitor limit (10 sends in 15 minutes per isolate);
//   3. load the form from Sanity (published only) and check the answers against
//      ITS questions (src/lib/site-form.ts), never trusting the page;
//   4. Turnstile, when TURNSTILE_SECRET is set;
//   5. STORE in D1 (CONTACT_DB, table form_submissions) before anything else;
//   6. email the form's recipient (the email backbone, else Web3Forms);
//   7. a PRIVATE form whose email was accepted has its words cleared from D1,
//      so the recipient's inbox is the only lasting copy.
//
// NO PERSONAL DATA IN SANITY: nothing here ever writes to the dataset. The
// Studio's Messages tool (src/lib/studio-messages.ts) reads the D1 rows.
//
// THE WORKER'S SETTINGS (all optional; OPERATIONS.md "Forms" has the commands):
//   CONTACT_DB         D1 binding, shared with the contact form. The safety net: on its own it
//                      does not switch forms on (a message must reach a person).
//   EMAIL / RESEND_API_KEY + MAIL_FROM (or CONTACT_FROM): the email backbone (card 127).
//   Recipient addresses: an administrator sets each key's address in the Studio
//                      (Site settings > Forms; D1 form_recipient_addresses, card 174). The
//                      FORM_RECIPIENTS secret (JSON of key to address) is the fallback; a key
//                      with no address goes to "office", then to CONTACT_TO.
//   WEB3FORMS_KEY      fallback transport (it emails the Web3Forms account's own address).
//   TURNSTILE_SECRET   spam check, with PUBLIC_TURNSTILE_SITE_KEY at build.
//   MAIL_TEST_FIXTURES "1" lets the made-up fixture forms through, for `npm run preview` only
//                      (.dev.vars). Never in production.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { looksAutomated } from '@/lib/contact-submission';
import {
  DEFAULT_RECIPIENT,
  MAX_BODY_BYTES,
  buildFormNotification,
  normalizeForm,
  parseRecipients,
  validateFormSubmission,
  type CleanFormSubmission,
  type RawFormSubmission,
  type SiteForm,
} from '@/lib/site-form';
import { FIXTURE_FORMS } from '@/lib/site-form-fixtures';
import { fixturesOn } from '@/lib/mail-fixtures';
import { confirmedAddresses, recipientAddressFor } from '@/lib/form-recipients';
import { FailureLimiter } from '@/lib/private-pages';
import type { D1Database } from '@/lib/mail-db';
import { sanityFetch } from '@/lib/sanity';
import { site } from '@/data/site';
import { workerMailer, type MailWorkerEnv } from '@/lib/mail-env';
import { reportToInbox, type InboxEnv } from '@/lib/site-inbox';

export const prerender = false;

interface FormEnv extends Omit<MailWorkerEnv, 'CONTACT_DB'> {
  CONTACT_DB?: D1Database;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  FORM_RECIPIENTS?: string;
  WEB3FORMS_KEY?: string;
  TURNSTILE_SECRET?: string;
  MAIL_TEST_FIXTURES?: string;
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

/** Ten sends per visitor in fifteen minutes, per Worker isolate (best effort, bounded). */
const sends = new FailureLimiter(10, 15 * 60 * 1000);

/**
 * Can a submission reach a PERSON? An email path is required: the backbone's sender and
 * somewhere to send (a Studio address, FORM_RECIPIENTS or CONTACT_TO), or Web3Forms. The database
 * alone is a safety net nobody may read, so it does not count.
 */
const canDeliver = (e: FormEnv, fromD1: Record<string, string>): boolean =>
  Boolean(
    (workerMailer(e).mailer &&
      (Object.keys(fromD1).length ||
        Object.keys(parseRecipients(e.FORM_RECIPIENTS)).length ||
        e.CONTACT_TO)) ||
    e.WEB3FORMS_KEY,
  );

const ID = /^[A-Za-z0-9][\w.-]{0,119}$/;

/** The published form, or a fixture form when the Worker allows them. */
async function loadForm(e: FormEnv, id: string): Promise<SiteForm | null> {
  if (!ID.test(id) || id.startsWith('drafts.')) return null;
  if (id.startsWith('fixture-')) {
    return fixturesOn(e.MAIL_TEST_FIXTURES) ? normalizeForm(FIXTURE_FORMS[id]) : null;
  }
  const raw = await sanityFetch<Record<string, unknown> | null>(
    `*[_type == "form" && _id == $id][0]{
      _id, title, mode, askForContact, allowAnonymous, questions, recipient
    }`,
    { id },
    null,
  ).catch(() => null);
  return normalizeForm(raw);
}

async function passesTurnstile(
  secret: string | undefined,
  token: string | null,
  ip: string | null,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    // An outage must not eat a real message; the honeypot and timing check still stand.
    return true;
  }
}

/** Email the recipient. Returns null on success, else why it failed. */
async function notify(
  e: FormEnv,
  form: SiteForm,
  s: CleanFormSubmission,
  fromD1: Record<string, string>,
): Promise<string | null> {
  const note = buildFormNotification(form, s, site.name);
  // D1 first (set by an administrator in the Studio, confirmed), then the secret.
  const to = recipientAddressFor(
    form.recipient,
    fromD1,
    parseRecipients(e.FORM_RECIPIENTS),
    e.CONTACT_TO,
    DEFAULT_RECIPIENT,
  );
  const { mailer, reason } = workerMailer(e);
  let failure: string | null = reason ?? 'no recipient address';
  if (mailer && to) {
    const r = await mailer.send({
      to,
      fromName: `${site.name} website`,
      subject: note.subject,
      text: note.text,
      html: note.html,
      replyTo: note.replyTo || undefined,
    });
    if (r.ok) return null;
    failure = r.error ?? 'send failed';
  }
  if (e.WEB3FORMS_KEY) {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          access_key: e.WEB3FORMS_KEY,
          subject: note.subject,
          from_name: site.name,
          name: s.name || 'Sent without a name',
          email: s.email || undefined,
          message: note.text,
        }),
      });
      return res.ok ? null : `web3forms responded ${res.status}`;
    } catch (err) {
      return err instanceof Error ? err.message : 'web3forms request failed';
    }
  }
  return failure;
}

export const GET: APIRoute = async () => {
  const e = env as unknown as FormEnv;
  return json({ ready: canDeliver(e, await confirmedAddresses(e.CONTACT_DB)) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const e = env as unknown as FormEnv;

  // ---- Size first: never parse a body bigger than any real form ------------
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'That is too much to send at once.' }, 413);
  }
  let raw: RawFormSubmission;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'That is too much to send at once.' }, 413);
    }
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
    raw = parsed as RawFormSubmission;
  } catch {
    return json({ ok: false, error: 'Could not read that form.' }, 400);
  }

  // Silent on purpose: a bot gets the same answer a person does.
  if (looksAutomated(raw, Date.now()).automated) return json({ ok: true });

  const ip = request.headers.get('cf-connecting-ip');
  const who = ip ?? 'unknown';
  if (!sends.allowed(who, Date.now())) {
    const wait = sends.retryAfter(who, Date.now());
    return json(
      { ok: false, error: 'That is a lot of messages in a short time. Please try again later.' },
      429,
      { 'retry-after': String(wait) },
    );
  }

  const fromD1 = await confirmedAddresses(e.CONTACT_DB);
  if (!canDeliver(e, fromD1)) {
    console.error('[form] no email path (the email backbone and a recipient, or Web3Forms)');
    return json({ ok: false, unavailable: true, error: 'This form is not switched on yet.' }, 503);
  }

  const form = await loadForm(e, typeof raw.formId === 'string' ? raw.formId : '');
  if (!form) return json({ ok: false, error: 'That form could not be found.' }, 404);

  const { ok, errors, value } = validateFormSubmission(form, raw, new Date(), site.timeZone);
  if (!ok || !value) return json({ ok: false, errors }, 422);

  if (!(await passesTurnstile(e.TURNSTILE_SECRET, value.turnstileToken, ip))) {
    return json({ ok: false, error: 'That did not pass the spam check. Please try again.' }, 403);
  }
  sends.fail(who, Date.now());

  // ---- Store first ----------------------------------------------------------
  let rowId: number | null = null;
  if (e.CONTACT_DB) {
    try {
      const res = await e.CONTACT_DB.prepare(
        `INSERT INTO form_submissions
           (received_at, form_id, form_title, recipient, mode, name, email, answers, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          new Date().toISOString(),
          form.id,
          form.title,
          form.recipient,
          form.mode,
          value.name || null,
          value.email || null,
          JSON.stringify(value.answers),
          request.headers.get('cf-ipcountry') ?? null,
        )
        .run();
      rowId = (res.meta?.last_row_id as number | undefined) ?? null;
    } catch (err) {
      console.error('[form] could not store submission:', err);
    }
  }

  // ---- Then notify ------------------------------------------------------------
  const failure = await notify(e, form, value, fromD1);

  if (rowId !== null && e.CONTACT_DB) {
    try {
      // A private form that reached its recipient is cleared from the database.
      const clear = !failure && form.mode === 'private';
      await e.CONTACT_DB.prepare(
        clear
          ? `UPDATE form_submissions SET notified = 1, notify_error = NULL, answers = NULL, name = NULL, email = NULL, cleared = 1 WHERE id = ?`
          : `UPDATE form_submissions SET notified = ?, notify_error = ? WHERE id = ?`,
      )
        .bind(...(clear ? [rowId] : [failure ? 0 : 1, failure, rowId]))
        .run();
    } catch (err) {
      console.error('[form] could not record the notification state:', err);
    }
  }

  // Stored but not sent is still a success for the visitor: the row keeps it.
  if (failure) {
    console.error('[form] notification failed:', failure);
    if (rowId === null) {
      return json({ ok: false, unavailable: true, error: 'Sorry, that did not send.' }, 502);
    }
  }

  // The dashboard Inbox (card 210): a private form sends its title only.
  const open = form.mode !== 'private';
  reportToInbox(env as unknown as InboxEnv, locals, {
    id: `form-${rowId ?? crypto.randomUUID()}`,
    form: 'form',
    subject: form.title,
    name: open ? value.name : undefined,
    preview: open ? value.answers.map((a) => `${a.label}: ${a.value}`).join('; ') : undefined,
  });
  return json({ ok: true });
};

/** Anything else. */
export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
