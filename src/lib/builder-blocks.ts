// Safe to edit by hand
// =============================================================================
// builder-blocks - the pure logic behind the builder kit's blocks (PORTS.md card 173)
// =============================================================================
// The blocks in src/sanity/schemaTypes/builderSections.ts let an editor build an
// event page, a notice, a countdown or a letter without a developer. The editor
// types INPUTS (a date, a start time picked from a list, a place); everything
// else is worked out here at build time (rule 15): whether a notice is showing
// today, how many days a countdown has left, which event dates are still to
// come, the time lines, the calendar file, the directions link and how many
// columns a row of cards takes.
//
// Pure on purpose, so `node --test` covers it (builder-blocks.test.ts). Every
// string an editor typed goes through plain() first: in the Studio preview it
// can arrive stega-encoded.
//
// Dates are calendar days (YYYY-MM-DD) in the site's own time zone
// (`site.timeZone` in src/data/site.ts), worked out by siteToday(). The site
// rebuilds on every publish and on its schedule, and the notice and countdown
// components recount in the visitor's browser, so a page cached yesterday does
// not show yesterday's state.
// =============================================================================

import { buildIcs } from './ics.ts';
import { slugify } from './slugify.ts';

// ── Text ────────────────────────────────────────────────────────────────────

/**
 * A typed string with any stega markers and stray zero-width characters cut
 * off, trimmed. Non-strings become ''. Use it on every value code compares.
 */
export function plain(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[​-‏﻿\u{E0000}-\u{E007F}]/gu, '').trim();
}

// ── Days ────────────────────────────────────────────────────────────────────

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
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A Sanity date ("2026-12-24", or a datetime) as YYYY-MM-DD, or '' when it is not one. */
export function isoDay(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(plain(value));
  if (!m) return '';
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Today's calendar day in a time zone, as YYYY-MM-DD. */
export function siteToday(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const toUtc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Whole days from one calendar day to another (negative when `b` is earlier). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

/** "Thursday" */
export const dayName = (iso: string): string => DAY_NAMES[new Date(toUtc(iso)).getUTCDay()];
/** 24 */
export const dayOfMonth = (iso: string): number => Number(iso.slice(8, 10));
/** "Dec" */
export const monthShort = (iso: string): string => MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3);
/** "December 24" */
export const dateLabel = (iso: string): string =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${dayOfMonth(iso)}`;

/** "December 24, 2026", or '' when the value is not a date. */
export function longDate(value?: string | null): string {
  const iso = isoDay(value);
  return iso ? `${dateLabel(iso)}, ${iso.slice(0, 4)}` : '';
}

// ── Notice ──────────────────────────────────────────────────────────────────

/**
 * Is a dated notice showing today? Both ends are optional and inclusive: a
 * notice from Saturday to Sunday shows on both days and is gone on Monday. A
 * blank start means "from now", a blank end "until it is removed". An end
 * before the start shows nothing (a typo should hide, not shout).
 */
export function inDateWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  today: string,
): boolean {
  const from = isoDay(start);
  const to = isoDay(end);
  if (from && to && to < from) return false;
  if (from && today < from) return false;
  if (to && today > to) return false;
  return true;
}

export interface NoticePart {
  text: string;
  /** A tel: link when this part is a phone number. */
  tel?: string;
}

/**
 * A notice's message split so a phone number in it can be a tap-to-call link.
 * Recognizes ten-digit North American numbers ("(513) 555-0100", "513.555.0100").
 */
export function noticeParts(message?: string | null): NoticePart[] {
  const text = message ?? '';
  const re = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g;
  const out: NoticePart[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ text: text.slice(at, i) });
    out.push({ text: m[0], tel: `tel:+1${m[0].replace(/\D/g, '')}` });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

// ── Countdown ───────────────────────────────────────────────────────────────

export type CountdownPhase = 'before' | 'during' | 'after' | 'none';

export interface CountdownState {
  phase: CountdownPhase;
  /** Days left, while `phase` is 'before'; otherwise 0. */
  days: number;
}

/**
 * Where a countdown stands today: days to go, happening now (first to last
 * day, both included), or over. No usable first day is 'none' (draw nothing).
 */
export function countdownState(
  start: string | null | undefined,
  end: string | null | undefined,
  today: string,
): CountdownState {
  const from = isoDay(start);
  if (!from) return { phase: 'none', days: 0 };
  let to = isoDay(end) || from;
  if (to < from) to = from;
  if (today < from) return { phase: 'before', days: daysBetween(today, from) };
  if (today <= to) return { phase: 'during', days: 0 };
  return { phase: 'after', days: 0 };
}

/** "1 day to go", "12 days to go". */
export const daysToGo = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'} to go`;

// ── Times ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes after midnight as "9:30 am", "7 pm", "12 noon". */
export function timeLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m === 720) return '12 noon';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${pad(mm)}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

/** "9:30 to 10:15 am", "7 to 8:30 pm", "11:30 am to 1 pm"; the start alone with no end. */
export function timeRange(start: number | null, duration: number | null): string {
  if (start === null) return 'All day';
  if (!duration) return timeLabel(start);
  const end = start + duration;
  if (end >= 1440) return timeLabel(start);
  const a = timeLabel(start);
  const b = timeLabel(end);
  const sameHalf = start < 720 === end < 720 && start !== 720 && end !== 720;
  return sameHalf ? `${a.replace(/ [ap]m$/, '')} to ${b}` : `${a} to ${b}`;
}

/** The times an editor picks from: every quarter hour from 6 am to 11:45 pm, stored as "HH:MM". */
export const TIME_OPTIONS: { title: string; value: string }[] = (() => {
  const out: { title: string; value: string }[] = [];
  for (let m = 6 * 60; m < 24 * 60; m += 15) {
    out.push({ title: timeLabel(m), value: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` });
  }
  return out;
})();

/** "16:30" as minutes after midnight, or null when it is not a time. */
export function minutesOf(value?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(plain(value));
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** "4:30 pm", or '' with no time. */
export function timeOf(value?: string | null): string {
  const m = minutesOf(value);
  return m === null ? '' : timeLabel(m);
}

// ── Event details ───────────────────────────────────────────────────────────

export interface RawOccurrence {
  _key?: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  label?: string | null;
}

export interface Occurrence {
  key: string;
  date: string;
  /** Minutes after midnight, or null for an all-day date. */
  start: number | null;
  /** Length in minutes, or null when no (later) end time was given. */
  duration: number | null;
  label: string;
  /** "Thursday, December 24" */
  day: string;
  /** "5:30 to 6:30 pm", "7 pm" or "All day" */
  time: string;
}

/**
 * The dates still to come (today counts), soonest first. A date with no usable
 * day is dropped, an end time at or before the start is ignored (the start
 * alone shows), and a date that has passed drops off. When every date has
 * passed the list is empty and the block draws nothing, like a notice after its
 * last day.
 */
export function upcomingOccurrences(
  raw: RawOccurrence[] | null | undefined,
  today: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  (raw ?? []).forEach((o, i) => {
    const date = isoDay(o?.date);
    if (!date || date < today) return;
    const start = minutesOf(o.startTime);
    const end = minutesOf(o.endTime);
    const duration = start !== null && end !== null && end > start ? end - start : null;
    out.push({
      key: plain(o._key) || `o${i}`,
      date,
      start,
      duration,
      label: plain(o.label),
      day: `${dayName(date)}, ${dateLabel(date)}`,
      time: timeRange(start, duration),
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1));
}

export interface EventPlace {
  /** The lines to show. */
  lines: string[];
  /** One line, for the calendar file and the structured data. */
  oneLine: string;
  /** The directions link. */
  mapsUrl: string;
}

/**
 * Where the event is, from the typed place ("The community hall, 123 Main St").
 * One line per line typed; null when nothing usable was typed. The directions
 * link is a Google Maps search for the whole place.
 */
export function eventPlace(typed: string | null | undefined): EventPlace | null {
  const lines = plain(typed)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const oneLine = lines.join(', ');
  return {
    lines,
    oneLine,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(oneLine)}`,
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'event';

/** The calendar file's name: "open-house.ics". */
export function icsFileName(title: string): string {
  return `${slug(plain(title))}.ics`;
}

const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * The calendar file for every date still to come, or '' when there are none. A
 * timed date is a wall time in the site's zone (so 5:30 pm stays 5:30 pm
 * whatever the visitor's clock), one hour long when no end time is given; a
 * date with no time is an all-day event.
 */
export function eventIcs(opts: {
  title: string;
  occurrences: Occurrence[];
  place: EventPlace | null;
  note?: string | null;
  url?: string;
  /** Stable part of each UID: the block's key. */
  uidBase: string;
  host: string;
  timeZone: string;
  now: Date;
}): string {
  if (!opts.occurrences.length) return '';
  const title = plain(opts.title) || 'Event';
  const note = plain(opts.note);
  return buildIcs({
    prodId: `-//${opts.host}//events//EN`,
    now: opts.now,
    events: opts.occurrences.map((o) => ({
      uid: `${slug(opts.uidBase)}-${o.key}-${o.date}@${opts.host}`,
      start:
        o.start === null
          ? { date: o.date }
          : { date: o.date, time: hhmm(o.start), tzid: opts.timeZone },
      ...(o.start === null ? {} : { duration: `PT${o.duration ?? 60}M` }),
      summary: o.label ? `${title}: ${o.label}` : title,
      ...(note ? { description: note } : {}),
      ...(opts.place?.oneLine ? { location: opts.place.oneLine } : {}),
      ...(opts.url ? { url: opts.url } : {}),
    })),
  });
}

/** The calendar file as a link the browser saves (no route to build: the file is the link). */
export function icsHref(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/**
 * The offset of a time zone from UTC on one day, as "-05:00". Works out the
 * daylight-saving change for that date, so a summer event says -04:00 in New
 * York and a winter one -05:00.
 */
export function zoneOffset(iso: string, minutes: number, timeZone: string): string {
  // The wall time read as if it were UTC, then shown in the zone: the gap
  // between the two is the zone's offset at (very nearly) that moment.
  const wall = toUtc(iso) + minutes * 60_000;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(wall));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const off = Math.round((shown - wall) / 60_000);
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * schema.org Event objects for search, one per date still to come, as a JSON-LD
 * string ('' with none). `location` is the typed place; an event with no place
 * is left without one (search engines accept it, and nothing is invented).
 */
export function eventJsonLd(opts: {
  title: string;
  occurrences: Occurrence[];
  place: EventPlace | null;
  note?: string | null;
  url: string;
  timeZone: string;
  organizer: { name: string; url: string };
}): string {
  if (!opts.occurrences.length) return '';
  const title = plain(opts.title) || 'Event';
  const note = plain(opts.note);
  const events = opts.occurrences.map((o) => {
    const at = (m: number) => `${o.date}T${hhmm(m)}:00${zoneOffset(o.date, m, opts.timeZone)}`;
    const end = o.start !== null && o.duration ? o.start + o.duration : null;
    return {
      '@type': 'Event',
      name: o.label ? `${title}: ${o.label}` : title,
      startDate: o.start === null ? o.date : at(o.start),
      ...(end !== null && end < 1440 ? { endDate: at(end) } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      ...(opts.place
        ? { location: { '@type': 'Place', name: opts.place.lines[0], address: opts.place.oneLine } }
        : {}),
      ...(note ? { description: note } : {}),
      url: opts.url,
      organizer: { '@type': 'Organization', name: opts.organizer.name, url: opts.organizer.url },
    };
  });
  // `<` escaped so a typed "</script>" cannot end the script element.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': events }).replace(
    /</g,
    '\\u003c',
  );
}

// ── Cards with photos ───────────────────────────────────────────────────────

/**
 * How many across on a wide screen, from how many cards there are: two side by
 * side, three in a row, four as two pairs, five and six as rows of three. A
 * phone always shows one.
 */
export function photoCardColumns(count: number): 2 | 3 {
  return count === 2 || count === 4 ? 2 : 3;
}

// ── Contact card (PORTS.md card 193) ────────────────────────────────────────

/** A typed phone number as a tel: link: digits and a leading +, nothing else. '' when it has none. */
export function telHref(value?: string | null): string {
  const kept = plain(value).replace(/(?!^\+)\D/g, '');
  return kept.replace(/\D/g, '').length >= 7 ? `tel:${kept}` : '';
}

// ── Progress toward a goal ──────────────────────────────────────────────────

const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** 12500 -> "$12,500" (dollars) or "12,500" (a plain count). Whole numbers only. */
export function figure(value: number, unit: string | null | undefined = 'dollars'): string {
  const n = WHOLE.format(Math.round(value));
  return plain(unit) === 'number' ? n : `$${n}`;
}

export interface ProgressState {
  /** False without a positive goal: the block then draws nothing. */
  valid: boolean;
  /** 0 to 100, whole: the bar's width and aria-valuenow. */
  percent: number;
  raised: string;
  goal: string;
  /** "$7,500 to go", or "Goal reached" at or past the goal. */
  remaining: string;
}

/** The two typed numbers as the bar and its words (rule 15: percent and "to go" are derived). */
export function progressState(
  goal: number | null | undefined,
  raised: number | null | undefined,
  unit: string | null | undefined = 'dollars',
): ProgressState {
  const g = typeof goal === 'number' && Number.isFinite(goal) ? goal : 0;
  const r = typeof raised === 'number' && Number.isFinite(raised) ? Math.max(0, raised) : 0;
  if (g <= 0) return { valid: false, percent: 0, raised: figure(r, unit), goal: '', remaining: '' };
  return {
    valid: true,
    percent: Math.max(0, Math.min(100, Math.floor((r / g) * 100))),
    raised: figure(r, unit),
    goal: figure(g, unit),
    remaining: r >= g ? 'Goal reached' : `${figure(g - r, unit)} to go`,
  };
}

/** "As of October 18, 2026" for a date, or '' when there is none. */
export function asOfLabel(value?: string | null): string {
  const label = longDate(value);
  return label ? `As of ${label}` : '';
}

// ── Calendar subscribe ──────────────────────────────────────────────────────

export interface SubscribeLinks {
  /** webcal:// for Apple Calendar and desktop Outlook. */
  apple: string;
  /** Google Calendar's "add by URL". */
  google: string;
  /** Outlook on the web's "subscribe from web". */
  outlook: string;
}

/**
 * The address of a calendar feed as a full https address: a typed https:// or
 * webcal:// address, or a path on this site ("/calendar/events.ics", the files
 * card 158 writes) joined to the site's own address. '' for anything else.
 */
export function feedAddress(value?: string | null, siteUrl?: string | null): string {
  const raw = plain(value);
  if (/^(https|webcal):\/\//i.test(raw)) return raw.replace(/^webcal:/i, 'https:');
  if (raw.startsWith('/') && !raw.startsWith('//') && /^https:\/\//i.test(plain(siteUrl))) {
    return `${plain(siteUrl).replace(/\/+$/, '')}${raw}`;
  }
  return '';
}

/**
 * Subscribe links for a calendar feed. A subscription keeps itself up to date on
 * the visitor's phone; a download would not. null when there is no usable feed.
 */
export function subscribeLinks(
  value?: string | null,
  name = 'Calendar',
  siteUrl?: string | null,
): SubscribeLinks | null {
  const https = feedAddress(value, siteUrl);
  if (!https) return null;
  const webcal = https.replace(/^https:/i, 'webcal:');
  return {
    apple: webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent(name)}`,
  };
}

// ── Hub (groups of cards with a sticky index) ───────────────────────────────

/**
 * One anchor id per group, from its name ("Kids and youth" -> "kids-and-youth"),
 * a repeated name taking a number, so an index link and a deep link
 * ("/services/#kids-and-youth") always land on the right group. `prefix` keeps
 * two hubs on one page apart.
 */
export function hubIds(titles: (string | null | undefined)[], prefix = 'hub'): string[] {
  const seen = new Map<string, number>();
  return titles.map((t) => {
    const base = slugify(plain(t)) || 'group';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${prefix}-${n === 1 ? base : `${base}-${n}`}`;
  });
}
