// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Accent words in headings (2026-08-28)
// =============================================================================
// The site already had one designed way to emphasise part of a display heading:
// scriptAccent (src/lib/scriptAccent.ts), which sets one word of a headline in
// the script face. This is its colour sibling. An editor types a word or phrase
// that appears in the heading, and the renderer wraps the first match in the
// section's accent colour (.heading-accent in globals.css, which reads the
// --section-accent the surface/accent choice already sets).
//
// THE STEGA TRAP
// In the Presentation preview every display string arrives stega-encoded: a run
// of invisible Unicode tag characters is hidden inside it so click-to-edit knows
// which field the text came from. A plain indexOf against the accent word then
// fails, because the heading is not the string it looks like. So both sides are
// cleaned with plain() before matching (`headingAccent` itself is also excluded
// from stega in cms-preview.ts, belt and braces).
//
// ACCEPTED COST, stated plainly: when a match IS found the CLEANED heading is
// what gets rendered, because the markers cannot be re-inserted around a split
// that did not exist when they were placed. So in the preview, and only in the
// preview, and only on a heading that has an accent word set, click-to-edit on
// that one heading stops working. Every other field on the section, including
// the accent word field itself, still works. On the live site strings are never
// stega-encoded, so nothing is lost there at all.
//
// Matching is CASE-INSENSITIVE (an editor typing "grace" should not have to
// match "Grace") and returns the heading's own casing for the matched slice.
// =============================================================================

// Explicit .ts extension: this module is reached by `node --test` (see
// heading-accent.test.ts), which resolves ESM specifiers literally.
import { plain } from './nav-href.ts';

export interface HeadingAccentResult {
  /** True when the accent word was found and the caller should split. */
  found: boolean;
  before: string;
  word: string;
  after: string;
  /** The heading to render when `found` is false: the original, untouched. */
  heading: string;
}

export function splitHeadingAccent(
  heading?: string | null,
  accent?: string | null,
): HeadingAccentResult {
  const original = typeof heading === 'string' ? heading : '';
  const miss: HeadingAccentResult = {
    found: false,
    before: '',
    word: '',
    after: '',
    heading: original,
  };

  const needle = plain(accent);
  if (!needle) return miss;

  // The cleaned heading is what we match against AND what we render on a hit,
  // for the reason in the header comment.
  const clean = plain(original);
  if (!clean) return miss;

  const idx = clean.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return miss;

  return {
    found: true,
    before: clean.slice(0, idx),
    word: clean.slice(idx, idx + needle.length),
    after: clean.slice(idx + needle.length),
    heading: original,
  };
}
