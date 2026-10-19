// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/subscribe/ - join the newsletter list (PORTS.md card 121)
// =============================================================================
// GET  -> { ready }   Can the site's own list take sign-ups? The sign-up box
//                     asks before it shows itself; it never learns why not.
// POST -> { ok, pending } | { ok: false, errors | error | unavailable }
//
// The rules (double opt-in, the same answer whatever the list holds, what is
// stored) are in src/lib/mail-subscribe.ts. The settings are in
// src/lib/mail-env.ts and OPERATIONS.md "Email".
// =============================================================================
import type { APIRoute } from 'astro';
import { listDeps } from '@/lib/mail-env';
import { listReady, subscribe } from '@/lib/mail-subscribe';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const d = await listDeps(request);
  return json({ ready: listReady(d) });
};

export const POST: APIRoute = async ({ request }) => {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Could not read that sign-up.' }, 400);
  }
  const d = await listDeps(request);
  if (!listReady(d)) console.error('[subscribe] not set up:', d.reason);
  try {
    const answer = await subscribe(raw, d);
    return json(answer.body, answer.status);
  } catch (err) {
    console.error('[subscribe] failed:', err);
    return json({ ok: false, error: 'Sorry, that did not work. Please try again later.' }, 500);
  }
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
