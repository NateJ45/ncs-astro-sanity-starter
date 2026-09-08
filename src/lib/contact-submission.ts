// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
//
// The pure half of the contact endpoint: validation, spam heuristics, and the
// notification body. No bindings, no fetch, no Astro. That is what makes it
// unit-testable, and the reason the endpoint beside it is thin enough to read
// in one sitting.
//
// WHY THE SITE OWNS THIS AT ALL. A purely static site has nowhere to run code,
// so the usual answer is a third-party form service. Every site in this family
// ships a Cloudflare Worker anyway (the live preview and the SSR routes require
// one), so the constraint that justified outsourcing it does not apply here.
// Owning the endpoint buys three things a form service cannot: the submission
// is STORED before anyone tries to email it, the secret never sits in the
// client bundle, and there is no monthly submission ceiling.
//
// See PORTS.md card 45.

/** A submission as it arrives from the browser, before any trust is extended. */
export interface RawSubmission {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  subject?: unknown;
  /** Honeypot. Real people never fill this in; it is hidden from them. */
  company?: unknown;
  /** When the form was rendered, as epoch ms. Used for the timing check. */
  renderedAt?: unknown;
  /** Cloudflare Turnstile token, when Turnstile is configured. */
  turnstileToken?: unknown;
}

/** A submission that has passed validation. */
export interface CleanSubmission {
  name: string;
  email: string;
  message: string;
  subject: string;
  turnstileToken: string | null;
}

export interface ValidationResult {
  ok: boolean;
  /** Field name to human-readable problem. Safe to show a visitor. */
  errors: Record<string, string>;
  value: CleanSubmission | null;
}

const MAX = { name: 120, email: 254, subject: 200, message: 5000 } as const;

/** Trim and cap, so a hostile payload cannot fill a database row with a novel. */
function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Deliberately permissive. The only thing this needs to catch is a typo or an
 * empty box; anything stricter starts rejecting real addresses, and the real
 * proof that an address works is that a reply to it arrives.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function validateSubmission(raw: RawSubmission): ValidationResult {
  const name = str(raw.name, MAX.name);
  const email = str(raw.email, MAX.email);
  const message = str(raw.message, MAX.message);
  const subject = str(raw.subject, MAX.subject) || 'Website enquiry';

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Please tell us your name.';
  if (!email) errors.email = 'Please give us an email address so we can reply.';
  else if (!looksLikeEmail(email)) errors.email = 'That email address does not look right.';
  if (!message) errors.message = 'Please write a message.';

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok
      ? {
          name,
          email,
          message,
          subject,
          turnstileToken: typeof raw.turnstileToken === 'string' ? raw.turnstileToken : null,
        }
      : null,
  };
}

/**
 * Cheap spam checks that cost nothing and catch the majority of drive-by bots.
 *
 * BOTH ARE SILENT ON PURPOSE. A caught submission is answered with the same
 * success response a real one gets. Telling a bot why it failed is how it learns
 * to pass, and a false positive that says "you look like a robot" to a real
 * person is worse than quietly dropping one message.
 *
 * `minSeconds` is the floor on how fast a human could plausibly have filled the
 * form in. Three seconds is generous for a real person and impossible for a
 * script that posts the instant the page parses.
 */
export function looksAutomated(
  raw: RawSubmission,
  now: number,
  minSeconds = 3,
): { automated: boolean; reason: string | null } {
  if (str(raw.company, 200)) return { automated: true, reason: 'honeypot' };

  const rendered = Number(raw.renderedAt);
  if (Number.isFinite(rendered) && rendered > 0) {
    const elapsed = (now - rendered) / 1000;
    // A negative elapsed means a clock skew or a forged value, not a human.
    if (elapsed < minSeconds) return { automated: true, reason: 'too-fast' };
  }

  return { automated: false, reason: null };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface Notification {
  subject: string;
  text: string;
  html: string;
}

/**
 * The email the site owner receives.
 *
 * The visitor's address goes in the SUBJECT as well as the body. Reply-To is set
 * where the transport supports it, but a subject line that carries the address
 * still works when it does not, and survives being forwarded.
 */
export function buildNotification(s: CleanSubmission, siteName: string): Notification {
  const lines = [
    `From: ${s.name} <${s.email}>`,
    `Subject: ${s.subject}`,
    '',
    s.message,
    '',
    `Sent from the contact form on ${siteName}.`,
  ];

  return {
    subject: `${siteName}: ${s.subject} (${s.email})`,
    text: lines.join('\n'),
    html:
      `<p><strong>From:</strong> ${escapeHtml(s.name)} ` +
      `&lt;<a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a>&gt;</p>` +
      `<p><strong>Subject:</strong> ${escapeHtml(s.subject)}</p>` +
      `<hr>` +
      `<p style="white-space:pre-wrap">${escapeHtml(s.message)}</p>` +
      `<hr>` +
      `<p style="color:#666;font-size:12px">Sent from the contact form on ${escapeHtml(siteName)}.</p>`,
  };
}

/**
 * The table the endpoint writes to. Kept here so the DDL and the insert cannot
 * drift, and so the migration file is generated from the same string the code
 * expects rather than transcribed alongside it.
 */
export const SUBMISSIONS_DDL = `
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Whether the notification email was accepted by the transport. A row with
  -- notified = 0 is the whole reason this table exists: the enquiry survives an
  -- email that never arrived.
  notified INTEGER NOT NULL DEFAULT 0,
  notify_error TEXT,
  user_agent TEXT,
  country TEXT
);
CREATE INDEX IF NOT EXISTS contact_submissions_received_at
  ON contact_submissions (received_at DESC);
`.trim();
