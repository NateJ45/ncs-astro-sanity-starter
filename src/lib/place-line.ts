// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand
// The one place line (PORTS.md card 196, from first-baptist-auburn's design audit):
// "where is it?" answered the same way everywhere, from the stored address, with
// no ZIP: "Hamilton, OH". A hero, a header lockup or a footer reads it from here
// instead of typing the town again, so a move is one edit in Business info.

/** Placeholder values the starter ships with; they never reach a visitor. */
const PLACEHOLDERS = new Set(['your city', 'xx', 'your state']);

const clean = (v: string | null | undefined): string => {
  const t = (v ?? '').replace(/[​-‏﻿\u{E0000}-\u{E007F}]/gu, '').trim();
  return PLACEHOLDERS.has(t.toLowerCase()) ? '' : t;
};

/** "Hamilton, OH 45013" -> "Hamilton, OH" (a ZIP or ZIP+4 at the end is dropped). */
export function townOf(cityLine: string | null | undefined): string {
  return clean(cityLine)
    .replace(/\s+\d{5}(?:-\d{4})?\s*$/, '')
    .trim();
}

/** The place line from the address parts: "Hamilton, OH", "Hamilton", or ''. */
export function placeLine(parts: { city?: string | null; state?: string | null }): string {
  const city = townOf(parts.city);
  const state = clean(parts.state);
  return [city, state].filter(Boolean).join(', ');
}
