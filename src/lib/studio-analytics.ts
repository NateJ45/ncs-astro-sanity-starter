// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home's Visitors card, the pure half (Studio kit, PORTS.md card 115)
// =============================================================================
// The Worker route /api/studio/visitors/ (src/pages/api/studio/visitors.ts)
// asks Cloudflare Web Analytics for this site's numbers with a server-side,
// read-only API token and hands the Studio a small summary: visits in the last
// seven days against the seven before, a four-week daily series, the most-read
// pages and where visitors came from (search, typed it in, other sites,
// social, and since card 123 AI assistants such as ChatGPT, with their own
// week-on-week count). This file is the pure half (the GraphQL request, the mapping, the
// referrer groups), free of Worker and React imports so
// src/lib/studio-analytics.test.ts can check it in bare Node.
//
// Cloudflare Web Analytics is cookieless and the free plan includes it. Its
// GraphQL node is rumPageloadEventsAdaptiveGroups (sampled, so the numbers are
// close estimates, which is all a church dashboard needs). Dates are UTC days.
// =============================================================================

const DAY = 24 * 60 * 60 * 1000;

/** How many days the chart shows. Four weeks. */
export const SERIES_DAYS = 28;

export const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

export interface AnalyticsSettings {
  /** The API token (secret CF_ANALYTICS_TOKEN): Account Analytics, Read. */
  token: string;
  /** The Cloudflare account id (var CF_ACCOUNT_ID). */
  accountTag: string;
  /** The Web Analytics site tag (var CF_WEB_ANALYTICS_SITE_TAG). Not the beacon token. */
  siteTag: string;
}

/** Account ids and site tags are 32 hex characters; anything else is refused. */
export function isTag(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value);
}

/** 'YYYY-MM-DD' for a UTC day. */
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The windows the card reads, ending now. Days are UTC calendar days, oldest first. */
export function analyticsWindow(now: Date) {
  const end = now.getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: SERIES_DAYS }, (_, i) =>
    ymd(today - (SERIES_DAYS - 1 - i) * DAY),
  );
  return {
    /** Start of the oldest day in the chart. */
    start: new Date(today - (SERIES_DAYS - 1) * DAY).toISOString(),
    /** Seven days ago, to the minute: "the last 7 days". */
    weekStart: new Date(end - 7 * DAY).toISOString(),
    /** Fourteen days ago: the week before, for the AI assistants trend (card 123). */
    prevWeekStart: new Date(end - 14 * DAY).toISOString(),
    end: new Date(end).toISOString(),
    days,
  };
}

/**
 * One request, four answers: visits per day for four weeks, the most-read
 * pages and the referring sites over the last seven days, and the referring
 * sites over the seven days before (only the AI assistants are read from it).
 */
export const ANALYTICS_QUERY = `query HomeVisitors($accountTag: string!, $siteTag: string!, $start: Time!, $prevWeekStart: Time!, $weekStart: Time!, $end: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      daily: rumPageloadEventsAdaptiveGroups(limit: 100, filter: { AND: [{ datetime_geq: $start, datetime_leq: $end }, { siteTag: $siteTag }] }, orderBy: [date_ASC]) {
        count
        sum { visits }
        dimensions { date }
      }
      pages: rumPageloadEventsAdaptiveGroups(limit: 8, filter: { AND: [{ datetime_geq: $weekStart, datetime_leq: $end }, { siteTag: $siteTag }] }, orderBy: [count_DESC]) {
        count
        dimensions { requestPath }
      }
      referers: rumPageloadEventsAdaptiveGroups(limit: 50, filter: { AND: [{ datetime_geq: $weekStart, datetime_leq: $end }, { siteTag: $siteTag }] }, orderBy: [count_DESC]) {
        count
        sum { visits }
        dimensions { refererHost }
      }
      referersBefore: rumPageloadEventsAdaptiveGroups(limit: 50, filter: { AND: [{ datetime_geq: $prevWeekStart, datetime_lt: $weekStart }, { siteTag: $siteTag }] }, orderBy: [count_DESC]) {
        count
        sum { visits }
        dimensions { refererHost }
      }
    }
  }
}`;

/** The POST body for GRAPHQL_URL. */
export function analyticsRequest(settings: AnalyticsSettings, now: Date) {
  const w = analyticsWindow(now);
  return {
    query: ANALYTICS_QUERY,
    variables: {
      accountTag: settings.accountTag,
      siteTag: settings.siteTag,
      start: w.start,
      prevWeekStart: w.prevWeekStart,
      weekStart: w.weekStart,
      end: w.end,
    },
  };
}

/** Headers for the GraphQL call. The token never leaves the Worker. */
export function analyticsHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// -----------------------------------------------------------------------------
// Where visitors came from
// -----------------------------------------------------------------------------

export type SourceGroup = 'search' | 'ai' | 'direct' | 'other' | 'social';

/** The plain words for each group, in the order the card lists them. */
export const SOURCE_LABELS: Record<SourceGroup, string> = {
  search: 'Searched for it',
  ai: 'AI assistants',
  direct: 'Typed it in or used a bookmark',
  social: 'Social media',
  other: 'A link on another website',
};

const SEARCH = [
  /(^|\.)google\./,
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)search\.yahoo\.com$/,
  /(^|\.)yahoo\.com$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)search\.brave\.com$/,
  /(^|\.)baidu\.com$/,
  /(^|\.)yandex\./,
  /(^|\.)startpage\.com$/,
  /(^|\.)qwant\.com$/,
];
/**
 * AI assistants that send visitors on with a link (card 123). Checked BEFORE
 * search, because gemini.google.com would otherwise read as Google search.
 * Many assistant visits arrive with no referrer at all and count as "Typed it
 * in", so this number is a floor, not the whole story.
 */
export const AI_HOSTS = [
  /(^|\.)chatgpt\.com$/,
  /^chat\.openai\.com$/,
  /(^|\.)perplexity\.ai$/,
  /^copilot\.microsoft\.com$/,
  /^copilot\.cloud\.microsoft$/,
  /^gemini\.google\.com$/,
  /^bard\.google\.com$/,
  /(^|\.)claude\.ai$/,
  /(^|\.)you\.com$/,
  /(^|\.)phind\.com$/,
  /(^|\.)poe\.com$/,
  /(^|\.)meta\.ai$/,
  /^chat\.mistral\.ai$/,
  /^chat\.deepseek\.com$/,
  /(^|\.)grok\.com$/,
];
const SOCIAL = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.me$/,
  /(^|\.)instagram\.com$/,
  /^t\.co$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)linkedin\.com$/,
  /^lnkd\.in$/,
  /(^|\.)youtube\.com$/,
  /^youtu\.be$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)pinterest\.com$/,
  /(^|\.)reddit\.com$/,
  /(^|\.)threads\.net$/,
  /(^|\.)nextdoor\.com$/,
  /(^|\.)bsky\.app$/,
];

/**
 * Which group a referring host belongs to. No host is "direct". The site's
 * own host is null: a click from one page to the next is not a way in.
 */
export function sourceGroup(host: string | null | undefined, ownHost?: string): SourceGroup | null {
  const h = (host ?? '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!h) return 'direct';
  const own = (ownHost ?? '').toLowerCase().replace(/^www\./, '');
  if (own && h === own) return null;
  if (AI_HOSTS.some((re) => re.test(h))) return 'ai';
  if (SEARCH.some((re) => re.test(h))) return 'search';
  if (SOCIAL.some((re) => re.test(h))) return 'social';
  return 'other';
}

// -----------------------------------------------------------------------------
// The summary the Studio gets
// -----------------------------------------------------------------------------

interface Group {
  count?: number;
  sum?: { visits?: number };
  dimensions?: { date?: string; requestPath?: string; refererHost?: string };
}

/** The slice of the GraphQL answer this file reads. */
export interface AnalyticsAnswer {
  data?: {
    viewer?: {
      accounts?: Array<{
        daily?: Group[];
        pages?: Group[];
        referers?: Group[];
        referersBefore?: Group[];
      }>;
    };
  } | null;
  errors?: Array<{ message?: string }> | null;
}

export interface VisitorsReport {
  configured: true;
  /** Visits in the last seven days (the seven newest chart days). */
  thisWeek: number;
  /** Visits in the seven days before that. */
  lastWeek: number;
  /** One entry per UTC day, oldest first, SERIES_DAYS long; missing days are 0. */
  days: Array<{ date: string; visits: number }>;
  /** Most-read pages over the last seven days, by page views. */
  pages: Array<{ path: string; views: number }>;
  /** Where visits came from over the last seven days, biggest first, empty groups left out. */
  sources: Array<{ group: SourceGroup; label: string; visits: number }>;
  /**
   * Visits sent by AI assistants (card 123): the last 7 days and the 7 before.
   * Also in `sources`; kept apart so the card can show the trend.
   */
  ai: { thisWeek: number; lastWeek: number };
  /** When this was read (ISO). */
  at: string;
}

/** What the route says when the Worker has no token, site tag or account id. */
export const NOT_SET_UP = { configured: false } as const;

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** A path shown to an editor: no query string, trailing slash kept as is. */
const cleanPath = (p: string | undefined) => {
  const path = (p ?? '').split(/[?#]/)[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * The GraphQL answer to the card's summary. The daily series is the source of
 * the week totals, so the two can never disagree. Paths under /studio,
 * /preview and /api are the editor's own visits and are left out of the
 * most-read list. Throws when the answer carries errors or no account, so the
 * route can say "could not load" rather than show zeros.
 */
export function visitorsReport(
  answer: AnalyticsAnswer,
  now: Date,
  ownHost?: string,
): VisitorsReport {
  if (answer.errors?.length) {
    throw new Error(answer.errors.map((e) => e.message ?? 'error').join('; '));
  }
  const account = answer.data?.viewer?.accounts?.[0];
  if (!account) throw new Error('No account in the answer (check CF_ACCOUNT_ID and the token).');

  const { days } = analyticsWindow(now);
  const perDay = new Map<string, number>();
  for (const g of account.daily ?? []) {
    const d = g.dimensions?.date;
    if (d) perDay.set(d, (perDay.get(d) ?? 0) + n(g.sum?.visits));
  }
  const series = days.map((date) => ({ date, visits: perDay.get(date) ?? 0 }));
  const total = (from: number, to: number) =>
    series.slice(from, to).reduce((acc, d) => acc + d.visits, 0);

  const pageViews = new Map<string, number>();
  for (const g of account.pages ?? []) {
    const path = cleanPath(g.dimensions?.requestPath);
    if (/^\/(studio|preview|api)(\/|$)/.test(path)) continue;
    pageViews.set(path, (pageViews.get(path) ?? 0) + n(g.count));
  }
  const pages = [...pageViews.entries()]
    .map(([path, views]) => ({ path, views }))
    .filter((p) => p.views > 0)
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, 5);

  const bySource = new Map<SourceGroup, number>();
  for (const g of account.referers ?? []) {
    const group = sourceGroup(g.dimensions?.refererHost, ownHost);
    if (!group) continue;
    bySource.set(group, (bySource.get(group) ?? 0) + n(g.sum?.visits));
  }
  let aiBefore = 0;
  for (const g of account.referersBefore ?? []) {
    if (sourceGroup(g.dimensions?.refererHost, ownHost) === 'ai') aiBefore += n(g.sum?.visits);
  }
  const order: SourceGroup[] = ['search', 'ai', 'direct', 'social', 'other'];
  const sources = order
    .map((group) => ({ group, label: SOURCE_LABELS[group], visits: bySource.get(group) ?? 0 }))
    .filter((s) => s.visits > 0)
    .sort((a, b) => b.visits - a.visits);

  return {
    configured: true,
    thisWeek: total(SERIES_DAYS - 7, SERIES_DAYS),
    lastWeek: total(SERIES_DAYS - 14, SERIES_DAYS - 7),
    days: series,
    pages,
    sources,
    ai: { thisWeek: bySource.get('ai') ?? 0, lastWeek: aiBefore },
    at: now.toISOString(),
  };
}

/** The AI assistants line under the sources (card 123), or null when there is nothing to say. */
export function aiCompare(ai: { thisWeek: number; lastWeek: number } | undefined): string | null {
  if (!ai || (ai.thisWeek === 0 && ai.lastWeek === 0)) return null;
  const word = (k: number) => (k === 1 ? 'visit' : 'visits');
  return `AI assistants such as ChatGPT sent ${ai.thisWeek} ${word(ai.thisWeek)} this week, and ${ai.lastWeek} the week before.`;
}

/** "12 more than the week before", "about the same as the week before", in plain words. */
export function weekCompare(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0 && thisWeek === 0) return 'No visits in the last two weeks yet.';
  if (lastWeek === 0) return 'The week before had none to compare with.';
  const diff = thisWeek - lastWeek;
  const pct = Math.round((Math.abs(diff) / lastWeek) * 100);
  if (pct < 5) return 'About the same as the week before.';
  const word = (k: number) => (k === 1 ? 'visit' : 'visits');
  return diff > 0
    ? `${diff} more ${word(diff)} than the week before (up ${pct}%).`
    : `${-diff} fewer ${word(-diff)} than the week before (down ${pct}%).`;
}
