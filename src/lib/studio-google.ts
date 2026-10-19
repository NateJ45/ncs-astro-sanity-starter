// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Google Analytics 4 and Search Console for Home (Studio kit, PORTS.md card 136)
// =============================================================================
// The pure half of two Worker routes:
//   /api/studio/visitors/  Home's Visitors card. Reads Cloudflare Web Analytics
//                          (card 115, src/lib/studio-analytics.ts) OR, with
//                          card 136, Google Analytics 4. pickProvider() says which.
//   /api/studio/search/    Home's Search Console card: clicks and impressions
//                          from Google search, the searches and the pages.
//
// GA4 is mapped onto the SAME VisitorsReport shape the Cloudflare source
// makes, so the card draws either without knowing which; `provider` only
// changes the small print ("Google Analytics, updated a few hours ago").
//
// HOW GOOGLE IS REACHED. The usual way is the studio's own Worker,
// studio-status, through a service binding: `SITE_DATA` (entrypoint
// "SiteData") plus a `SITE_DATA_KEY` var naming the site. studio-status holds
// the studio's one read-only service account and its property map, so no site
// Worker holds a Google key. This file builds the report bodies and maps the
// answers; studio-status adds the property, the token and a 3-hour cache.
// FALLBACK, optional: a site outside the studio's account can sign in itself
// with GOOGLE_SERVICE_ACCOUNT (src/lib/google-auth.ts) plus GA4_PROPERTY_ID /
// SEARCH_CONSOLE_SITE. The binding wins when both are set.
//
// THE WORKER'S SETTINGS (docs/agent/studio-kit.md, "Google Analytics and
// Search Console"):
//   ANALYTICS_PROVIDER      var, optional: 'cloudflare' | 'ga4'. Unset means
//                           whichever is set up, Cloudflare first.
//   SITE_DATA               service binding to studio-status, entrypoint SiteData.
//   SITE_DATA_KEY           var: the site's key in studio-status (e.g. 'fbcm').
//   Fallback only:
//   GA4_PROPERTY_ID         var: the numeric property id (NOT the G- id).
//   SEARCH_CONSOLE_SITE     var: 'sc-domain:example.com' or 'https://example.com/'.
//   GOOGLE_SERVICE_ACCOUNT  secret: the service-account JSON key, whole.
//
// fetch and the binding are passed in, so src/lib/studio-google.test.ts runs
// the whole path against fixture JSON and a mock binding and never calls Google.
// =============================================================================

import {
  GoogleError,
  GoogleTokens,
  parseServiceAccount,
  type ServiceAccount,
} from './google-auth.ts';
import {
  analyticsWindow,
  isTag,
  SERIES_DAYS,
  SOURCE_LABELS,
  sourceGroup,
  type SourceGroup,
  type VisitorsReport,
} from './studio-analytics.ts';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

/**
 * Why studio-status could not answer (its src/site-data.ts says the same):
 * unknown-site, not-set-up (no Search Console property for this site),
 * no-key, bad-request, connect (Google 401/403) or failed.
 */
export type SiteDataReason =
  'unknown-site' | 'not-set-up' | 'no-key' | 'bad-request' | 'connect' | 'failed';
type SiteDataFailure = { ok: false; reason: SiteDataReason };

/** The RPC surface of studio-status's SiteData entrypoint, as this file uses it. */
export interface SiteDataBinding {
  siteAnalytics(
    siteKey: string,
    requests: unknown[],
  ): Promise<{ ok: true; reports: unknown[]; at?: string } | SiteDataFailure>;
  searchConsole(
    siteKey: string,
    queries: Record<string, unknown>,
  ): Promise<{ ok: true; answers: Record<string, unknown>; at?: string } | SiteDataFailure>;
}

/** The Worker env this file reads. Every field is optional; nothing set means "not set up". */
export interface GoogleEnv {
  ANALYTICS_PROVIDER?: string;
  SITE_DATA?: SiteDataBinding;
  SITE_DATA_KEY?: string;
  GA4_PROPERTY_ID?: string;
  SEARCH_CONSOLE_SITE?: string;
  GOOGLE_SERVICE_ACCOUNT?: string;
  CF_ANALYTICS_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_WEB_ANALYTICS_SITE_TAG?: string;
}

export type Provider = 'cloudflare' | 'ga4';

/** A GA4 property id: digits only ('properties/123' is accepted and trimmed). */
export function ga4PropertyId(v: string | undefined | null): string | null {
  const m = /^(?:properties\/)?(\d{4,20})$/.exec((v ?? '').trim());
  return m ? m[1] : null;
}

/** A Search Console property: a domain property or a URL-prefix property. */
export function searchConsoleSite(v: string | undefined | null): string | null {
  const s = (v ?? '').trim();
  if (/^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return s.toLowerCase();
  if (/^https?:\/\/[^\s/]+\/?\S*$/i.test(s)) return s.endsWith('/') ? s : `${s}/`;
  return null;
}

/** The studio-status binding and this site's key, or null. */
export function siteData(e: GoogleEnv): { binding: SiteDataBinding; key: string } | null {
  const b = e.SITE_DATA;
  const key = (e.SITE_DATA_KEY ?? '').trim();
  if (!b || typeof b.siteAnalytics !== 'function' || !/^[a-z0-9-]{1,40}$/.test(key)) return null;
  return { binding: b, key };
}

const cloudflareReady = (e: GoogleEnv) =>
  Boolean(e.CF_ANALYTICS_TOKEN?.trim()) &&
  isTag(e.CF_ACCOUNT_ID) &&
  isTag(e.CF_WEB_ANALYTICS_SITE_TAG);

/**
 * GA4 counts as set up with the studio-status binding and a key, or (the
 * fallback) the property id and SOME service-account key. A key that is
 * present but unreadable still picks GA4, so the card says "finish connecting
 * Google" instead of pretending nothing was attempted.
 */
const ga4Ready = (e: GoogleEnv) =>
  Boolean(siteData(e)) ||
  (Boolean(ga4PropertyId(e.GA4_PROPERTY_ID)) && Boolean(e.GOOGLE_SERVICE_ACCOUNT?.trim()));

/**
 * Which source the Visitors card reads. ANALYTICS_PROVIDER wins when it names
 * one; otherwise Cloudflare when it is set up (so a site that had card 115
 * keeps it), then GA4. null means not set up.
 */
export function pickProvider(e: GoogleEnv): Provider | null {
  const asked = (e.ANALYTICS_PROVIDER ?? '').trim().toLowerCase();
  if (asked === 'cloudflare') return cloudflareReady(e) ? 'cloudflare' : null;
  if (asked === 'ga4' || asked === 'google') return ga4Ready(e) ? 'ga4' : null;
  if (cloudflareReady(e)) return 'cloudflare';
  if (ga4Ready(e)) return 'ga4';
  return null;
}

/**
 * Is the Search Console card worth asking for? With the binding, yes (studio-status
 * answers not-set-up when it has no Search Console property for the site, and
 * the card stays hidden); in the fallback, a property and some key.
 */
export function searchReady(e: GoogleEnv): boolean {
  if (siteData(e)) return true;
  return (
    Boolean(searchConsoleSite(e.SEARCH_CONSOLE_SITE)) && Boolean(e.GOOGLE_SERVICE_ACCOUNT?.trim())
  );
}

/** studio-status said "no Search Console property for this site": the card stays hidden. */
export class NotSetUpError extends Error {
  constructor() {
    super('No Search Console property for this site in studio-status.');
    this.name = 'NotSetUpError';
  }
}

/** A failed SiteData answer as the error the routes understand. */
function siteDataError(reason: SiteDataReason): Error {
  if (reason === 'not-set-up') return new NotSetUpError();
  // A key studio-status does not know, or no key there, is a set-up job too.
  const connect = reason === 'connect' || reason === 'unknown-site' || reason === 'no-key';
  return new GoogleError(`studio-status answered ${reason}.`, 0, connect);
}

/** The key, or a GoogleError the card turns into "finish connecting Google". */
export function serviceAccountFrom(e: GoogleEnv): ServiceAccount {
  const account = parseServiceAccount(e.GOOGLE_SERVICE_ACCOUNT);
  if (!account) {
    throw new GoogleError('GOOGLE_SERVICE_ACCOUNT is not a service-account JSON key.', 0, true);
  }
  return account;
}

// -----------------------------------------------------------------------------
// Calling Google
// -----------------------------------------------------------------------------

/**
 * One authorised call. A 401 or 403 is a set-up problem (the service account
 * is not a user on the property, or the API is switched off), so it throws a
 * GoogleError with connect: true. Other failures throw with connect: false.
 */
async function googleJson<T>(
  url: string,
  body: unknown,
  account: ServiceAccount,
  tokens: GoogleTokens,
  fetchImpl: FetchLike,
): Promise<T> {
  const token = await tokens.get(account, undefined, fetchImpl);
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) tokens.clear();
  if (!res.ok) {
    throw new GoogleError(
      `Google answered ${res.status}.`,
      res.status,
      res.status === 401 || res.status === 403,
    );
  }
  return (await res.json()) as T;
}

/**
 * What the card should say about a failure: hidden ('not-set-up', Search
 * Console only), set-up ('connect') or passing ('failed').
 */
export function failureKind(err: unknown): 'not-set-up' | 'connect' | 'failed' {
  if (err instanceof NotSetUpError) return 'not-set-up';
  return err instanceof GoogleError && err.connect ? 'connect' : 'failed';
}

// -----------------------------------------------------------------------------
// GA4 (Analytics Data API v1beta)
// -----------------------------------------------------------------------------

export const GA4_API = 'https://analyticsdata.googleapis.com/v1beta';

/** A GA4 report request (the part of RunReportRequest the card uses). */
interface Ga4Request {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  orderBys?: Array<{
    metric?: { metricName: string };
    dimension?: { dimensionName: string };
    desc?: boolean;
  }>;
  limit?: number;
  keepEmptyRows?: boolean;
}

/**
 * The four reports, sent as ONE batchRunReports call (the same Data API as
 * runReport; a batch takes up to five): sessions per day for four weeks, the
 * most-read pages and the ways in over the last seven days, and the ways in
 * over the seven before (for the AI assistants trend). Dates are the card's
 * UTC days; GA4 reads them in the property's own time zone, which is close
 * enough for a weekly picture.
 */
export function ga4Requests(now: Date): Ga4Request[] {
  const { days } = analyticsWindow(now);
  const week = { startDate: days[SERIES_DAYS - 7], endDate: days[SERIES_DAYS - 1] };
  const before = { startDate: days[SERIES_DAYS - 14], endDate: days[SERIES_DAYS - 8] };
  const ways = [
    { name: 'sessionDefaultChannelGroup' },
    { name: 'sessionSource' },
    { name: 'sessionMedium' },
  ];
  return [
    {
      dateRanges: [{ startDate: days[0], endDate: days[SERIES_DAYS - 1] }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 100,
    },
    {
      dateRanges: [week],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    },
    {
      dateRanges: [week],
      dimensions: ways,
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 200,
    },
    {
      dateRanges: [before],
      dimensions: ways,
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 200,
    },
  ];
}

/** The batch URL for a property. */
export function ga4Url(propertyId: string): string {
  return `${GA4_API}/properties/${propertyId}:batchRunReports`;
}

interface Ga4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}
export interface Ga4Answer {
  reports?: Array<{ rows?: Ga4Row[] | null } | null> | null;
}

/**
 * AI assistants by source name, for sessions GA4 has not put in its own "AI
 * Assistant" channel. GA4 often gives a bare name ('chatgpt', 'perplexity')
 * rather than a host, so these are names; hosts go through AI_HOSTS too.
 */
const AI_SOURCE_NAMES =
  /^(chatgpt|openai|perplexity|copilot|gemini|bard|claude|phind|poe|meta\.ai|mistral|deepseek|grok)(\.|$)/;

/**
 * Which of the card's groups a GA4 session belongs to. GA4's own "AI
 * Assistant" channel (or the 'ai-assistant' medium) goes straight to AI
 * assistants; the source-name list is the fallback for the sessions GA4
 * files elsewhere. Then the channel decides; anything GA4 calls Unassigned
 * falls back to the source, as the Cloudflare referrer groups do. The site's
 * own host as a referral is null (a move between its own pages).
 */
export function ga4Group(
  channel: string | undefined,
  source: string | undefined,
  medium: string | undefined,
  ownHost?: string,
): SourceGroup | null {
  const ch = (channel ?? '').trim().toLowerCase();
  const src = (source ?? '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  const med = (medium ?? '').trim().toLowerCase();
  if (ch === 'ai assistant' || med === 'ai-assistant') return 'ai';
  if (AI_SOURCE_NAMES.test(src) || sourceGroup(src) === 'ai') return 'ai';
  if (ch === 'direct' || src === '(direct)') return 'direct';
  if (ch === 'organic search' || ch === 'paid search') return 'search';
  if (ch === 'organic social' || ch === 'paid social') return 'social';
  if (ch === 'referral') {
    return sourceGroup(src, ownHost) === null ? null : 'other';
  }
  // Unassigned, Email, Organic Video and the rest: judge by the source.
  if (!src || src === '(not set)') return 'other';
  if (/^(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave)$/.test(src)) return 'search';
  if (
    /^(facebook|instagram|twitter|x|linkedin|youtube|tiktok|pinterest|reddit|threads|nextdoor|bluesky)$/.test(
      src,
    )
  ) {
    return 'social';
  }
  return sourceGroup(src, ownHost);
}

const num = (v: string | undefined) => {
  const k = Number(v);
  return Number.isFinite(k) && k > 0 ? k : 0;
};
const dim = (r: Ga4Row, i: number) => r.dimensionValues?.[i]?.value ?? '';
const met = (r: Ga4Row, i = 0) => num(r.metricValues?.[i]?.value);

/** 'YYYYMMDD' (GA4's date dimension) to 'YYYY-MM-DD'. */
const isoDay = (d: string) =>
  /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d;

/**
 * The batch answer to the card's summary, the same shape as the Cloudflare
 * source's. Visits are GA4 sessions. Throws when a report is missing, so the
 * route says "could not load" rather than showing zeros.
 */
export function ga4Report(answer: Ga4Answer, now: Date, ownHost?: string): VisitorsReport {
  const reports = answer.reports ?? [];
  if (reports.length < 4 || reports.some((r) => !r)) {
    throw new Error('GA4 answered without all four reports.');
  }
  const [daily, pagesR, waysR, beforeR] = reports as Array<{ rows?: Ga4Row[] | null }>;

  const { days } = analyticsWindow(now);
  const perDay = new Map<string, number>();
  for (const r of daily.rows ?? []) {
    const d = isoDay(dim(r, 0));
    perDay.set(d, (perDay.get(d) ?? 0) + met(r));
  }
  const series = days.map((date) => ({ date, visits: perDay.get(date) ?? 0 }));
  const total = (from: number, to: number) =>
    series.slice(from, to).reduce((acc, d) => acc + d.visits, 0);

  const pageViews = new Map<string, number>();
  for (const r of pagesR.rows ?? []) {
    const raw = dim(r, 0).split(/[?#]/)[0] || '/';
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    if (/^\/(studio|preview|api)(\/|$)/.test(path)) continue;
    pageViews.set(path, (pageViews.get(path) ?? 0) + met(r));
  }
  const pages = [...pageViews.entries()]
    .map(([path, views]) => ({ path, views }))
    .filter((p) => p.views > 0)
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, 5);

  const bySource = new Map<SourceGroup, number>();
  for (const r of waysR.rows ?? []) {
    const group = ga4Group(dim(r, 0), dim(r, 1), dim(r, 2), ownHost);
    if (!group) continue;
    bySource.set(group, (bySource.get(group) ?? 0) + met(r));
  }
  let aiBefore = 0;
  for (const r of beforeR.rows ?? []) {
    if (ga4Group(dim(r, 0), dim(r, 1), dim(r, 2), ownHost) === 'ai') aiBefore += met(r);
  }
  const order: SourceGroup[] = ['search', 'ai', 'direct', 'social', 'other'];
  const sources = order
    .map((group) => ({ group, label: SOURCE_LABELS[group], visits: bySource.get(group) ?? 0 }))
    .filter((s) => s.visits > 0)
    .sort((a, b) => b.visits - a.visits);

  return {
    configured: true,
    provider: 'ga4',
    thisWeek: total(SERIES_DAYS - 7, SERIES_DAYS),
    lastWeek: total(SERIES_DAYS - 14, SERIES_DAYS - 7),
    days: series,
    pages,
    sources,
    ai: { thisWeek: bySource.get('ai') ?? 0, lastWeek: aiBefore },
    at: now.toISOString(),
  };
}

/** Read GA4 (through studio-status, or the fallback key) and map it. Throws GoogleError (see failureKind) or Error. */
export async function loadGa4(
  e: GoogleEnv,
  now: Date,
  ownHost: string | undefined,
  tokens: GoogleTokens,
  fetchImpl: FetchLike = fetch,
): Promise<VisitorsReport> {
  const sd = siteData(e);
  if (sd) {
    // A binding that throws (studio-status not deployed with SiteData yet) is "could not load".
    const r = await sd.binding.siteAnalytics(sd.key, ga4Requests(now));
    if (!r.ok) throw siteDataError(r.reason);
    return ga4Report({ reports: r.reports as Ga4Answer['reports'] }, now, ownHost);
  }
  const id = ga4PropertyId(e.GA4_PROPERTY_ID);
  if (!id) throw new GoogleError('GA4_PROPERTY_ID is not a numeric property id.', 0, true);
  const account = serviceAccountFrom(e);
  const answer = await googleJson<Ga4Answer>(
    ga4Url(id),
    { requests: ga4Requests(now) },
    account,
    tokens,
    fetchImpl,
  );
  return ga4Report(answer, now, ownHost);
}

// -----------------------------------------------------------------------------
// Search Console (searchAnalytics.query)
// -----------------------------------------------------------------------------

/** Search Console's figures run about two to three days behind, so the window ends three days ago. */
export const SEARCH_LAG_DAYS = 3;
/** Four weeks against the four before. */
export const SEARCH_DAYS = 28;

const DAY = 24 * 60 * 60 * 1000;
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The two 28-day windows, ending SEARCH_LAG_DAYS ago (UTC days, inclusive). */
export function searchWindow(now: Date) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = today - SEARCH_LAG_DAYS * DAY;
  const start = end - (SEARCH_DAYS - 1) * DAY;
  return {
    startDate: ymd(start),
    endDate: ymd(end),
    beforeStart: ymd(start - SEARCH_DAYS * DAY),
    beforeEnd: ymd(start - DAY),
  };
}

export function searchUrl(site: string): string {
  return `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
}

/** The four query bodies: totals now, totals before, top searches, top pages. */
export function searchRequests(now: Date) {
  const w = searchWindow(now);
  const cur = { startDate: w.startDate, endDate: w.endDate, type: 'web' };
  return {
    totals: cur,
    before: { startDate: w.beforeStart, endDate: w.beforeEnd, type: 'web' },
    queries: { ...cur, dimensions: ['query'], rowLimit: 5 },
    pages: { ...cur, dimensions: ['page'], rowLimit: 5 },
  };
}

interface SearchRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}
export interface SearchAnswer {
  rows?: SearchRow[] | null;
}

export interface SearchReport {
  configured: true;
  /** Clicks from Google over the 28 days, and the 28 before. */
  clicks: number;
  clicksBefore: number;
  /** Times the site appeared in Google's results ("impressions"). */
  impressions: number;
  impressionsBefore: number;
  /** Average position in the results, one decimal; null with no impressions. */
  position: number | null;
  positionBefore: number | null;
  /** The searches people used, most clicks first (up to 5). */
  queries: Array<{ query: string; clicks: number; impressions: number }>;
  /** The pages Google sent people to (paths), most clicks first (up to 5). */
  pages: Array<{ path: string; clicks: number; impressions: number }>;
  /** The window, 'YYYY-MM-DD', inclusive. */
  from: string;
  to: string;
  at: string;
}

const pos = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

function totals(a: SearchAnswer) {
  const r = a.rows?.[0];
  const impressions = pos(r?.impressions);
  return {
    clicks: pos(r?.clicks),
    impressions,
    position:
      impressions > 0 && pos(r?.position) > 0 ? Math.round(pos(r?.position) * 10) / 10 : null,
  };
}

/** A full page URL from Search Console as a path the editor knows ('/' for the home page). */
export function pagePath(url: string | undefined): string {
  try {
    return new URL(url ?? '').pathname || '/';
  } catch {
    return url || '/';
  }
}

/** The four answers to the card's summary. */
export function searchReport(
  answers: {
    totals: SearchAnswer;
    before: SearchAnswer;
    queries: SearchAnswer;
    pages: SearchAnswer;
  },
  now: Date,
): SearchReport {
  const cur = totals(answers.totals);
  const prev = totals(answers.before);
  const w = searchWindow(now);
  return {
    configured: true,
    clicks: cur.clicks,
    clicksBefore: prev.clicks,
    impressions: cur.impressions,
    impressionsBefore: prev.impressions,
    position: cur.position,
    positionBefore: prev.position,
    queries: (answers.queries.rows ?? [])
      .filter((r) => r.keys?.[0])
      .map((r) => ({ query: r.keys![0], clicks: pos(r.clicks), impressions: pos(r.impressions) }))
      .slice(0, 5),
    pages: (answers.pages.rows ?? [])
      .filter((r) => r.keys?.[0])
      .map((r) => ({
        path: pagePath(r.keys![0]),
        clicks: pos(r.clicks),
        impressions: pos(r.impressions),
      }))
      .slice(0, 5),
    from: w.startDate,
    to: w.endDate,
    at: now.toISOString(),
  };
}

/** Read Search Console (through studio-status, or the fallback key) and map it. Throws (see failureKind). */
export async function loadSearch(
  e: GoogleEnv,
  now: Date,
  tokens: GoogleTokens,
  fetchImpl: FetchLike = fetch,
): Promise<SearchReport> {
  const sd = siteData(e);
  if (sd) {
    const r = await sd.binding.searchConsole(sd.key, searchRequests(now));
    if (!r.ok) throw siteDataError(r.reason);
    const a = r.answers as Record<string, SearchAnswer | undefined>;
    return searchReport(
      {
        totals: a.totals ?? {},
        before: a.before ?? {},
        queries: a.queries ?? {},
        pages: a.pages ?? {},
      },
      now,
    );
  }
  const site = searchConsoleSite(e.SEARCH_CONSOLE_SITE);
  if (!site)
    throw new GoogleError('SEARCH_CONSOLE_SITE is not a Search Console property.', 0, true);
  const account = serviceAccountFrom(e);
  const url = searchUrl(site);
  const bodies = searchRequests(now);
  // The first call fetches the token; the other three reuse it from the cache.
  const t = await googleJson<SearchAnswer>(url, bodies.totals, account, tokens, fetchImpl);
  const [before, queries, pages] = await Promise.all([
    googleJson<SearchAnswer>(url, bodies.before, account, tokens, fetchImpl),
    googleJson<SearchAnswer>(url, bodies.queries, account, tokens, fetchImpl),
    googleJson<SearchAnswer>(url, bodies.pages, account, tokens, fetchImpl),
  ]);
  return searchReport({ totals: t, before, queries, pages }, now);
}

// -----------------------------------------------------------------------------
// Plain words for the card
// -----------------------------------------------------------------------------

/** "12 more than the four weeks before (up 20%)", for clicks or appearances. */
export function periodCompare(now: number, before: number, one: string, many: string): string {
  if (now === 0 && before === 0) return 'None yet in the last eight weeks.';
  if (before === 0) return 'The four weeks before had none to compare with.';
  const diff = now - before;
  const pct = Math.round((Math.abs(diff) / before) * 100);
  if (pct < 5) return 'About the same as the four weeks before.';
  const word = (k: number) => (k === 1 ? one : many);
  return diff > 0
    ? `${diff.toLocaleString('en-US')} more ${word(diff)} than the four weeks before (up ${pct}%).`
    : `${(-diff).toLocaleString('en-US')} fewer ${word(-diff)} than the four weeks before (down ${pct}%).`;
}

/** The average position in words: lower is better, so say which way it moved. */
export function positionWords(now: number | null, before: number | null): string {
  if (now === null) return 'Not shown in Google results yet.';
  const where =
    now <= 10 ? 'usually on the first page of results' : 'usually past the first page of results';
  if (before === null) return `On average at place ${now}, ${where}.`;
  const diff = Math.round((before - now) * 10) / 10;
  if (Math.abs(diff) < 0.5)
    return `On average at place ${now}, ${where}, about the same as before.`;
  return diff > 0
    ? `On average at place ${now}, ${where}, ${diff} places higher than before.`
    : `On average at place ${now}, ${where}, ${-diff} places lower than before.`;
}

/** "Sep 21 to Oct 18" for the window. */
export function windowWords(from: string, to: string): string {
  const f = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  return `${f(from)} to ${f(to)}`;
}
