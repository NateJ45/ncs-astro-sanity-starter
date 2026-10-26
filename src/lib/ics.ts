// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Calendar files (.ics) for "Add to calendar" links (PORTS.md cards 158, 173)
// =============================================================================
// Builds an iCalendar (RFC 5545) file as a string: one VCALENDAR holding one or
// more VEVENTs. Pure: no fetch and no clock (the caller passes `now` for the
// DTSTAMP), so it is unit-tested (ics.test.ts) and runs at build time or in the
// Worker alike.
//
// What it takes care of, so a route does not have to:
//   - text escaping: backslash, semicolon, comma and line breaks
//   - line folding at 75 octets (UTF-8 bytes, never splitting a character),
//     continuation lines starting with one space
//   - CRLF line endings, including after the last line
//   - times three ways: a UTC instant (a Date, written with "Z"), a local wall
//     time in a named zone (TZID, so a weekly 10:00 stays 10:00 through the
//     clock changes), or an all-day date
//   - the VTIMEZONE block for the US zones in US_TIMEZONES, added once per zone
//     used. Another zone still gets its TZID; most calendar apps know the IANA
//     names, but strictly RFC 5545 wants a VTIMEZONE, so add its rules to
//     US_TIMEZONES' pattern if a site needs one.
//   - repeat rules (RRULE) from a small typed object, or a raw string
//   - exceptions to a repeat (card 173): `exdate` drops occurrences (EXDATE),
//     and an event with `recurrenceId` replaces ONE occurrence of the event
//     with the same `uid` (a new time, place or title for that date only)
//
// HOW A SITE WIRES A ROUTE TO IT (the starter ships no route; it has no
// calendar of its own). A static endpoint per event, for example
// src/pages/calendar/[key].ics.ts:
//
//   import type { APIRoute, GetStaticPaths } from 'astro';
//   import { buildIcs } from '@/lib/ics';
//   export const getStaticPaths: GetStaticPaths = async () =>
//     (await getEvents()).map((e) => ({ params: { key: e.key }, props: { e } }));
//   export const GET: APIRoute = ({ props }) =>
//     new Response(
//       buildIcs({
//         prodId: '-//my-site//events//EN',
//         now: new Date(),
//         events: [{
//           uid: `${props.e.key}@example.com`,
//           start: { date: '2026-11-01', time: '10:00', tzid: 'America/New_York' },
//           duration: 'PT1H',
//           rrule: { freq: 'WEEKLY', byDay: ['SU'] },
//           summary: props.e.title,
//           location: props.e.address,
//           url: 'https://example.com/events/',
//         }],
//       }),
//       { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } },
//     );
//
// SKIPPING OR MOVING ONE DATE of a weekly event (card 173). Both are the same
// series to a calendar app, so the event stays one entry it can update:
//
//   const weekly = {
//     uid: 'weekly-worship@example.com',
//     start: { date: '2026-11-01', time: '10:00', tzid: 'America/New_York' },
//     duration: 'PT1H',
//     rrule: { freq: 'WEEKLY', byDay: ['SU'] },
//     summary: 'Worship',
//     // Not meeting on 15 November: the date AND time the series would have had.
//     exdate: [{ date: '2026-11-15', time: '10:00', tzid: 'America/New_York' }],
//   };
//   const moved = {
//     uid: weekly.uid, // the same series
//     // Which occurrence: its ORIGINAL date and time, not the new one.
//     recurrenceId: { date: '2026-11-22', time: '10:00', tzid: 'America/New_York' },
//     start: { date: '2026-11-22', time: '11:00', tzid: 'America/New_York' },
//     duration: 'PT1H',
//     summary: 'Worship (one service at 11)',
//   };
//   buildIcs({ prodId, now, events: [weekly, moved] });
//
// RFC 5545 rules buildIcs enforces (it throws, so a bad file never ships):
// an exdate or recurrenceId must be written the same way as the event's start
// (all three UTC, all three in one zone, or all three all-day), an exdate
// needs an rrule, and an event with a recurrenceId is one occurrence, so it
// takes no rrule or exdate of its own. Overrides of a date before the series'
// first DTSTART are allowed by the RFC but ignored by most apps; leave them out.
//
// The link to it is a plain <a href="/calendar/<key>.ics">; the file name ends
// in .ics, so it is a file, not a page, and takes no trailing slash (rule 19).
// Never put a time the site has not confirmed into someone's calendar.
// =============================================================================

export type IcsWeekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

/** A wall time in a zone, or an all-day date when `time` is left out. */
export interface IcsLocalTime {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24-hour). Left out for an all-day event. */
  time?: string;
  /** IANA zone, e.g. 'America/New_York'. Left out for a floating time (avoid). */
  tzid?: string;
}

/** A UTC instant (a Date) or a local wall time. */
export type IcsTime = Date | IcsLocalTime;

export interface IcsRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byDay?: IcsWeekday[];
  count?: number;
  /** The last occurrence, as a UTC instant. */
  until?: Date;
}

export interface IcsEvent {
  /** Globally unique and stable across rebuilds, e.g. 'weekly-worship@example.com'. */
  uid: string;
  start: IcsTime;
  /** Give `end` or `duration` (ISO 8601, e.g. 'PT1H'); neither means a point in time. */
  end?: IcsTime;
  duration?: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  rrule?: IcsRule | string;
  /**
   * Occurrences of the rrule that do not happen (EXDATE, RFC 5545 3.8.5.1). Each is the
   * date-time the series WOULD have had, written the same way as `start`.
   */
  exdate?: IcsTime[];
  /**
   * Makes this event replace one occurrence of the series with the same `uid`
   * (RECURRENCE-ID, RFC 5545 3.8.4.4): the ORIGINAL date-time of that occurrence,
   * written the same way as the series' `start`. `start` is then its new time.
   */
  recurrenceId?: IcsTime;
}

export interface IcsCalendar {
  /** e.g. '-//my-site//events//EN' */
  prodId: string;
  /** Written as each event's DTSTAMP. */
  now: Date;
  events: IcsEvent[];
  /** The calendar's name, shown by some apps when subscribing. */
  name?: string;
}

/** Escape a TEXT value (RFC 5545 3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const encoder = new TextEncoder();
const octets = (s: string) => encoder.encode(s).length;

/**
 * Fold one content line to 75 octets a line (RFC 5545 3.1). Continuation lines
 * start with a single space, which counts toward their 75. Never splits a
 * character, so a multi-byte letter or emoji stays whole.
 */
export function foldLine(line: string): string {
  if (octets(line) <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = octets(ch);
    if (size + n > 75) {
      parts.push(current);
      current = ' ';
      size = 1;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A Date as an iCalendar UTC date-time: 20261101T150000Z. */
export function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/** A time as a property: 'DTSTART;TZID=America/New_York:20261101T100000' and its kin. */
export function timeProperty(name: string, t: IcsTime): string {
  if (t instanceof Date) return `${name}:${utcStamp(t)}`;
  const date = DATE_RE.exec(t.date);
  if (!date) throw new Error(`ics: date must be YYYY-MM-DD, got "${t.date}"`);
  const ymd = `${date[1]}${date[2]}${date[3]}`;
  if (t.time === undefined) return `${name};VALUE=DATE:${ymd}`;
  const time = TIME_RE.exec(t.time);
  if (!time) throw new Error(`ics: time must be HH:MM, got "${t.time}"`);
  const local = `${ymd}T${time[1]}${time[2]}00`;
  return t.tzid ? `${name};TZID=${t.tzid}:${local}` : `${name}:${local}`;
}

/** A repeat rule as its value: 'FREQ=WEEKLY;BYDAY=SU'. */
export function ruleValue(rule: IcsRule | string): string {
  if (typeof rule === 'string') return rule.replace(/^RRULE:/i, '');
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval && rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.byDay?.length) parts.push(`BYDAY=${rule.byDay.join(',')}`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  if (rule.until) parts.push(`UNTIL=${utcStamp(rule.until)}`);
  return parts.join(';');
}

// US daylight saving rules since 2007: second Sunday of March to first Sunday of November.
function usZone(tzid: string, std: number, stdName: string, dstName: string): string[] {
  const off = (h: number) => `${h < 0 ? '-' : '+'}${pad(Math.abs(h))}00`;
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tzid}`,
    'BEGIN:DAYLIGHT',
    `TZOFFSETFROM:${off(std)}`,
    `TZOFFSETTO:${off(std + 1)}`,
    `TZNAME:${dstName}`,
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    `TZOFFSETFROM:${off(std + 1)}`,
    `TZOFFSETTO:${off(std)}`,
    `TZNAME:${stdName}`,
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
}

/** VTIMEZONE lines for the zones the family's sites use. */
export const US_TIMEZONES: Readonly<Record<string, readonly string[]>> = {
  'America/New_York': usZone('America/New_York', -5, 'EST', 'EDT'),
  'America/Chicago': usZone('America/Chicago', -6, 'CST', 'CDT'),
  'America/Denver': usZone('America/Denver', -7, 'MST', 'MDT'),
  'America/Los_Angeles': usZone('America/Los_Angeles', -8, 'PST', 'PDT'),
};

const zoneOf = (t: IcsTime | undefined) => (t && !(t instanceof Date) ? t.tzid : undefined);

/** How a time is written: UTC, all-day, or a wall time in a zone (or floating). */
const formOf = (t: IcsTime): string =>
  t instanceof Date ? 'UTC' : t.time === undefined ? 'all-day' : `local ${t.tzid ?? 'floating'}`;

/**
 * RFC 5545 3.8.4.4 and 3.8.5.1: RECURRENCE-ID and EXDATE take the same value type (and
 * zone) as DTSTART, EXDATE belongs to a repeating event, and an override is one occurrence.
 */
function checkExceptions(e: IcsEvent): void {
  const start = formOf(e.start);
  for (const t of [...(e.exdate ?? []), ...(e.recurrenceId ? [e.recurrenceId] : [])]) {
    if (formOf(t) !== start) {
      throw new Error(`ics: ${e.uid}: exdate/recurrenceId is ${formOf(t)} but start is ${start}`);
    }
  }
  if (e.exdate?.length && !e.rrule) throw new Error(`ics: ${e.uid}: exdate needs an rrule`);
  if (e.recurrenceId && (e.rrule || e.exdate?.length)) {
    throw new Error(`ics: ${e.uid}: an event with recurrenceId takes no rrule or exdate`);
  }
}

/** The whole calendar file, CRLF line endings, folded, ending in CRLF. */
export function buildIcs(cal: IcsCalendar): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${cal.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (cal.name) lines.push(`X-WR-CALNAME:${escapeText(cal.name)}`);

  const zones = new Set<string>();
  for (const e of cal.events) {
    checkExceptions(e);
    for (const z of [zoneOf(e.start), zoneOf(e.end)]) if (z) zones.add(z);
  }
  for (const z of zones) {
    const block = US_TIMEZONES[z];
    if (block) lines.push(...block);
  }

  const stamp = utcStamp(cal.now);
  for (const e of cal.events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`);
    if (e.recurrenceId) lines.push(timeProperty('RECURRENCE-ID', e.recurrenceId));
    lines.push(timeProperty('DTSTART', e.start));
    if (e.end) lines.push(timeProperty('DTEND', e.end));
    else if (e.duration) lines.push(`DURATION:${e.duration}`);
    if (e.rrule) lines.push(`RRULE:${ruleValue(e.rrule)}`);
    // One EXDATE line per date: valid, and the form every calendar app reads.
    for (const t of e.exdate ?? []) lines.push(timeProperty('EXDATE', t));
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
