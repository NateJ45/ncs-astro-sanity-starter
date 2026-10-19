// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/subscribe/confirm/?t=<signed token> - the link in "Please confirm your email"
// (PORTS.md card 121). Confirms, then sends the reader to a plain page on the
// site that says what happened: /email/confirmed/, or /email/link-problem/ for a
// link that is broken, expired or from before the secret changed.
// =============================================================================
import type { APIRoute } from 'astro';
import { listDeps } from '@/lib/mail-env';
import { confirmSubscription } from '@/lib/mail-subscribe';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  let outcome = 'invalid';
  try {
    outcome = await confirmSubscription(url.searchParams.get('t'), await listDeps(request));
  } catch (err) {
    console.error('[subscribe] confirm failed:', err);
  }
  const page = outcome === 'confirmed' ? '/email/confirmed/' : '/email/link-problem/';
  return new Response(null, {
    status: 303,
    headers: { location: new URL(page, url.origin).toString(), 'cache-control': 'no-store' },
  });
};
