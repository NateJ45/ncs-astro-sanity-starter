// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/search/ - Home's Search Console card (Studio kit, PORTS.md card 136)
// =============================================================================
// GET -> { configured: false }                     no binding (or fallback settings),
//                                                  or studio-status has no Search
//                                                  Console property for this site:
//                                                  the card stays hidden
//        { configured: true, clicks, clicksBefore, impressions, impressionsBefore,
//          position, positionBefore, queries, pages, from, to, at }
//        { configured: true, connect: true } (502) Google refused the key, or the
//                                                  service account is not a user
//                                                  on the property
//        { configured: true, error }  (502)        Google did not answer well
//
// Protected exactly like /api/studio/visitors/, and fails closed the same way:
// same origin else 403, then a Sanity session that /users/me confirms is a
// member of this project, else 401. Only then does it say whether it is set up.
// Answers are cached for thirty minutes per Worker instance, so opening Home
// again and again does not spend Search Console quota; the response is never
// cached by a browser or CDN.
//
// THE WORKER'S SETTINGS (docs/agent/studio-kit.md, "Google Analytics and
// Search Console"):
//   SITE_DATA               service binding to studio-status, entrypoint
//                           SiteData, which holds the studio's read-only
//                           service account and each site's property.
//   SITE_DATA_KEY           var: this site's key there (e.g. 'fbcm').
// Optional fallback, only without the binding:
//   SEARCH_CONSOLE_SITE     var: 'sc-domain:example.com' (a domain property)
//                           or 'https://example.com/' (a URL-prefix property).
//   GOOGLE_SERVICE_ACCOUNT  secret: a service-account JSON key, whole.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { NOT_SET_UP } from '@/lib/studio-analytics';
import { workerTokens } from '@/lib/google-auth';
import {
  failureKind,
  loadSearch,
  searchReady,
  type GoogleEnv,
  type SearchReport,
} from '@/lib/studio-google';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const CACHE_MS = 30 * 60 * 1000;

let cached: { at: number; site: string; value: SearchReport } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user) return json({ error: 'Sign in to the Studio again to see search numbers.' }, 401);

  const e = env as unknown as GoogleEnv;
  if (!searchReady(e)) return json(NOT_SET_UP);
  const site = (e.SITE_DATA_KEY || e.SEARCH_CONSOLE_SITE || '').trim();
  if (cached && cached.site === site && Date.now() - cached.at < CACHE_MS) {
    return json(cached.value);
  }

  try {
    const value = await loadSearch(e, new Date(), workerTokens);
    cached = { at: Date.now(), site, value };
    return json(value);
  } catch (err) {
    // The message carries a status and an error code only, never a key or token.
    console.error(`search: ${err instanceof Error ? err.message : 'fetch failed'}`);
    const kind = failureKind(err);
    if (kind === 'not-set-up') return json(NOT_SET_UP);
    if (kind === 'connect') return json({ configured: true, connect: true }, 502);
    return json({ configured: true, error: 'The search numbers could not load just now.' }, 502);
  }
};
