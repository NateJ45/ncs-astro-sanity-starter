// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
//
// The contact form's own endpoint. Runs on the Worker this site already ships.
//
// THE ORDER MATTERS MORE THAN ANYTHING ELSE HERE: store first, notify second.
// With a form service the email IS the record, so a message that bounces, gets
// spam-filtered, or is deleted never existed. Writing the row first means the
// enquiry survives a failed send, and a row with notified = 0 is a repairable
// problem rather than a lost customer.
//
// EVERYTHING IS OPTIONAL AND THE ROUTE SAYS WHICH PIECES ARE MISSING. A fresh
// clone has no database, no email binding and no keys, and must still build and
// answer sensibly: same principle as `sanityFetch` returning fallbacks with no
// Sanity project. What it must never do is tell a VISITOR about the
// configuration; they get a generic apology, the detail goes to the log.
//
// See PORTS.md card 45 for the setup, and why this exists rather than a form
// service.

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  validateSubmission,
  looksAutomated,
  buildNotification,
  type CleanSubmission,
} from '@/lib/contact-submission';
import { site } from '@/data/site';

export const prerender = false;

/**
 * The slice of D1 this endpoint uses, declared structurally rather than by
 * pulling in @cloudflare/workers-types. The dependency set here is a matched
 * pin (CLAUDE.md rule 8) and adding a package for one type is a poor trade;
 * this also documents exactly how much of D1 the route depends on.
 */
interface D1Lite {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<{ meta?: { last_row_id?: number } }> };
  };
}

interface ContactEnv {
  /** D1 database holding contact_submissions. */
  CONTACT_DB?: D1Lite;
  /** Cloudflare Email Sending binding. */
  EMAIL?: { send: (message: Record<string, unknown>) => Promise<{ messageId?: string }> };
  /** Where notifications go. Must be a verified destination on the free path. */
  CONTACT_TO?: string;
  /** Who they come from. Must belong to a domain onboarded for sending. */
  CONTACT_FROM?: string;
  /** Turnstile server key. Turnstile is skipped entirely when unset. */
  TURNSTILE_SECRET?: string;
  /** Server-side Web3Forms key, used only when there is no email binding. */
  WEB3FORMS_KEY?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/**
 * Turnstile, when configured. A missing secret means the site has not turned it
 * on, which is not a failure; a present secret and a bad token is.
 */
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
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A Turnstile outage must not eat a real enquiry. The honeypot and the
    // timing check are still in front of this.
    return true;
  }
}

/** Cloudflare Email Sending. Returns null on success, or the reason it failed. */
async function notifyByEmail(e: ContactEnv, s: CleanSubmission): Promise<string | null> {
  if (!e.EMAIL || !e.CONTACT_TO || !e.CONTACT_FROM) return 'email binding not configured';
  const note = buildNotification(s, site.name);

  const message: Record<string, unknown> = {
    to: e.CONTACT_TO,
    from: { email: e.CONTACT_FROM, name: `${site.name} contact form` },
    subject: note.subject,
    text: note.text,
    html: note.html,
  };

  try {
    // Reply-To is the difference between hitting reply and copying an address
    // out of the body. It is sent as a custom header, and the send is retried
    // WITHOUT it if the transport rejects the field: an enquiry that arrives
    // slightly less conveniently beats one that does not arrive.
    await e.EMAIL.send({ ...message, headers: [{ key: 'Reply-To', value: s.email }] });
    return null;
  } catch {
    try {
      await e.EMAIL.send(message);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'send failed';
    }
  }
}

/**
 * The fallback for a site with no email binding, which is any site not on the
 * Workers Paid plan or not using Cloudflare DNS. Same transport the starter
 * used before this endpoint existed, but the key now lives in a Worker secret
 * instead of the client bundle.
 */
async function notifyByWeb3Forms(e: ContactEnv, s: CleanSubmission): Promise<string | null> {
  if (!e.WEB3FORMS_KEY) return 'no notification transport configured';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        access_key: e.WEB3FORMS_KEY,
        name: s.name,
        email: s.email,
        subject: s.subject,
        message: s.message,
        from_name: site.name,
      }),
    });
    return res.ok ? null : `web3forms responded ${res.status}`;
  } catch (err) {
    return err instanceof Error ? err.message : 'web3forms request failed';
  }
}

export const POST: APIRoute = async ({ request }) => {
  const e = env as unknown as ContactEnv;

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }

  // Silent on purpose: a bot gets the same answer a person does. See
  // looksAutomated() for why.
  if (looksAutomated(raw, Date.now()).automated) return json({ ok: true });

  const { ok, errors, value } = validateSubmission(raw);
  if (!ok || !value) return json({ ok: false, errors }, 422);

  const ip = request.headers.get('cf-connecting-ip');
  if (!(await passesTurnstile(e.TURNSTILE_SECRET, value.turnstileToken, ip))) {
    return json({ ok: false, error: 'That did not pass the spam check. Please try again.' }, 403);
  }

  // ---- Store, before anything can go wrong with the email -----------------
  let rowId: number | null = null;
  if (e.CONTACT_DB) {
    try {
      const res = await e.CONTACT_DB.prepare(
        `INSERT INTO contact_submissions
           (received_at, name, email, subject, message, user_agent, country)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          new Date().toISOString(),
          value.name,
          value.email,
          value.subject,
          value.message,
          request.headers.get('user-agent')?.slice(0, 300) ?? null,
          request.headers.get('cf-ipcountry') ?? null,
        )
        .run();
      rowId = (res.meta?.last_row_id as number | undefined) ?? null;
    } catch (err) {
      // A database problem must not lose the message either: fall through and
      // still try to email it, then say so loudly in the log.
      console.error('[contact] could not store submission:', err);
    }
  }

  // ---- Notify -------------------------------------------------------------
  let failure = await notifyByEmail(e, value);
  if (failure) failure = await notifyByWeb3Forms(e, value);

  if (rowId !== null && e.CONTACT_DB) {
    try {
      await e.CONTACT_DB.prepare(
        `UPDATE contact_submissions SET notified = ?, notify_error = ? WHERE id = ?`,
      )
        .bind(failure ? 0 : 1, failure, rowId)
        .run();
    } catch (err) {
      console.error('[contact] could not record notification state:', err);
    }
  }

  // STORED BUT NOT SENT IS STILL A SUCCESS FOR THE VISITOR. They did their part
  // and the message exists; chasing the notification is the site owner's
  // problem, and the row records it. Only a submission that is neither stored
  // nor sent has actually failed.
  if (failure) {
    console.error('[contact] notification failed:', failure);
    if (rowId === null) {
      return json({ ok: false, error: 'Sorry, that did not send. Please email us directly.' }, 502);
    }
  }

  return json({ ok: true });
};

/** Anything but POST, including a browser opening the URL directly. */
export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
