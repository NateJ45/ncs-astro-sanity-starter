// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand
// =============================================================================
// business-hours - opening hours, dated changes and "open now" (PORTS.md card 196)
// =============================================================================
// Pure logic, no Sanity and no site import, so the same functions run at build
// time (the hours table, the structured data) AND in the visitor's browser (the
// "Open now until 5 pm" line, which a static page cannot know at build time).
//
// THE DATA (Business info > Opening hours, src/sanity/schemaTypes/businessInfo.ts):
//   openingHours[]  the usual week: rows of { days[], opens, closes, label?,
//                   confirmed }. A day with no row is closed. Two rows on one day
//                   are two spells (9 to 12, then 1 to 5). A closing time at or
//                   before the opening time runs past midnight (6 pm to 2 am);
//                   the same time twice means open 24 hours.
//   hoursChanges[]  dated exceptions: { date, endDate?, kind: closed | hours,
//                   opens?, closes?, note? } for a holiday, a closure or a short
//                   day. The usual week is never touched (rule 15): a change
//                   applies on its dates and is ignored everywhere once its last
//                   day has passed, at build time AND in the browser, so an
//                   expired change never shows even if no rebuild ran.
//
// TIME ZONE. Every "today" and "now" is on the site's clock (site.timeZone),
// passed in by the caller. Days are YYYY-MM-DD strings, times are minutes after
// midnight, so a daylight saving change never moves an opening time.
//
// A CHURCH maps its gatherings onto the same shape: a gathering is a row with a
// label ("Worship"), its day and a start and end time; "A different Sunday" is a
// dated change. First Baptist Auburn keeps its own church layer
// (src/lib/church-facts.ts there); docs/agent/business-facts.md has the mapping.
// =============================================================================

/** Stored day values, index = JavaScript weekday (0 = Sunday). */
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAYS)[number];

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
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

/** The week as a business reads it: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DAY = 1440;

// ── Raw shapes (what the Studio stores) ─────────────────────────────────────

export interface RawHoursRow {
  _key?: string | null;
  days?: (string | null)[] | null;
  opens?: string | null;
  closes?: string | null;
  label?: string | null;
  confirmed?: boolean | null;
}

export interface RawHoursChange {
  _key?: string | null;
  date?: string | null;
  endDate?: string | null;
  kind?: string | null;
  opens?: string | null;
  closes?: string | null;
  note?: string | null;
}

// ── Resolved shapes ─────────────────────────────────────────────────────────

export interface HoursRow {
  key: string;
  /** JavaScript weekdays, 0 = Sunday. */
  days: number[];
  /** Minutes after midnight. */
  opens: number;
  /** Minutes after the opening day's midnight: over 1440 when it runs past midnight. */
  closes: number;
  label: string;
  confirmed: boolean;
}

export type HoursChangeKind = 'closed' | 'hours';

export interface HoursChange {
  key: string;
  /** First day, YYYY-MM-DD. */
  from: string;
  /** Last day, YYYY-MM-DD (the same as `from` for one day). */
  to: string;
  kind: HoursChangeKind;
  opens: number | null;
  closes: number | null;
  note: string;
}

export interface WeeklyHours {
  rows: HoursRow[];
  changes: HoursChange[];
}

export interface Interval {
  opens: number;
  closes: number;
  label: string;
  confirmed: boolean;
}

export interface DayHours {
  date: string;
  weekday: number;
  /** The spells open that day, with any change applied. Empty = closed. */
  intervals: Interval[];
  /** The usual spells for that weekday, before any change. */
  regular: Interval[];
  change: HoursChange | null;
  closed: boolean;
}

// ── Small helpers ───────────────────────────────────────────────────────────

/** A string with stega markers and zero-width characters cut off, trimmed. */
export function plain(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[​-‏﻿\u{E0000}-\u{E007F}]/gu, '').trim();
}

/** "09:30" -> 570, "24:00" -> 1440, anything else -> null. */
export function clockMinutes(value?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(plain(value));
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (mm > 59 || h > 24 || (h === 24 && mm !== 0)) return null;
  return h * 60 + mm;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 570 -> "09:30" (schema.org and the stored value). 1440 wraps to "00:00". */
export const hhmm = (minutes: number): string => {
  const m = ((minutes % DAY) + DAY) % DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** 540 -> "9 am", 1050 -> "5:30 pm", 720 -> "noon", 0 or 1440 -> "midnight". */
export function clockLabel(minutes: number): string {
  const m = ((minutes % DAY) + DAY) % DAY;
  if (m === 0) return 'midnight';
  if (m === 720) return 'noon';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${pad(mm)}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

/** "9 am to 5 pm", or "Open 24 hours". */
export function rangeLabel(opens: number, closes: number): string {
  if (closes - opens >= DAY) return 'Open 24 hours';
  return `${clockLabel(opens)} to ${clockLabel(closes)}`;
}

/** The times an editor picks from: every quarter hour of the day, stored as "HH:MM". */
export const HOURS_TIME_OPTIONS: { title: string; value: string }[] = Array.from(
  { length: 96 },
  (_, i) => ({ title: clockLabel(i * 15), value: hhmm(i * 15) }),
);

/** A real YYYY-MM-DD (also the date part of a datetime), or ''. */
export function isoDay(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(plain(value));
  if (!m) return '';
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : '';
}

/** Add whole days to a YYYY-MM-DD. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday for a YYYY-MM-DD. */
export const weekdayOf = (iso: string): number => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** "November 26" */
export const monthDay = (iso: string): string =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

/** "Thursday, November 26" */
export const longDay = (iso: string): string => `${DAY_NAMES[weekdayOf(iso)]}, ${monthDay(iso)}`;

/**
 * The site's calendar day and minutes after midnight at an instant, in an IANA
 * time zone. Daylight saving is the zone's business: 1:30 am on the night the
 * clocks go back is simply 90, whichever of the two it is.
 */
export function zonedClock(now: Date, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

// ── Resolving the stored data ───────────────────────────────────────────────

/**
 * Is a fact confirmed? By default only an explicit untick (false) marks it
 * provisional, so data saved before the flag existed keeps showing as it did.
 * `strict` (a site that starts every fact unconfirmed, like Auburn's church
 * facts) wants an explicit tick.
 */
export const isConfirmed = (flag: boolean | null | undefined, strict = false): boolean =>
  strict ? flag === true : flag !== false;

/** The usual week. Rows with no day or no usable times are dropped. */
export function resolveHoursRows(
  raw: RawHoursRow[] | null | undefined,
  opts: { strict?: boolean } = {},
): HoursRow[] {
  const out: HoursRow[] = [];
  (raw ?? []).forEach((r, i) => {
    if (!r) return;
    const days = [
      ...new Set(
        (r.days ?? [])
          .map((d) => WEEKDAYS.indexOf(plain(d).toLowerCase().slice(0, 3) as WeekdayKey))
          .filter((d) => d >= 0),
      ),
    ].sort((a, b) => a - b);
    const opens = clockMinutes(r.opens);
    let closes = clockMinutes(r.closes);
    if (!days.length || opens === null || closes === null || opens >= DAY) return;
    // At or before the opening time: it closes the next day (the same time = 24 hours).
    if (closes <= opens) closes += DAY;
    out.push({
      key: plain(r._key) || `row${i}`,
      days,
      opens,
      closes,
      label: plain(r.label),
      confirmed: isConfirmed(r.confirmed, opts.strict),
    });
  });
  return out;
}

/** The dated changes. A half-filled one (no date, or new hours with no times) is dropped. */
export function resolveHoursChanges(raw: RawHoursChange[] | null | undefined): HoursChange[] {
  const out: HoursChange[] = [];
  (raw ?? []).forEach((c, i) => {
    if (!c) return;
    const from = isoDay(c.date);
    if (!from) return;
    const end = isoDay(c.endDate);
    const to = end && end >= from ? end : from;
    const kind: HoursChangeKind = plain(c.kind) === 'hours' ? 'hours' : 'closed';
    let opens: number | null = null;
    let closes: number | null = null;
    if (kind === 'hours') {
      opens = clockMinutes(c.opens);
      closes = clockMinutes(c.closes);
      if (opens === null || closes === null || opens >= DAY) return;
      if (closes <= opens) closes += DAY;
    }
    out.push({
      key: plain(c._key) || `change${i}`,
      from,
      to,
      kind,
      opens,
      closes,
      note: plain(c.note),
    });
  });
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

export function resolveWeeklyHours(
  rows: RawHoursRow[] | null | undefined,
  changes: RawHoursChange[] | null | undefined,
  opts: { strict?: boolean } = {},
): WeeklyHours {
  return { rows: resolveHoursRows(rows, opts), changes: resolveHoursChanges(changes) };
}

/** True when the site has any usual hours at all. A site without them shows nothing new. */
export const hasHours = (h: WeeklyHours | null | undefined): boolean => Boolean(h?.rows.length);

// ── One day ─────────────────────────────────────────────────────────────────

/** The change in force on a date, if any. A closure beats new hours. */
export function changeOn(h: WeeklyHours, date: string): HoursChange | null {
  const on = h.changes.filter((c) => c.from <= date && date <= c.to);
  return on.find((c) => c.kind === 'closed') ?? on[on.length - 1] ?? null;
}

/** One date's hours: the usual spells for its weekday, with any dated change applied. */
export function dayHours(h: WeeklyHours, date: string): DayHours {
  const weekday = weekdayOf(date);
  const regular: Interval[] = h.rows
    .filter((r) => r.days.includes(weekday))
    .map((r) => ({ opens: r.opens, closes: r.closes, label: r.label, confirmed: r.confirmed }))
    .sort((a, b) => a.opens - b.opens);
  const change = changeOn(h, date);
  const intervals: Interval[] = !change
    ? regular
    : change.kind === 'closed'
      ? []
      : [{ opens: change.opens!, closes: change.closes!, label: '', confirmed: true }];
  return { date, weekday, intervals, regular, change, closed: intervals.length === 0 };
}

/** "9 am to 5 pm", "9 am to noon, 1 to 5 pm", or "Closed". */
export function dayText(intervals: Interval[]): string {
  if (!intervals.length) return 'Closed';
  return intervals
    .map((i) =>
      i.label ? `${i.label} ${rangeLabel(i.opens, i.closes)}` : rangeLabel(i.opens, i.closes),
    )
    .join(', ');
}

// ── Open now, and the next opening ──────────────────────────────────────────

export interface OpenState {
  /** Today on the site's clock. */
  date: string;
  minutes: number;
  open: boolean;
  /** Open: when it closes (minutes, may be past midnight). */
  closesAt: number | null;
  /** Closed: the next opening, within two weeks. */
  next: { date: string; opens: number } | null;
  today: DayHours;
}

/**
 * Open or closed at an instant, on the site's clock. A spell that runs past
 * midnight keeps the place open into the small hours of the next day.
 */
export function openState(h: WeeklyHours, now: Date, timeZone: string): OpenState {
  const { date, minutes } = zonedClock(now, timeZone);
  const today = dayHours(h, date);
  const yesterday = dayHours(h, addDays(date, -1));
  const carried = yesterday.intervals.find((i) => i.closes > DAY && minutes + DAY < i.closes);
  const current = today.intervals.find((i) => i.opens <= minutes && minutes < i.closes);
  if (current || carried) {
    // Whichever spell runs longest decides "until".
    let until = Math.max(current?.closes ?? 0, carried ? carried.closes - DAY : 0);
    // A spell that ends exactly when the next begins (open until midnight, then
    // from midnight) is one stretch: follow it, up to a week (open 24/7).
    for (let k = 0; k < 8; k++) {
      const dayIdx = Math.floor(until / DAY);
      const rel = until - dayIdx * DAY;
      const joined = dayHours(h, addDays(date, dayIdx)).intervals.find(
        (i) => i.opens === rel && i.closes > rel,
      );
      if (!joined) break;
      until = dayIdx * DAY + joined.closes;
    }
    return { date, minutes, open: true, closesAt: until, next: null, today };
  }
  let next: OpenState['next'] = null;
  const later = today.intervals.find((i) => i.opens > minutes);
  if (later) next = { date, opens: later.opens };
  for (let n = 1; !next && n <= 14; n++) {
    const d = addDays(date, n);
    const first = dayHours(h, d).intervals[0];
    if (first) next = { date: d, opens: first.opens };
  }
  return { date, minutes, open: false, closesAt: null, next, today };
}

/** "today", "tomorrow", "Monday" (this week) or "Thursday, November 26". */
export function whenLabel(date: string, today: string): string {
  if (date === today) return 'today';
  if (date === addDays(today, 1)) return 'tomorrow';
  for (let n = 2; n <= 6; n++) if (date === addDays(today, n)) return DAY_NAMES[weekdayOf(date)];
  return longDay(date);
}

/** The status line as two parts: { headline: "Open now", detail: "until 5 pm" }. */
export function statusParts(s: OpenState): { headline: string; detail: string } {
  if (s.open) {
    if (s.closesAt !== null && s.closesAt - s.minutes >= DAY)
      return { headline: 'Open now', detail: '' };
    return {
      headline: 'Open now',
      detail: s.closesAt === null ? '' : `until ${clockLabel(s.closesAt)}`,
    };
  }
  if (!s.next) return { headline: 'Closed now', detail: '' };
  return {
    headline: 'Closed now',
    detail: `Opens ${whenLabel(s.next.date, s.date)} at ${clockLabel(s.next.opens)}`,
  };
}

// ── The week, for the hours table ───────────────────────────────────────────

export interface WeekRow {
  /** "Monday to Friday", "Saturday and Sunday", "Wednesday". */
  label: string;
  /** "9 am to 5 pm" or "Closed". */
  text: string;
  days: number[];
  /** True when every spell in the row is confirmed. */
  confirmed: boolean;
}

function dayRangeLabel(days: number[]): string {
  if (days.length === 1) return DAY_NAMES[days[0]];
  if (days.length === 2) return `${DAY_NAMES[days[0]]} and ${DAY_NAMES[days[1]]}`;
  return `${DAY_NAMES[days[0]]} to ${DAY_NAMES[days[days.length - 1]]}`;
}

/**
 * The usual week, Monday first, with neighboring days that keep the same
 * hours run together ("Monday to Friday"). Empty when there are no hours.
 * `grouped: false` gives seven rows, one per day.
 */
export function weekRows(h: WeeklyHours, opts: { grouped?: boolean } = {}): WeekRow[] {
  if (!hasHours(h)) return [];
  const grouped = opts.grouped !== false;
  const perDay = WEEK_ORDER.map((d) => {
    const intervals = h.rows
      .filter((r) => r.days.includes(d))
      .map((r) => ({ opens: r.opens, closes: r.closes, label: r.label, confirmed: r.confirmed }))
      .sort((a, b) => a.opens - b.opens);
    return { day: d, text: dayText(intervals), confirmed: intervals.every((i) => i.confirmed) };
  });
  const rows: WeekRow[] = [];
  for (const p of perDay) {
    const last = rows[rows.length - 1];
    if (grouped && last && last.text === p.text && last.confirmed === p.confirmed) {
      last.days.push(p.day);
    } else {
      rows.push({ label: '', text: p.text, days: [p.day], confirmed: p.confirmed });
    }
  }
  for (const r of rows) r.label = dayRangeLabel(r.days);
  return rows;
}

// ── Dated changes ───────────────────────────────────────────────────────────

/** Changes whose last day is today or later, soonest first. Past ones are ignored everywhere. */
export function upcomingChanges(h: WeeklyHours, today: string): HoursChange[] {
  return h.changes.filter((c) => c.to >= today);
}

/** A change in words: { when: "Thursday, November 26", what: "Closed", note: "Thanksgiving" }. */
export function changeParts(c: HoursChange): { when: string; what: string; note: string } {
  const when = c.to === c.from ? longDay(c.from) : `${longDay(c.from)} to ${longDay(c.to)}`;
  const what = c.kind === 'closed' ? 'Closed' : rangeLabel(c.opens!, c.closes!);
  return { when, what, note: c.note };
}

/** "Thursday, November 26: Closed for Thanksgiving." style one line. */
export function changeText(c: HoursChange): string {
  const p = changeParts(c);
  return `${p.when}: ${p.what}${p.note ? ` (${p.note})` : ''}`;
}

// ── Structured data ─────────────────────────────────────────────────────────

/**
 * schema.org `openingHoursSpecification` for the LocalBusiness: one entry per
 * confirmed row, plus each change still to come as a dated special (a closure
 * is opens = closes = 00:00, as Google documents). Unconfirmed rows are never
 * published to search engines. Empty when no row is confirmed.
 */
export function openingHoursSpecification(
  h: WeeklyHours,
  today: string,
): Record<string, unknown>[] {
  const rows = h.rows.filter((r) => r.confirmed);
  if (!rows.length) return [];
  const spec: Record<string, unknown>[] = rows.map((r) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: r.days.map((d) => `https://schema.org/${DAY_NAMES[d]}`),
    opens: hhmm(r.opens),
    closes: r.closes - r.opens >= DAY ? '23:59' : hhmm(r.closes),
  }));
  for (const c of upcomingChanges(h, today)) {
    spec.push({
      '@type': 'OpeningHoursSpecification',
      opens: c.kind === 'closed' ? '00:00' : hhmm(c.opens!),
      closes: c.kind === 'closed' ? '00:00' : hhmm(c.closes!),
      validFrom: c.from,
      validThrough: c.to,
    });
  }
  return spec;
}
