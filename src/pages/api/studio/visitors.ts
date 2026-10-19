// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/visitors/ - Home's Visitors card (Studio kit, PORTS.md cards 115, 136)
// =============================================================================
// GET -> { configured: false }                     the Worker has no settings yet
//        { configured: true, provider, thisWeek, lastWeek, days, pages, sources, ai, at }
//        { configured: true, connect: true } (502) Google refused the key (card 136):
//                                                  the card says "finish connecting Google"
//        { configured: true, error }  (502)        the source did not answer well
//
// Unlike deploy-status's one public word, visitor numbers are for the people
// who run the site, so EVERY request must pass both checks before anything is
// read, and anything doubtful is refused (fail closed):
//   1. Same origin (the embedded Studio's own pages), else 403.
//   2. A Sanity session: the Studio's token as `Authorization: Bearer`, which
//      Sanity's /users/me confirms is a member of this project
//      (src/lib/studio-auth.ts), else 401.
// Only then does it say whether it is set up. The answer is cached per Worker
// instance (Cloudflare ten minutes; Google thirty, since GA4 lags hours anyway
// and its quota is per property), and the response itself is never cached by a
// browser or CDN.
//
// THE SOURCE (card 136, pickProvider in src/lib/studio-google.ts):
//   ANALYTICS_PROVIDER         var, optional: 'cloudflare' | 'ga4'. Unset means
//                              whichever is set up, Cloudflare first.
//
// CLOUDFLARE WEB ANALYTICS (card 115; all three needed):
//   CF_ANALYTICS_TOKEN         secret (`npx wrangler secret put CF_ANALYTICS_TOKEN`).
//                              A Cloudflare API token with ONE permission:
//                              Account > Account Analytics > Read, on this
//                              account only. Never sent to the browser, never logged.
//   CF_ACCOUNT_ID              var in wrangler.jsonc: the account id (32 hex).
//   CF_WEB_ANALYTICS_SITE_TAG  var in wrangler.jsonc: the Web Analytics site
//                              tag (32 hex). NOT the beacon token in
//                              PUBLIC_CF_ANALYTICS_TOKEN; the two differ.
// Step-by-step for creating the token: OPERATIONS.md, "Visitor numbers".
//
// GOOGLE ANALYTICS 4 (card 136), through the studio's own Worker:
//   SITE_DATA                  service binding to studio-status, entrypoint
//                              SiteData (it holds the read-only service account
//                              and this site's GA4 property; no key here).
//   SITE_DATA_KEY              var: this site's key there (e.g. 'fbcm').
// Optional fallback, only without the binding (both needed):
//   GA4_PROPERTY_ID            var: the numeric property id (Admin, Property
//                              details), NOT the G- measurement id.
//   GOOGLE_SERVICE_ACCOUNT     secret: a service-account JSON key, whole
//                              (`npx wrangler secret put GOOGLE_SERVICE_ACCOUNT`).
// Step-by-step: docs/agent/studio-kit.md, "Google Analytics and Search Console".
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  analyticsHeaders,
  analyticsRequest,
  GRAPHQL_URL,
  NOT_SET_UP,
  visitorsReport,
  type AnalyticsAnswer,
  type VisitorsReport,
} from '@/lib/studio-analytics';
import { workerTokens } from '@/lib/google-auth';
import {
  failureKind,
  loadGa4,
  pickProvider,
  type GoogleEnv,
  type Provider,
} from '@/lib/studio-google';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const CACHE_MS: Record<Provider, number> = {
  cloudflare: 10 * 60 * 1000,
  ga4: 30 * 60 * 1000,
};

// Per Worker instance: the point is not asking the source on every Home visit.
let cached: { at: number; provider: Provider; value: VisitorsReport } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

/** Card 115's path: one GraphQL call to Cloudflare Web Analytics. */
async function fromCloudflare(e: GoogleEnv, now: Date, ownHost: string): Promise<VisitorsReport> {
  const token = (e.CF_ANALYTICS_TOKEN ?? '').trim();
  const s = {
    token,
    accountTag: e.CF_ACCOUNT_ID ?? '',
    siteTag: e.CF_WEB_ANALYTICS_SITE_TAG ?? '',
  };
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: analyticsHeaders(s.token),
    body: JSON.stringify(analyticsRequest(s, now)),
  });
  if (!res.ok) throw new Error(`Cloudflare answered ${res.status}`);
  return visitorsReport((await res.json()) as AnalyticsAnswer, now, ownHost);
}

export const GET: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user) return json({ error: 'Sign in to the Studio again to see visitor numbers.' }, 401);

  const e = env as unknown as GoogleEnv;
  const provider = pickProvider(e);
  if (!provider) return json(NOT_SET_UP);
  if (cached && cached.provider === provider && Date.now() - cached.at < CACHE_MS[provider]) {
    return json(cached.value);
  }

  try {
    const now = new Date();
    const ownHost = new URL(request.url).hostname;
    const value =
      provider === 'ga4'
        ? await loadGa4(e, now, ownHost, workerTokens)
        : await fromCloudflare(e, now, ownHost);
    cached = { at: Date.now(), provider, value };
    return json(value);
  } catch (err) {
    // The message carries a status and an error code only, never a key or token.
    console.error(`visitors (${provider}): ${err instanceof Error ? err.message : 'fetch failed'}`);
    if (failureKind(err) === 'connect') return json({ configured: true, connect: true }, 502);
    return json({ configured: true, error: 'The visitor numbers could not load just now.' }, 502);
  }
};
