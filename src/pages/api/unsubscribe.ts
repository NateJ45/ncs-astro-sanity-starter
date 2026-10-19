// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/unsubscribe/?t=<signed token> - leave the newsletter list (PORTS.md card 127)
// =============================================================================
// POST only, for two callers:
//   - the button on /email/unsubscribe/ (the footer link of every issue opens
//     that page; a GET never unsubscribes, so a mail scanner that follows every
//     link cannot take a reader off the list);
//   - the List-Unsubscribe-Post header (RFC 8058): Gmail's and Apple Mail's own
//     "Unsubscribe" button POSTs here with "List-Unsubscribe=One-Click".
// No login, no questions, and the token never expires.
// =============================================================================
import type { APIRoute } from 'astro';
import { listDeps } from '@/lib/mail-env';
import { unsubscribe } from '@/lib/mail-subscribe';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const token = new URL(request.url).searchParams.get('t');
  try {
    const outcome = await unsubscribe(token, await listDeps(request));
    if (outcome === 'unsubscribed') return json({ ok: true });
    if (outcome === 'unavailable')
      return json({ ok: false, error: 'Please try again later.' }, 503);
    return json({ ok: false, error: 'That unsubscribe link is not complete.' }, 400);
  } catch (err) {
    console.error('[unsubscribe] failed:', err);
    return json({ ok: false, error: 'Please try again later.' }, 500);
  }
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
