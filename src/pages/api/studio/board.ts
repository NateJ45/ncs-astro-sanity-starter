// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/board/?p=m|q|y&k=2026-10|2026-Q4|2026 - the Report tool's numbers
// (Studio kit, PORTS.md card 218)
// =============================================================================
// GET -> { configured: false, reason }            no studio-status binding, or the
//                                                 site has no GA4 property there
//        { configured: true, p, k, today, report, at }
//                                                 the series report for that period;
//                                                 the Studio works out the tiles and
//                                                 charts (src/lib/studio-board.ts)
//        { configured: true, connect: true } (502) Google refused the key
//        { configured: true, error }  (502)       the source did not answer well
//        { error } (400)                          p or k is not a period
//
// The same checks as /api/studio/visitors/, in the same order, before anything
// is read (fail closed): same origin (403), then a Sanity session whose token
// Sanity confirms is a member of this project (401).
//
// The period is worked out HERE from the site's config (its first month and
// time zone), never taken from the caller as dates: a still-running period is
// asked for through yesterday. The answer is kept on the site with the Cache
// API under a made-up address per period and span: about three hours, a month
// once the period is three days over, one hour when Search Console did not
// answer. Nothing is kept on a failure, and an answer full of zeros (how a
// Google Analytics failure arrives) counts as a failure. The response itself is
// never cached by a browser or CDN.
//
// Settings (card 136, nothing new): the SITE_DATA service binding to
// studio-status (entrypoint SiteData, which gained siteSeries) and SITE_DATA_KEY.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { boardConfig } from '@/config/board';
import {
  boardPeriod,
  boardTtl,
  seriesGood,
  todayIn,
  validPeriodRequest,
  type BoardAnswer,
  type SeriesReport,
} from '@/lib/studio-board';
import { siteData, type GoogleEnv, type SiteDataBinding } from '@/lib/studio-google';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

type SeriesAnswer = { ok: true; report: unknown; at?: string } | { ok: false; reason: string };
type SeriesBinding = SiteDataBinding & {
  siteSeries?: (siteKey: string, from: string, to: string) => Promise<SeriesAnswer>;
};

const json = (body: BoardAnswer | { error: string }, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

/** The Workers cache, or null where there is none (a local dev server). */
function store(): Cache | null {
  try {
    return (caches as unknown as { default?: Cache }).default ?? null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isSameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user) return json({ error: 'Sign in to the Studio again to see the report.' }, 401);

  const p = url.searchParams.get('p') ?? 'm';
  const k = url.searchParams.get('k') ?? '';
  if (!validPeriodRequest(p, k)) return json({ error: 'That is not a period.' }, 400);

  const sd = siteData(env as unknown as GoogleEnv);
  const binding = sd?.binding as SeriesBinding | undefined;
  if (!sd || typeof binding?.siteSeries !== 'function') {
    return json({ configured: false, reason: 'no-binding' });
  }

  const today = todayIn(boardConfig.timeZone);
  const per = boardPeriod(boardConfig, p, k, today);
  const cache = store();
  const cacheKey = `https://board.invalid/${sd.key}/${per.from}/${per.to}`;
  try {
    const hit = await cache?.match(cacheKey);
    if (hit) {
      const kept = (await hit.json()) as { report: SeriesReport; at: string };
      return json({ configured: true, p: per.p, k: per.k, today, ...kept });
    }
  } catch {
    // A cache that cannot be read is a miss.
  }

  try {
    const res = await binding.siteSeries(sd.key, per.from, per.to);
    if (!res.ok) {
      if (res.reason === 'no-ga4') return json({ configured: false, reason: 'no-ga4' });
      // The reason is one of a fixed list of words, never Google's text.
      console.error(`board: ${res.reason}`);
      if (['connect', 'unknown-site', 'no-key'].includes(res.reason)) {
        return json({ configured: true, connect: true }, 502);
      }
      return json({ configured: true, error: 'The report could not load just now.' }, 502);
    }
    if (!seriesGood(res.report)) {
      console.error('board: an answer with no page views');
      return json({ configured: true, error: 'The report could not load just now.' }, 502);
    }
    const kept = { report: res.report, at: res.at ?? new Date().toISOString() };
    try {
      await cache?.put(
        cacheKey,
        new Response(JSON.stringify(kept), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${boardTtl(per, res.report, today)}`,
          },
        }),
      );
    } catch {
      // Not kept this time; the next visit asks again.
    }
    return json({ configured: true, p: per.p, k: per.k, today, ...kept });
  } catch (err) {
    console.error(`board: ${err instanceof Error ? err.message : 'failed'}`);
    return json({ configured: true, error: 'The report could not load just now.' }, 502);
  }
};
