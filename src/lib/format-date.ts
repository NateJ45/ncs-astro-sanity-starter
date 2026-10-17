// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Build-time date labels that do not depend on the build machine's timezone.
//
// `toLocaleDateString` with no `timeZone` formats in the zone of whatever
// machine runs the build. CI runs in UTC, so the live site looked right, but a
// local build or `npm run deploy` on a US machine rendered a Sanity `date`
// such as "2026-01-15" as "January 14, 2026": the string parses as UTC
// midnight, which is the evening before in any zone west of Greenwich.
//
// The rule (PORTS.md card 98):
// - A date-only value (YYYY-MM-DD, Sanity's `date` type) is a calendar day,
//   not an instant. It always keeps its day, whatever `timeZone` says.
// - A full datetime (Sanity's `datetime` type, stored as UTC) is formatted in
//   `timeZone`, which defaults to UTC. The starter has no site timezone
//   setting; a site that wants local days for late-evening posts passes its
//   IANA zone (for example 'America/New_York') from one place.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "January 15, 2026" */
export const LONG_DATE: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};
/** "Jan 15, 2026" */
export const SHORT_DATE: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
/** "January 2026" */
export const LONG_MONTH_YEAR: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
/** "Jan 2026" */
export const SHORT_MONTH_YEAR: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

/**
 * Format a Sanity `date` or `datetime` string for display. Returns '' for a
 * missing or unparseable value, so callers can render it conditionally.
 */
export function formatDate(
  value: string | null | undefined,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = LONG_DATE,
  timeZone = 'UTC',
  locale = 'en-US',
): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // A bare YYYY-MM-DD parses as UTC midnight, so UTC is the zone that keeps its day.
  const zone = DATE_ONLY.test(value) ? 'UTC' : timeZone;
  return date.toLocaleDateString(locale, { ...options, timeZone: zone });
}
