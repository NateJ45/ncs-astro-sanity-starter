// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
//
// One place that decides HOW a contact submission leaves the browser, so the
// form components never have to know.
//
// THE SITE'S OWN ENDPOINT FIRST. `/api/contact` runs on the Worker this site
// already ships, stores the submission before trying to email it, and keeps
// every key server-side. Web3Forms is the fallback for a build with no Worker
// at all, where there is no endpoint to post to.
//
// The fallback is not dead weight: the starter is meant to deploy anywhere, and
// on a purely static host `/api/contact` does not exist. Detecting that by
// TRYING it is deliberate. A build-time flag would have to be set correctly by
// whoever deploys, and would be wrong in exactly the case that matters.
//
// See PORTS.md card 45.

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  subject: string;
  /** Honeypot value. Passed through so the server can drop bots the same way. */
  company?: string;
  /** When the form was rendered, epoch ms. Feeds the server's timing check. */
  renderedAt?: number;
  turnstileToken?: string | null;
}

export interface ContactResult {
  ok: boolean;
  /** Visitor-facing. Never contains configuration detail. */
  error?: string;
  /** Per-field problems, when the server rejected the content. */
  errors?: Record<string, string>;
}

const GENERIC = "Couldn't send right now. Try again in a minute, or contact us directly.";

/**
 * Post to the site's own endpoint.
 *
 * Returns `null` when the endpoint is not there at all, which is the signal to
 * fall back. A 404 or 405 means a static host served the 404 page instead of
 * running a Worker; a network error means we never reached anything. Neither is
 * a reason to tell the visitor their message failed, because the fallback has
 * not been tried yet.
 */
async function postToOwnEndpoint(payload: ContactPayload): Promise<ContactResult | null> {
  let res: Response;
  try {
    res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }

  if (res.status === 404 || res.status === 405) return null;

  const body = (await res.json().catch(() => ({}))) as ContactResult;
  // A response that is not JSON at all is a static host's HTML 404 dressed as a
  // 200 by some CDNs. Treat it as "no endpoint" rather than as a failure.
  if (res.ok && body.ok === undefined) return null;

  if (res.ok && body.ok) return { ok: true };
  return { ok: false, error: body.error ?? GENERIC, errors: body.errors };
}

/**
 * Send a submission, preferring the site's own endpoint.
 *
 * `web3formsFallback` is called only when there is no endpoint. It receives
 * nothing and returns whether it succeeded, so the caller keeps ownership of
 * the Web3Forms payload, which is service-specific and not this module's
 * business.
 */
export async function sendContactSubmission(
  payload: ContactPayload,
  web3formsFallback?: () => Promise<ContactResult>,
): Promise<ContactResult> {
  const own = await postToOwnEndpoint(payload);
  if (own) return own;

  if (web3formsFallback) return web3formsFallback();

  return {
    ok: false,
    error: 'This form is not connected yet. Please get in touch directly.',
  };
}
