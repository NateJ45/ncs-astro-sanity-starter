// Safe to edit by hand
// Shared client-safe email-capture helper used by NewsletterSignup, LeadMagnetForm,
// the style quiz gate, and the budget calculator gate.
//
// Signature notes:
//   - `formActionUrl`: the ESP's form-action endpoint (e.g. a ConvertKit, MailerLite, or
//     Kit form URL). When absent, falls back to Web3Forms (PUBLIC_WEB3FORMS_KEY).
//   - `audienceId`: optional audience / list / group ID for ESPs that accept it as a
//     query param or body field. Passed through in the Web3Forms fallback as metadata.
//   - `tag`: optional ESP tag slug (e.g. "quiz-result", "guide-download"). Added as
//     metadata so the ESP can segment subscribers automatically. Do NOT rename this param
//     without updating all call-sites — the styleQuiz.gate.espTag and leadMagnet.espTag
//     schema fields flow directly into it.
//   - `source`: human-readable label for subscriber records (e.g. "footer", "guides/room-checklist").
//   - Honeypot: the form component is responsible for the honeypot field. If it's filled,
//     the component should short-circuit and fake success BEFORE calling subscribeEmail.
//     This helper does no honeypot check itself — it only handles the network call.
//
// Return value: { ok: boolean; message: string }
//   ok=true  → show the success state (reveal download, show thank-you copy)
//   ok=false → show the error state with message; caller decides whether to focus it

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export interface SubscribeOptions {
  email: string;
  name?: string;
  /** ESP tag slug for audience segmentation. Flows from leadMagnet.espTag / styleQuiz.gate.espTag. */
  tag?: string;
  /** Human-readable source label (e.g. "footer", "guides/room-checklist"). */
  source?: string;
  /** ESP form-action URL. When present, POSTs to the ESP directly. When absent, falls back to Web3Forms. */
  formActionUrl?: string | null;
  /** Optional audience / list / group ID for the ESP. */
  audienceId?: string | null;
}

export interface SubscribeResult {
  ok: boolean;
  message: string;
}

// Read the Web3Forms access key at module scope. This file is imported by React
// islands (client bundles), so import.meta.env is available in both SSR + browser.
const WEB3FORMS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

export async function subscribeEmail(opts: SubscribeOptions): Promise<SubscribeResult> {
  const { email, name, tag, source, formActionUrl, audienceId } = opts;

  // --- Path A: ESP form-action URL is configured ----------------------------
  // Covers ConvertKit embedded form action, MailerLite form action, Kit form, etc.
  // The URL is the full form-action endpoint — we POST a simple key=value body to it.
  // Most ESP form-action endpoints accept `email` + `first_name` as flat fields.
  // Tags / audience segmentation are ESP-specific; we pass them as query params so
  // they survive even if the form endpoint ignores unknown body fields.
  if (formActionUrl) {
    try {
      // Build the URL, appending audienceId as a path or query param if provided.
      // Many ESPs use the form action URL itself to identify the list, but some
      // (MailerLite) accept a `groups[]` param. We pass audienceId as `audience_id`
      // so a middleware / Cloudflare Worker can pick it up if needed.
      const url = new URL(formActionUrl);
      if (audienceId) url.searchParams.set('audience_id', audienceId);
      if (tag) url.searchParams.set('tags', tag);

      const body = new URLSearchParams();
      body.set('email', email);
      if (name) body.set('first_name', name);
      if (tag) body.set('tags', tag);
      if (audienceId) body.set('audience_id', audienceId);
      if (source) body.set('source', source);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body.toString(),
      });

      // Many ESP form endpoints return 200 even on bad emails (they validate async).
      // Treat any non-5xx as ok from our side — the ESP handles the rest.
      if (res.ok) {
        return { ok: true, message: "You're in. Check your inbox for a confirmation." };
      }

      // 4xx/5xx from the ESP — surface a friendly message.
      let msg = "Couldn't sign you up right now. Try again in a minute.";
      try {
        const json = await res.json();
        if (typeof json?.message === 'string') msg = json.message;
        else if (typeof json?.error === 'string') msg = json.error;
      } catch {
        // Not JSON — keep the default message.
      }
      return { ok: false, message: msg };
    } catch {
      return {
        ok: false,
        message: "Couldn't reach the signup server. Check your connection and try again.",
      };
    }
  }

  // --- Path B: Web3Forms fallback -------------------------------------------
  // Used when newsletter.formActionUrl isn't configured in Sanity, or when
  // the component is used in a context where no ESP is wired up yet.
  // Web3Forms routes the submission to the email address tied to the access key.
  if (!WEB3FORMS_KEY) {
    return {
      ok: false,
      message:
        "Newsletter signup isn't connected yet. Contact us directly to get on the list.",
    };
  }

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Newsletter signup${tag ? ` [${tag}]` : ''}${source ? ` via ${source}` : ''}`,
        from_name: 'Studio website',
        email,
        name: name || undefined,
        tag: tag || undefined,
        source: source || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && (json as Record<string, unknown>).success !== false) {
      return { ok: true, message: "You're in. We'll be in touch." };
    }
    return {
      ok: false,
      message:
        (json as Record<string, unknown>).message as string ||
        "Couldn't sign you up right now. Try again, or contact us directly.",
    };
  } catch {
    return {
      ok: false,
      message: "Couldn't reach the signup server. Check your connection and try again.",
    };
  }
}
