// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Report tool's arithmetic (Studio kit, PORTS.md card 218)
// =============================================================================
// The Astro-family twin of the WordPress board report (tm-theme
// includes/ncs-board.php): calendar Month, Quarter or Year, every number set
// against the same period a year before. Everything here is a pure function of
// (the site's config, a period, a series report, today's date), so the route,
// the Studio screen and the tests share one answer.
//
// THE RULES (they are the product; do not bend them):
//   - A period still running is counted through yesterday and compared with
//     the same days a year before, and says so ("so far, through November 4").
//     On its first day there is no whole day yet, so that day counts as it stands.
//   - A measure that did not exist yet is null and reads "Not tracked yet",
//     never 0, and is never compared.
//   - Months when counting was down (config.gaps) are left out of charts and
//     drop the year-on-year change on any period that touches them.
//   - Search Console keeps about sixteen months, so an older year-before is
//     not compared.
//
// Dates are 'YYYY-MM-DD' strings and months 'YYYY-MM' throughout; `end` and
// `thru` are EXCLUSIVE (the first day after), `from` and `to` inclusive.
// The series report comes from studio-status (SiteData.siteSeries); its shape
// is repeated below because a site cannot import another repo's types.
// =============================================================================

// -----------------------------------------------------------------------------
// The series report (studio-status src/site-analytics-series.ts)
// -----------------------------------------------------------------------------

export interface SeriesTotals {
  users: number;
  newUsers: number;
  sessions: number;
  views: number;
  engagementRate: number;
}

export interface SeriesSearch {
  totals: {
    cur: { clicks: number; impressions: number; ctr: number; position: number };
    prev: { clicks: number; impressions: number; ctr: number; position: number };
  };
  /** Only the months Google still holds, oldest first. */
  months: { ym: string; clicks: number; impressions: number }[];
  queries: { query: string; clicks: number; impressions: number }[];
  pages: { path: string; clicks: number; impressions: number }[];
}

export interface SeriesReport {
  from: string;
  to: string;
  fetched?: string;
  previous?: { startDate: string; endDate: string };
  totals: { cur: SeriesTotals; prev: SeriesTotals };
  /** 24 months ending with the month of `to`, oldest first. */
  months: { ym: string; users: number; newUsers?: number; sessions: number; views: number }[];
  channels: { name: string; sessions: number }[];
  channelsByMonth?: { ym: string; name: string; sessions: number }[];
  regions: { name: string; users: number }[];
  countries: { name: string; users: number }[];
  events: Record<string, { cur: number; prev: number }>;
  /** Per event: 24 counts in the order of `months`; null before its first count. */
  eventsByMonth: Record<string, (number | null)[]>;
  content: { path: string; title: string; views: number; reads: number }[];
  groups?: Record<string, { name: string; views: number; reads: number }[]>;
  search: SeriesSearch | null;
}

/** A Google Analytics failure arrives as a good answer full of zeros: no month with a page view is no answer. */
export function seriesGood(r: unknown): r is SeriesReport {
  const j = r as Partial<SeriesReport> | null;
  if (!j || typeof j !== 'object' || !j.totals || !Array.isArray(j.months)) return false;
  return j.months.some((m) => Number(m?.views) > 0);
}

// -----------------------------------------------------------------------------
// The site's config (src/config/board.ts, the site's own file)
// -----------------------------------------------------------------------------

/**
 * A named measure.
 *   Numbers (tiles and by-month charts): visitors, visits, pageViews,
 *   newVisitors, searchClicks, searchAppearances, and `event:<GA4 event name>`.
 *   Lists (charts only): topContent, channels, places, countries,
 *   searchQueries, searchPages.
 */
export type BoardMeasure = string;

export const LIST_MEASURES = [
  'topContent',
  'channels',
  'places',
  'countries',
  'searchQueries',
  'searchPages',
] as const;

export interface BoardTile {
  measure: BoardMeasure;
  /** The site's own words for it ("Visitors", "Plan a visit forms sent"). */
  label: string;
  /** How it is counted, behind the tile's "i" button. Plain words. */
  explain?: string;
  /** 'flat': a rise is neither good nor bad (no colour on the change). */
  up?: 'good' | 'flat';
}

export interface BoardChart {
  measure: BoardMeasure;
  title: string;
  /** One line under the chart. */
  note?: string;
  /** topContent and searchPages only: keep paths that begin with one of these. */
  prefix?: string[];
  /** Lists: rows kept (default 8). */
  limit?: number;
  /** First chart type; the kit offers the others that suit the data. */
  type?: 'bar' | 'line' | 'area' | 'rank' | 'donut' | 'tilemap';
}

export interface BoardPart {
  id: string;
  title: string;
  /** A shorter name for the bar's link, when the title is long. */
  nav?: string;
  /** The long explanation, behind the part's "i" button. */
  explain?: string;
  tiles?: BoardTile[];
  charts?: BoardChart[];
  /** Behind "Show more". */
  more?: BoardChart[];
}

export interface BoardGap {
  /** 'YYYY-MM' months when counting was down. */
  months: string[];
  /** One sentence saying what happened. */
  text: string;
}

export interface BoardConfig {
  siteName: string;
  /** 'YYYY-MM': the first month the picker offers. */
  firstMonth: string;
  /** IANA zone for "today" (default America/New_York). */
  timeZone?: string;
  /**
   * The day each measure was first counted ('YYYY-MM-DD'), by measure name;
   * `all` is the default for every measure. Before it: "Not tracked yet".
   */
  since?: Record<string, string>;
  gaps?: BoardGap[];
  /** The one-screen overview: headline tiles, then up to four key charts. */
  overview: { tiles: BoardTile[]; charts: BoardChart[] };
  parts: BoardPart[];
}

// -----------------------------------------------------------------------------
// Dates
// -----------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

/** A real calendar date in YYYY-MM-DD. */
export function validDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(utc(s)) === s;
}

export const addDays = (d: string, n: number) => iso(utc(d) + n * DAY);

/** The first of the month `n` months after the month of `d` (n may be negative). */
export function addMonths(d: string, n: number): string {
  const [y, m] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

/** The same calendar date a year earlier; 29 February falls back to the 28th. */
export function yearBefore(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  const last = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${y - 1}-${pad(m)}-${pad(Math.min(day, last))}`;
}

/** Today's date in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const monthName = (d: string) => MONTHS[Number(d.slice(5, 7)) - 1];
/** "November 4" */
export const dayLabel = (d: string) => `${monthName(d)} ${Number(d.slice(8, 10))}`;
/** "Nov 2026" from 2026-11. */
export const ymLabel = (ym: string) => `${monthName(`${ym}-01`).slice(0, 3)} ${ym.slice(0, 4)}`;

// -----------------------------------------------------------------------------
// The period
// -----------------------------------------------------------------------------

export type PeriodKind = 'm' | 'q' | 'y';

export interface BoardPeriod {
  p: PeriodKind;
  /** 2026-10, 2026-Q4 or 2026. */
  k: string;
  /** "October 2026", "October to December 2026", "2026". */
  label: string;
  /** The heading: the label, or "The year 2026". */
  title: string;
  start: string;
  /** Exclusive. */
  end: string;
  running: boolean;
  /** Exclusive: `end`, or today when running (so yesterday is the last day counted). */
  thru: string;
  /** "so far, through November 4", or ''. */
  through: string;
  /** Inclusive, what the series route is asked for. */
  from: string;
  to: string;
  prevStart: string;
  prevEnd: string;
  prevThru: string;
  prevLabel: string;
  /** How to name last year's side in a sentence. */
  vs: string;
  months: string[];
  prevMonths: string[];
  /** The last month with a counted day in it. */
  lastYm: string;
}

const LEN: Record<PeriodKind, number> = { m: 1, q: 3, y: 12 };

export function periodKey(p: PeriodKind, start: string): string {
  const y = start.slice(0, 4);
  if (p === 'y') return y;
  return p === 'q' ? `${y}-Q${Math.ceil(Number(start.slice(5, 7)) / 3)}` : start.slice(0, 7);
}

export function periodLabel(p: PeriodKind, start: string): string {
  const y = start.slice(0, 4);
  if (p === 'y') return y;
  if (p === 'q') {
    const last = addMonths(start, 2);
    return `${monthName(start)} to ${monthName(last)} ${last.slice(0, 4)}`;
  }
  return `${monthName(start)} ${y}`;
}

/** The first day of the period a key names, or null when the key is not one. */
export function keyStart(p: PeriodKind, k: string): string | null {
  let m: RegExpExecArray | null;
  if (p === 'm' && (m = /^(\d{4})-(\d{2})$/.exec(k)) && +m[2] >= 1 && +m[2] <= 12) {
    return `${m[1]}-${m[2]}-01`;
  }
  if (p === 'q' && (m = /^(\d{4})-Q([1-4])$/.exec(k)))
    return `${m[1]}-${pad((+m[2] - 1) * 3 + 1)}-01`;
  if (p === 'y' && (m = /^(\d{4})$/.exec(k))) return `${m[1]}-01-01`;
  return null;
}

/** Is this a well-formed kind and key (whatever the dates)? The route refuses anything else. */
export function validPeriodRequest(p: unknown, k: unknown): boolean {
  if (p !== 'm' && p !== 'q' && p !== 'y') return false;
  return k === '' || k == null || (typeof k === 'string' && keyStart(p, k) !== null);
}

const firstDay = (cfg: Pick<BoardConfig, 'firstMonth'>) =>
  /^\d{4}-\d{2}$/.test(cfg.firstMonth) ? `${cfg.firstMonth}-01` : '2000-01-01';

/** The start of the period of kind `p` that holds the day `d`. */
function startHolding(p: PeriodKind, d: string): string {
  const y = d.slice(0, 4);
  const m = Number(d.slice(5, 7));
  if (p === 'y') return `${y}-01-01`;
  return p === 'q' ? `${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01` : `${y}-${pad(m)}-01`;
}

/**
 * One period. A key that is malformed, in the future, or wholly before the
 * site's first month gives the period running now. (A quarter or year that
 * merely BEGINS before the first month is kept: it holds counted months.)
 */
export function boardPeriod(
  cfg: Pick<BoardConfig, 'firstMonth'>,
  pIn: string | null | undefined,
  k: string | null | undefined,
  today: string,
): BoardPeriod {
  const p: PeriodKind = pIn === 'q' || pIn === 'y' ? pIn : 'm';
  const min = firstDay(cfg);
  let s = keyStart(p, String(k ?? ''));
  if (!s || addMonths(s, LEN[p]) <= min || s > today) s = startHolding(p, today);
  const e = addMonths(s, LEN[p]);
  const running = today < e;
  const thru = running ? (today > s ? today : addDays(today, 1)) : e;
  const ps = addMonths(s, -12);
  const pe = addMonths(e, -12);
  const months: string[] = [];
  const prevMonths: string[] = [];
  for (let i = 0; i < LEN[p]; i++) {
    months.push(addMonths(s, i).slice(0, 7));
    prevMonths.push(addMonths(ps, i).slice(0, 7));
  }
  const label = periodLabel(p, s);
  const prevLabel = periodLabel(p, ps);
  const to = addDays(thru, -1);
  return {
    p,
    k: periodKey(p, s),
    label,
    title: p === 'y' ? `The year ${label}` : label,
    start: s,
    end: e,
    running,
    thru,
    through: running ? `so far, through ${dayLabel(to)}` : '',
    from: s,
    to,
    prevStart: ps,
    prevEnd: pe,
    prevThru: running ? addDays(yearBefore(to), 1) : pe,
    prevLabel,
    vs: running ? `the same days in ${prevLabel}` : prevLabel,
    months,
    prevMonths,
    lastYm: to.slice(0, 7),
  };
}

/** Every period of one kind the picker offers, newest first. */
export function periodOptions(
  cfg: Pick<BoardConfig, 'firstMonth'>,
  p: PeriodKind,
  today: string,
): { k: string; label: string }[] {
  const min = firstDay(cfg);
  const out: { k: string; label: string }[] = [];
  let s = boardPeriod(cfg, p, '', today).start;
  let first = true;
  while (addMonths(s, LEN[p]) > min && out.length < 240) {
    out.push({
      k: periodKey(p, s),
      label: `${p === 'y' ? 'The year ' : ''}${periodLabel(p, s)}${first ? ' (so far)' : ''}`,
    });
    first = false;
    s = addMonths(s, -LEN[p]);
  }
  return out;
}

/** The key of the period of another kind that holds this period's last counted day. */
export function switchKind(per: BoardPeriod, p: PeriodKind): string {
  return periodKey(p, startHolding(p, per.to));
}

/** The `n` months ending with `lastYm`, oldest first. */
export function monthWindow(lastYm: string, n = 24): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(`${lastYm}-01`, -i).slice(0, 7));
  return out;
}

// -----------------------------------------------------------------------------
// Change, gaps, "not tracked yet"
// -----------------------------------------------------------------------------

export interface BoardDelta {
  /** "Up 13%", "Down 4%", "About the same". */
  chip: string;
  /** "October 2025", "the same days in November 2025". */
  against: string;
  tone: 'good' | 'bad' | 'flat';
}

/** The change against last year, or null when there is nothing to compare. */
export function boardDelta(
  now: number | null,
  then: number | null,
  vs: string,
  up: 'good' | 'flat' = 'good',
): BoardDelta | null {
  if (now === null || then === null || !(then > 0)) return null;
  const pc = Math.round(((now - then) / then) * 100);
  if (pc === 0) return { chip: 'About the same', against: vs, tone: 'flat' };
  return {
    chip: `${pc > 0 ? 'Up' : 'Down'} ${Math.abs(pc)}%`,
    against: vs,
    tone: up === 'flat' ? 'flat' : pc > 0 ? 'good' : 'bad',
  };
}

/** Every gap month, and the sentences of the gaps a span of dates touches. */
export function gapMonths(cfg: Pick<BoardConfig, 'gaps'>): Set<string> {
  return new Set((cfg.gaps ?? []).flatMap((g) => g.months));
}

/** The gaps a span of dates (inclusive) touches. */
export function gapsHit(cfg: Pick<BoardConfig, 'gaps'>, from: string, to: string): BoardGap[] {
  const a = from.slice(0, 7);
  const b = to.slice(0, 7);
  return (cfg.gaps ?? []).filter((g) => g.months.some((ym) => a <= ym && ym <= b));
}

/** Google's names for how people arrived, in the words an editor uses. An unknown name passes through. */
const CHANNEL_NAMES: Record<string, string> = {
  Direct: 'Typed or bookmarked',
  'Organic Search': 'Search engines',
  Referral: 'Other websites',
  'AI Assistant': 'AI assistants',
  'Organic Social': 'Social media',
  'Organic Video': 'Video sites',
  'Organic Shopping': 'Shopping sites',
  Email: 'Email',
  'Paid Search': 'Search adverts',
  'Paid Social': 'Social media adverts',
  Display: 'Display adverts',
  Unassigned: 'Not known',
  '(not set)': 'Not known',
  Other: 'Other ways',
};
export const channelName = (name: string): string => CHANNEL_NAMES[name] ?? name;

/** The day a measure was first counted: its own `since`, else `all`, else the first month. */
export function sinceFor(cfg: Pick<BoardConfig, 'since' | 'firstMonth'>, measure: string): string {
  const own = cfg.since?.[measure] ?? cfg.since?.all;
  return validDate(own) ? own : firstDay(cfg);
}

/** Google Search Console keeps about sixteen months: is last year's side still whole? */
export function searchPrevOk(per: BoardPeriod, today: string): boolean {
  return per.prevStart >= addDays(addMonths(today, -16), Number(today.slice(8, 10)) - 1 + 3);
}

const isSearch = (m: string) => m.startsWith('search');
export const isListMeasure = (m: string) => (LIST_MEASURES as readonly string[]).includes(m);

// -----------------------------------------------------------------------------
// Reading a measure out of a report
// -----------------------------------------------------------------------------

interface Reading {
  /** An event the feed knows but has never seen: its count for the period (0). */
  neverSeen?: number;
  cur: number | null;
  prev: number | null;
  /** ym -> count (null: not tracked that month). Only the months the report holds. */
  byMonth: Map<string, number | null>;
}

const TOTAL_KEY: Record<string, 'users' | 'sessions' | 'views' | 'newUsers'> = {
  visitors: 'users',
  visits: 'sessions',
  pageViews: 'views',
  newVisitors: 'newUsers',
};

function read(r: SeriesReport, measure: string): Reading {
  const byMonth = new Map<string, number | null>();
  const key = TOTAL_KEY[measure];
  if (key) {
    for (const m of r.months) byMonth.set(m.ym, typeof m[key] === 'number' ? m[key]! : null);
    return { cur: r.totals.cur[key] ?? null, prev: r.totals.prev[key] ?? null, byMonth };
  }
  if (measure.startsWith('event:')) {
    const name = measure.slice(6);
    const e = r.events?.[name];
    const series = r.eventsByMonth?.[name];
    if (!e || !Array.isArray(series)) return { cur: null, prev: null, byMonth };
    r.months.forEach((m, i) => byMonth.set(m.ym, series[i] ?? null));
    // Never seen in the 24 months: without a start date it did not exist yet, which is not a
    // zero. Set against a site's own start date it is a true zero (see zeroFrom).
    if (series.every((v) => v === null || v === undefined))
      return { cur: null, prev: null, byMonth, neverSeen: e.cur };
    return { cur: e.cur, prev: e.prev, byMonth };
  }
  if (measure === 'searchClicks' || measure === 'searchAppearances') {
    if (!r.search) return { cur: null, prev: null, byMonth };
    const f = measure === 'searchClicks' ? 'clicks' : 'impressions';
    for (const m of r.search.months) byMonth.set(m.ym, m[f]);
    return { cur: r.search.totals.cur[f], prev: r.search.totals.prev[f], byMonth };
  }
  return { cur: null, prev: null, byMonth };
}

// -----------------------------------------------------------------------------
// The view: tiles and chart specs
// -----------------------------------------------------------------------------

export const NOT_TRACKED = 'Not tracked yet';

export interface TileView {
  measure: string;
  label: string;
  explain: string;
  /** null reads "Not tracked yet". */
  value: number | null;
  delta: BoardDelta | null;
  /** The one muted line under the number. */
  line: string;
  /** Twelve months ending with the period's last month; null is a hatched band, gap months are left out. */
  spark: { ym: string; value: number | null }[];
}

/** A chart for ncsCharts.render (the contract is in the header of kit/board/ncs-charts.js). */
export interface ChartSpec {
  title: string;
  type: string;
  types: string[];
  labels: string[];
  series: { name: string; values: (number | null)[]; tone: string }[];
  format: 'number';
  note?: string;
  states?: Record<string, number>;
  compact: true;
  locale: string;
}

export interface ChartView {
  id: string;
  measure: string;
  title: string;
  spec: ChartSpec | null;
  /** Why there is no chart (spec null): one plain sentence. */
  empty?: string;
}

export interface PartView {
  id: string;
  title: string;
  explain: string;
  tiles: TileView[];
  charts: ChartView[];
  more: ChartView[];
}

export interface BoardView {
  period: BoardPeriod;
  /** Sentences for the top of the report: a part month, a gap. */
  notices: string[];
  overview: { tiles: TileView[]; charts: ChartView[] };
  parts: PartView[];
}

/**
 * The first month an event counts as a true 0 rather than "not tracked": the day the site says it
 * began counting. A site that gives no start date gets no zeros: the first event seen starts it.
 */
function zeroFrom(cfg: BoardConfig, measure: string): string | null {
  if (!measure.startsWith('event:')) return null;
  const day = cfg.since?.[measure] ?? cfg.since?.all;
  return day ? day.slice(0, 7) : null;
}

/** A month's number. An event the feed does not list at all stays null, even with a start date. */
function monthValue(got: Reading, ym: string, zero: string | null): number | null {
  if (!got.byMonth.has(ym)) return null;
  return got.byMonth.get(ym) ?? (zero !== null ? 0 : null);
}

function tileView(
  cfg: BoardConfig,
  per: BoardPeriod,
  r: SeriesReport,
  t: BoardTile,
  today: string,
): TileView {
  const since = sinceFor(cfg, t.measure);
  const got = read(r, t.measure);
  const gaps = gapMonths(cfg);
  // Not counted at all in this period: null, never 0.
  const zero = zeroFrom(cfg, t.measure);
  const none = zero !== null && got.neverSeen !== undefined && since <= per.to;
  const value = since > per.to ? null : none ? got.neverSeen! : got.cur;
  const hitGap =
    gapsHit(cfg, per.from, per.to).length > 0 ||
    gapsHit(cfg, per.prevStart, addDays(per.prevThru, -1)).length > 0;
  const prevTracked = since <= per.prevStart && (!isSearch(t.measure) || searchPrevOk(per, today));
  const delta =
    value === null || hitGap || !prevTracked
      ? null
      : boardDelta(value, got.prev, per.vs, t.up ?? 'good');
  let line: string;
  if (value === null) {
    line =
      isSearch(t.measure) && !r.search && since <= per.to
        ? 'Google Search Console did not answer just now.'
        : since > per.to
          ? `Counting began ${dayLabel(since)}, ${since.slice(0, 4)}.`
          : 'No count has arrived for this yet.';
  } else if (none) line = `None counted since ${dayLabel(since)}, ${since.slice(0, 4)}.`;
  else if (hitGap) line = 'Not compared: counting was down for part of this time.';
  else if (!prevTracked) {
    line =
      since > per.from
        ? `Counted from ${dayLabel(since)}. Nothing to compare with yet.`
        : since <= per.prevStart
          ? 'Not compared: Google keeps only about sixteen months.'
          : 'Nothing to compare with yet: this was not counted a year ago.';
  } else if (delta) line = `Set against ${delta.against}.`;
  else line = `Nothing was counted in ${per.vs}.`;

  const sinceYm = since.slice(0, 7);
  const spark = monthWindow(per.lastYm, 12)
    .filter((ym) => !gaps.has(ym))
    .map((ym) => ({
      ym,
      value: ym < sinceYm ? null : monthValue(got, ym, zero),
    }));
  return {
    measure: t.measure,
    label: t.label,
    explain: t.explain ?? '',
    value,
    delta,
    line,
    spark,
  };
}

const LOCALE = 'en-US';

function monthChart(cfg: BoardConfig, per: BoardPeriod, r: SeriesReport, c: BoardChart): ChartSpec {
  const since = sinceFor(cfg, c.measure).slice(0, 7);
  const gaps = gapMonths(cfg);
  const got = read(r, c.measure);
  const zero = zeroFrom(cfg, c.measure);
  const at = (ym: string) => (ym < since ? null : monthValue(got, ym, zero));
  const notes: string[] = [];
  if (c.note) notes.push(c.note);
  let months: string[];
  let series: ChartSpec['series'];
  let labels: string[];
  if (per.p === 'y') {
    // The year's months so far, beside the same months a year before.
    months = per.months.filter((ym) => ym <= per.lastYm && !gaps.has(ym));
    labels = months.map((ym) => ymLabel(ym).slice(0, 3));
    const prev = months.map((ym) => at(addMonths(`${ym}-01`, -12).slice(0, 7)));
    series = [{ name: per.label, values: months.map(at), tone: 'now' }];
    if (prev.some((v) => v !== null)) {
      series.push({ name: per.prevLabel, values: prev, tone: 'then' });
    }
  } else {
    months = monthWindow(per.lastYm, 12).filter((ym) => !gaps.has(ym));
    labels = months.map(ymLabel);
    series = [{ name: c.title, values: months.map(at), tone: 'now' }];
  }
  if (per.running) notes.push(`${ymLabel(per.lastYm)} is ${per.through}.`);
  const left = monthWindow(per.lastYm, 12).filter((ym) => gaps.has(ym));
  if (left.length && per.p !== 'y') {
    notes.push(`Left out, because counting was down: ${left.map(ymLabel).join(', ')}.`);
  }
  return {
    title: c.title,
    type: c.type && ['bar', 'line', 'area'].includes(c.type) ? c.type : 'bar',
    types: ['bar', 'line', 'area'],
    labels,
    series,
    format: 'number',
    ...(notes.length ? { note: notes.join(' ') } : {}),
    compact: true,
    locale: LOCALE,
  };
}

const under = (path: string, prefix?: string[]) =>
  !prefix?.length || prefix.some((p) => path === p || path.startsWith(p));

/** A page's name for a chart row: its title without the site's suffix, else its path. */
function pageName(title: string, path: string): string {
  const t = (title || '').split(/\s[|·]\s/)[0].trim();
  return t && t !== '(not set)' ? t : path;
}

function listRows(r: SeriesReport, c: BoardChart): { rows: [string, number][]; name: string } {
  const top = (rows: [string, number][]) =>
    rows
      .filter(([n, v]) => n && v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, c.limit ?? 8);
  switch (c.measure) {
    case 'topContent':
      return {
        name: 'Pages viewed',
        rows: top(
          r.content
            .filter((p) => under(p.path, c.prefix))
            .map((p) => [pageName(p.title, p.path), p.views]),
        ),
      };
    case 'channels':
      return {
        name: 'Visits',
        rows: top(r.channels.map((x) => [channelName(x.name), x.sessions])),
      };
    case 'places':
      return { name: 'Visitors', rows: top(r.regions.map((x) => [x.name, x.users])) };
    case 'countries':
      return { name: 'Visitors', rows: top(r.countries.map((x) => [x.name, x.users])) };
    case 'searchQueries':
      return {
        name: 'Clicks from Google',
        rows: top((r.search?.queries ?? []).map((x) => [x.query, x.clicks])),
      };
    case 'searchPages':
      return {
        name: 'Clicks from Google',
        rows: top(
          (r.search?.pages ?? [])
            .filter((p) => under(p.path, c.prefix))
            .map((x) => [x.path, x.clicks]),
        ),
      };
    default:
      return { name: '', rows: [] };
  }
}

function chartView(
  cfg: BoardConfig,
  per: BoardPeriod,
  r: SeriesReport,
  c: BoardChart,
  id: string,
): ChartView {
  const since = sinceFor(cfg, c.measure);
  const base = { id, measure: c.measure, title: c.title };
  if (since > per.to) {
    return {
      ...base,
      spec: null,
      empty: `${NOT_TRACKED}. Counting began ${dayLabel(since)}, ${since.slice(0, 4)}.`,
    };
  }
  if (isSearch(c.measure) && !r.search) {
    return { ...base, spec: null, empty: 'Google Search Console did not answer just now.' };
  }
  if (!isListMeasure(c.measure)) {
    const spec = monthChart(cfg, per, r, c);
    const any = spec.series.some((s) => s.values.some((v) => v !== null));
    return any ? { ...base, spec } : { ...base, spec: null, empty: `${NOT_TRACKED}.` };
  }
  const { rows, name } = listRows(r, c);
  if (!rows.length) return { ...base, spec: null, empty: `Nothing to show for ${per.label} yet.` };
  const map = c.measure === 'places';
  const type = c.type && ['rank', 'bar', 'donut', 'tilemap'].includes(c.type) ? c.type : 'rank';
  return {
    ...base,
    spec: {
      title: c.title,
      type: type === 'tilemap' && !map ? 'rank' : type,
      types: map ? ['rank', 'tilemap', 'bar'] : ['rank', 'bar', 'donut'],
      labels: rows.map(([n]) => n),
      series: [{ name, values: rows.map(([, v]) => v), tone: 'now' }],
      format: 'number',
      ...(c.note ? { note: c.note } : {}),
      ...(map
        ? { states: Object.fromEntries(r.regions.map((x) => [x.name, x.users] as const)) }
        : {}),
      compact: true,
      locale: LOCALE,
    },
  };
}

/** Everything the screen draws for one period. */
export function boardView(
  cfg: BoardConfig,
  per: BoardPeriod,
  r: SeriesReport,
  today: string,
): BoardView {
  const tiles = (list: BoardTile[] | undefined) =>
    (list ?? []).map((t) => tileView(cfg, per, r, t, today));
  const charts = (list: BoardChart[] | undefined, at: string) =>
    (list ?? []).map((c, i) => chartView(cfg, per, r, c, `${at}-${i}`));

  const notices: string[] = [];
  const all = sinceFor(cfg, 'all');
  if (all > per.from && all <= per.to) {
    notices.push(
      `Counting began on ${dayLabel(all)}, so ${per.p === 'm' ? 'this is a part month' : 'this period is not a whole one'}.`,
    );
  }
  for (const g of gapsHit(cfg, per.from, per.to)) notices.push(g.text);
  for (const g of gapsHit(cfg, per.prevStart, addDays(per.prevThru, -1))) {
    if (!notices.includes(g.text)) notices.push(g.text);
  }
  if (notices.some((n) => (cfg.gaps ?? []).some((g) => g.text === n))) {
    notices.push('So this period is not compared with the year before.');
  }

  return {
    period: per,
    notices,
    overview: {
      tiles: tiles(cfg.overview.tiles),
      charts: charts(cfg.overview.charts.slice(0, 4), 'overview'),
    },
    parts: cfg.parts.map((p) => ({
      id: p.id,
      title: p.title,
      explain: p.explain ?? '',
      tiles: tiles(p.tiles),
      charts: charts(p.charts, p.id),
      more: charts(p.more, `${p.id}-more`),
    })),
  };
}

// -----------------------------------------------------------------------------
// The route's answer, and how long it may be kept
// -----------------------------------------------------------------------------

export type BoardAnswer =
  | { configured: false; reason: 'no-binding' | 'no-ga4' }
  | { configured: true; connect: true }
  | { configured: true; error: string }
  | { configured: true; p: PeriodKind; k: string; today: string; report: SeriesReport; at: string };

/**
 * Seconds a good answer is kept on the site: a month once the period is three
 * days over, one hour when Search Console did not answer (so it is asked again
 * soon), else three hours.
 */
export function boardTtl(per: BoardPeriod, r: SeriesReport, today: string): number {
  if (!r.search) return 3600;
  return addDays(per.end, 3) <= today ? 30 * 86400 : 3 * 3600;
}

/** A whole number the way the report writes it. */
export const formatCount = (n: number) => Math.round(n).toLocaleString(LOCALE);
