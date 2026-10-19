// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-send - the ONE way the Worker sends email (the email backbone, PORTS.md card 121)
// =============================================================================
// Every route that emails anybody (the contact form, the form builder, newsletter
// confirmations and issues, RSVP confirmations) asks pickMailer() for a sender
// and hands it a MailMessage. Which service actually carries the message is a
// Worker setting, never something a route decides:
//
//   cloudflare  Cloudflare Email Sending, the `send_email` binding named EMAIL.
//               Needs the Workers Paid plan AND the sending domain on Cloudflare
//               DNS (`wrangler email sending enable <domain>`).
//   resend      Resend's HTTP API, secret RESEND_API_KEY. Sends from any domain
//               verified in the Resend account, so it works BEFORE a client's
//               domain is on Cloudflare: verify a domain you already own
//               (a subdomain is fine) on a free Resend account.
//
// MAIL_PROVIDER ("cloudflare" or "resend") picks one explicitly. Unset, the first
// that is fully configured wins, in that order. Nothing configured is a normal
// state, not an error: pickMailer() returns { mailer: null, reason }, and every
// caller turns that into a calm "not set up yet" (never a visitor-facing detail).
//
// The sending address is MAIL_FROM, falling back to CONTACT_FROM (the contact
// form's older setting), so a site that already sends contact mail needs no new
// address. It must be on a domain the chosen provider can send from.
//
// Pure apart from the injected fetch / binding, so src/lib/mail-send.test.ts
// covers the provider choice and both wire formats.
// =============================================================================

/** One email. `to` is a single address: newsletters send one message per person. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Replies go here (the visitor, for a form notification). */
  replyTo?: string;
  /** Extra headers, e.g. List-Unsubscribe. A provider that refuses them gets a retry without. */
  headers?: Record<string, string>;
  /** Overrides the default sender's display name ("<Site> contact form"). */
  fromName?: string;
}

export interface SendResult {
  ok: boolean;
  /** Why it failed, for the log and the D1 row. Never shown to a visitor. */
  error?: string;
}

export type ProviderName = 'cloudflare' | 'resend';

export interface Mailer {
  provider: ProviderName;
  /** The sending address in use (MAIL_FROM or CONTACT_FROM). */
  from: string;
  send(message: MailMessage): Promise<SendResult>;
  /** Many messages at once. Resend batches up to 100 per call; Cloudflare loops. */
  sendMany(messages: MailMessage[]): Promise<SendResult[]>;
}

/** The Cloudflare `send_email` binding, declared structurally (rule 8: no new type package). */
export interface EmailBindingLike {
  send: (message: Record<string, unknown>) => Promise<unknown>;
}

/** The Worker settings the backbone reads. Every one is optional. */
export interface MailEnv {
  MAIL_PROVIDER?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  CONTACT_FROM?: string;
  EMAIL?: EmailBindingLike;
  RESEND_API_KEY?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const errText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message.slice(0, 300) : fallback;

/** "Name <address>", with the name stripped of characters that break the header. */
export function formatFrom(address: string, name?: string): string {
  const clean = (name ?? '').replace(/["<>\r\n]/g, '').trim();
  return clean ? `${clean} <${address}>` : address;
}

// -----------------------------------------------------------------------------
// Cloudflare Email Sending
// -----------------------------------------------------------------------------

/**
 * The message shape the contact endpoint has always sent (stonesteps-50k proved
 * it end to end on 2026-09-18). Headers go as a list of { key, value }; when the
 * binding rejects a message that carries them, it is sent again WITHOUT them,
 * because a message that arrives without Reply-To or List-Unsubscribe beats one
 * that does not arrive. (The unsubscribe link is always in the body as well.)
 */
export function cloudflareMailer(binding: EmailBindingLike, from: string, name: string): Mailer {
  const send = async (m: MailMessage): Promise<SendResult> => {
    const base: Record<string, unknown> = {
      to: m.to,
      from: { email: from, name: m.fromName ?? name },
      subject: m.subject,
      text: m.text,
      ...(m.html ? { html: m.html } : {}),
    };
    const headers = [
      ...(m.replyTo ? [{ key: 'Reply-To', value: m.replyTo }] : []),
      ...Object.entries(m.headers ?? {}).map(([key, value]) => ({ key, value })),
    ];
    try {
      await binding.send(headers.length ? { ...base, headers } : base);
      return { ok: true };
    } catch (first) {
      if (!headers.length) return { ok: false, error: errText(first, 'send failed') };
      try {
        await binding.send(base);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errText(err, 'send failed') };
      }
    }
  };
  return {
    provider: 'cloudflare',
    from,
    send,
    async sendMany(messages) {
      const out: SendResult[] = [];
      for (const m of messages) out.push(await send(m));
      return out;
    },
  };
}

// -----------------------------------------------------------------------------
// Resend
// -----------------------------------------------------------------------------

export const RESEND_API = 'https://api.resend.com';
/** Resend's batch endpoint takes at most 100 messages per call. */
export const RESEND_BATCH_MAX = 100;

function resendBody(m: MailMessage, from: string, name: string): Record<string, unknown> {
  return {
    from: formatFrom(from, m.fromName ?? name),
    to: [m.to],
    subject: m.subject,
    text: m.text,
    ...(m.html ? { html: m.html } : {}),
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    ...(m.headers && Object.keys(m.headers).length ? { headers: m.headers } : {}),
  };
}

async function resendError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return `resend responded ${res.status}${body?.message ? `: ${body.message.slice(0, 200)}` : ''}`;
}

export function resendMailer(
  apiKey: string,
  from: string,
  name: string,
  fetchImpl: FetchLike = fetch,
): Mailer {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  return {
    provider: 'resend',
    from,
    async send(m) {
      try {
        const res = await fetchImpl(`${RESEND_API}/emails`, {
          method: 'POST',
          headers,
          body: JSON.stringify(resendBody(m, from, name)),
        });
        return res.ok ? { ok: true } : { ok: false, error: await resendError(res) };
      } catch (err) {
        return { ok: false, error: errText(err, 'resend request failed') };
      }
    },
    async sendMany(messages) {
      const out: SendResult[] = [];
      for (let i = 0; i < messages.length; i += RESEND_BATCH_MAX) {
        const chunk = messages.slice(i, i + RESEND_BATCH_MAX);
        let result: SendResult;
        try {
          const res = await fetchImpl(`${RESEND_API}/emails/batch`, {
            method: 'POST',
            headers,
            body: JSON.stringify(chunk.map((m) => resendBody(m, from, name))),
          });
          result = res.ok ? { ok: true } : { ok: false, error: await resendError(res) };
        } catch (err) {
          result = { ok: false, error: errText(err, 'resend request failed') };
        }
        // A batch is accepted or refused as a whole.
        for (let j = 0; j < chunk.length; j++) out.push(result);
      }
      return out;
    },
  };
}

// -----------------------------------------------------------------------------
// Picking one
// -----------------------------------------------------------------------------

export type MailerChoice =
  { mailer: Mailer; reason?: undefined } | { mailer: null; reason: string };

/**
 * The configured sender, or why there is none. `defaultName` is the display name
 * when MAIL_FROM_NAME is unset (usually the site's name).
 */
export function pickMailer(
  env: MailEnv,
  defaultName: string,
  fetchImpl: FetchLike = fetch,
): MailerChoice {
  const from = (env.MAIL_FROM || env.CONTACT_FROM || '').trim();
  const name = (env.MAIL_FROM_NAME || defaultName).trim();
  const wanted = (env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (wanted && wanted !== 'cloudflare' && wanted !== 'resend') {
    return { mailer: null, reason: `MAIL_PROVIDER "${wanted}" is not cloudflare or resend` };
  }
  if (!from) return { mailer: null, reason: 'no sending address (MAIL_FROM or CONTACT_FROM)' };

  const cloudflare = env.EMAIL ? cloudflareMailer(env.EMAIL, from, name) : null;
  const resend = env.RESEND_API_KEY
    ? resendMailer(env.RESEND_API_KEY, from, name, fetchImpl)
    : null;

  if (wanted === 'cloudflare') {
    return cloudflare
      ? { mailer: cloudflare }
      : { mailer: null, reason: 'MAIL_PROVIDER is cloudflare but there is no EMAIL binding' };
  }
  if (wanted === 'resend') {
    return resend
      ? { mailer: resend }
      : { mailer: null, reason: 'MAIL_PROVIDER is resend but RESEND_API_KEY is not set' };
  }
  if (cloudflare) return { mailer: cloudflare };
  if (resend) return { mailer: resend };
  return { mailer: null, reason: 'no email provider (EMAIL binding or RESEND_API_KEY)' };
}

/** A loose email check, the same strength as the forms use. */
export const EMAIL_SHAPE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_SHAPE.test(email) ? email : null;
}
