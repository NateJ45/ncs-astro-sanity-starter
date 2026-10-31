// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The studio dashboard's Inbox (PORTS.md card 210)
// =============================================================================
// After a form route has stored a submission, it tells studio-status (Nathan's
// dashboard) that one arrived, so every site's enquiries show in one list at
// /inbox. The site still emails and stores the message exactly as before; this
// is a notification, not a copy.
//
// WHAT LEAVES THE SITE: an id, the form, the sender's name, a subject and a
// short preview. Never the sender's email or phone: the preview is cut to 200
// characters and anything shaped like an address or a number is replaced here,
// before it is sent (studio-status redacts again on arrival).
//
// IT NEVER AFFECTS THE VISITOR. The call runs inside the Worker's waitUntil, so
// the visitor's answer does not wait on it, and every failure is swallowed into
// one log line. No binding, or no key, means it does nothing at all.
//
// THE WORKER'S SETTINGS (wrangler.jsonc, the same pair the Visitors card uses):
//   SITE_DATA      service binding to studio-status, entrypoint SiteData.
//   SITE_DATA_KEY  var: the site's key in studio-status's SITE_DATA map.
// =============================================================================

/** studio-status's SiteData.reportMessage, as this file uses it. */
export interface InboxBinding {
  reportMessage(
    siteKey: string,
    msg: InboxReport,
  ): Promise<{ ok: boolean; reason?: string } | undefined>;
}

export interface InboxEnv {
  SITE_DATA?: Partial<InboxBinding>;
  SITE_DATA_KEY?: string;
}

/** One submission, as the dashboard stores it. */
export interface InboxReport {
  /** Unique per site and form, e.g. 'contact-42'. A retry with the same id is ignored. */
  id: string;
  /** 'contact', 'form', 'rsvp', 'quote'. */
  form: string;
  name?: string;
  subject?: string;
  preview?: string;
  receivedAt?: string;
}

const PREVIEW_MAX = 200;
const REMOVED = '[contact removed]';
const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g;
const EMAIL = /[^\s<>()"',;:]+@[^\s<>()"',;:]+/g;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;

/** Control characters out, contacts replaced, whitespace collapsed, then cut to max. */
export function inboxText(value: unknown, max = PREVIEW_MAX): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(CONTROL, ' ')
    .replace(EMAIL, REMOVED)
    .replace(PHONE, REMOVED)
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The binding and key when both are set up, else null (the report is skipped). */
export function inboxTarget(e: InboxEnv): { binding: InboxBinding; key: string } | null {
  const b = e.SITE_DATA;
  const key = (e.SITE_DATA_KEY ?? '').trim();
  if (!b || typeof b.reportMessage !== 'function' || !/^[a-z0-9-]{1,40}$/.test(key)) return null;
  return { binding: b as InboxBinding, key };
}

/** The message with every text field cleaned and the empty ones left out. */
export function inboxMessage(msg: InboxReport): InboxReport {
  const out: InboxReport = {
    id: String(msg.id).slice(0, 120),
    form: String(msg.form).slice(0, 60),
    receivedAt: msg.receivedAt ?? new Date().toISOString(),
  };
  const name = inboxText(msg.name, 80);
  const subject = inboxText(msg.subject, 120);
  const preview = inboxText(msg.preview);
  if (name) out.name = name;
  if (subject) out.subject = subject;
  if (preview) out.preview = preview;
  return out;
}

type Locals = { cfContext?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined;

/**
 * Tell the dashboard about one submission. Returns at once; the call itself runs
 * under `locals.cfContext.waitUntil` (the Cloudflare adapter's request context).
 * The promise is returned for tests; routes ignore it.
 */
export function reportToInbox(e: InboxEnv, locals: unknown, msg: InboxReport): Promise<void> {
  const target = inboxTarget(e);
  if (!target) return Promise.resolve();
  const done = Promise.resolve()
    .then(() => target.binding.reportMessage(target.key, inboxMessage(msg)))
    .then((r) => {
      if (!r?.ok) console.warn('[inbox] not reported:', r?.reason ?? 'no answer');
    })
    .catch((err: unknown) => {
      console.warn('[inbox] report failed:', err instanceof Error ? err.message.slice(0, 80) : '');
    });
  try {
    (locals as Locals)?.cfContext?.waitUntil?.(done);
  } catch {
    // No request context (a test, astro dev without the platform): the promise runs anyway.
  }
  return done;
}
