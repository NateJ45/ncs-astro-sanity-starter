// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Rule 7 of the page-parity normaliser (scripts/page-parity.mjs): the build
// time stamped into an inline calendar file.
//
// The builder kit's Event details block (PORTS.md card 173) links a
// `data:text/calendar` file, and RFC 5545 requires a DTSTAMP on every event:
// the moment the file was MADE, which for a static site is the build. So two
// identical rebuilds differ in that one value and parity fails the page every
// time (PORTS.md card 210). Only the value is masked; the property itself,
// DTSTART, DTEND, the summary and everything else in the file are still
// compared, so a real change to the event still fails.
//
// Kept in its own module because importing page-parity.mjs runs its CLI.

/**
 * Replace every DTSTAMP value with a fixed token, in both spellings it can take
 * in a page: percent-encoded inside a data: URI (`DTSTAMP%3A20261031T001201Z`)
 * and plain (`DTSTAMP:20261031T001201Z`, an .ics shown as text).
 */
export function stripCalendarStamps(html) {
  return html.replace(/DTSTAMP(%3A|:)\d{8}T\d{6}Z?/gi, 'DTSTAMP$1STAMP');
}
