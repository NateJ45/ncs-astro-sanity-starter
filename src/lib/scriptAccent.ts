// Safe to edit by hand
// Shared utility for splitting a headline around a script-font accent word.
// Used by Hero.astro and SectionHeading.astro so both surfaces apply exactly
// the same logic: trim-safe, case-sensitive, first-occurrence only.
//
// Usage:
//   const { found, before, word, after } = splitScriptAccent(headline, scriptAccent);
//   if (found) render: {before}<span class="font-script">{word}</span>{after}
//   else render: {headline} (plain, no span)

export interface ScriptAccentResult {
  found: boolean;
  before: string;
  word: string;
  after: string;
}

/**
 * Splits `headline` around the first occurrence of `accent`.
 *
 * - Returns `{ found: false, ... }` when `accent` is empty/undefined or is
 *   not present in `headline` (case-sensitive, exact match). The consumer
 *   should render the plain `headline` when `found` is false.
 * - Returns `{ found: true, before, word, after }` when the accent is found.
 *   `word` is the exact slice from `headline` (same chars as `accent`).
 *   `before` + `word` + `after` === `headline`.
 */
export function splitScriptAccent(
  headline: string,
  accent?: string,
): ScriptAccentResult {
  const EMPTY: ScriptAccentResult = { found: false, before: '', word: '', after: '' };

  if (!accent || accent.length === 0) return EMPTY;

  const idx = headline.indexOf(accent);
  if (idx < 0) return EMPTY;

  return {
    found: true,
    before: headline.slice(0, idx),
    word: headline.slice(idx, idx + accent.length),
    after: headline.slice(idx + accent.length),
  };
}
