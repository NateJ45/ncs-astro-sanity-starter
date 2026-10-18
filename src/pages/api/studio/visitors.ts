// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/visitors/ - Home's Visitors card (Studio kit, PORTS.md card 115)
// =============================================================================
// GET -> { configured: false }                     the Worker has no settings yet
//        { configured: true, thisWeek, lastWeek, days, pages, sources, at }
//        { configured: true, error }  (502)        Cloudflare did not answer well
//
// Unlike deploy-status's one public word, visitor numbers are for the people
// who run the site, so EVERY request must pass both checks before anything is
// read, and anything doubtful is refused (fail closed):
//   1. Same origin (the embedded Studio's own pages), else 403.
//   2. A Sanity session: the Studio's token as `Authorization: Bearer`, which
//      Sanity's /users/me confirms is a member of this project
//      (src/lib/studio-auth.ts), else 401.
// Only then does it say whether it is set up. The answer is cached for ten
// minutes per Worker instance, so Home costs Cloudflare at most one GraphQL call
// every ten minutes, and the response itself is never cached by a browser or CDN.
//
// THE WORKER'S SETTINGS (all three needed; without them the card says plainly
// that visitor numbers are not set up yet):
//   CF_ANALYTICS_TOKEN         secret (`npx wrangler secret put CF_ANALYTICS_TOKEN`).
//                              A Cloudflare API token with ONE permission:
//                              Account > Account Analytics > Read, on this
//                              account only. Never sent to the browser, never logged.
//   CF_ACCOUNT_ID              var in wrangler.jsonc: the account id (32 hex).
//   CF_WEB_ANALYTICS_SITE_TAG  var in wrangler.jsonc: the Web Analytics site
//                              tag (32 hex). NOT the beacon token in
//                              PUBLIC_CF_ANALYTICS_TOKEN; the two differ.
// Step-by-step for creating the token: OPERATIONS.md, "Visitor numbers".
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  analyticsHeaders,
  analyticsRequest,
  GRAPHQL_URL,
  isTag,
  NOT_SET_UP,
  visitorsReport,
  type AnalyticsAnswer,
  type AnalyticsSettings,
  type VisitorsReport,
} from '@/lib/studio-analytics';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

interface VisitorsEnv {
  CF_ANALYTICS_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_WEB_ANALYTICS_SITE_TAG?: string;
}

const CACHE_MS = 10 * 60 * 1000;

// Per Worker instance: the point is not asking Cloudflare on every Home visit.
let cached: { at: number; value: VisitorsReport } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

function settings(): AnalyticsSettings | null {
  const e = env as unknown as VisitorsEnv;
  const token = e.CF_ANALYTICS_TOKEN?.trim();
  if (!token || !isTag(e.CF_ACCOUNT_ID) || !isTag(e.CF_WEB_ANALYTICS_SITE_TAG)) return null;
  return { token, accountTag: e.CF_ACCOUNT_ID, siteTag: e.CF_WEB_ANALYTICS_SITE_TAG };
}

export const GET: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user) return json({ error: 'Sign in to the Studio again to see visitor numbers.' }, 401);

  const s = settings();
  if (!s) return json(NOT_SET_UP);
  if (cached && Date.now() - cached.at < CACHE_MS) return json(cached.value);

  try {
    const now = new Date();
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: analyticsHeaders(s.token),
      body: JSON.stringify(analyticsRequest(s, now)),
    });
    if (!res.ok) {
      console.error(`visitors: Cloudflare answered ${res.status}`);
      return json({ configured: true, error: 'The visitor numbers could not load just now.' }, 502);
    }
    const value = visitorsReport(
      (await res.json()) as AnalyticsAnswer,
      now,
      new URL(request.url).hostname,
    );
    cached = { at: Date.now(), value };
    return json(value);
  } catch (err) {
    console.error(`visitors: ${err instanceof Error ? err.message : 'fetch failed'}`);
    return json({ configured: true, error: 'The visitor numbers could not load just now.' }, 502);
  }
};
