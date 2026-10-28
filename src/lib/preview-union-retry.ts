// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-union-retry - the pure half of the "ask the Studio again" nudge
// (2026-10-27)
// =============================================================================
// THE BUG THIS EXISTS FOR. @sanity/visual-editing (6.1.3) can only resolve a
// path INTO a page-builder item (`additionalSections[_key=="x"].width`) once the
// Studio has told it which block type `x` is. It asks the Studio once per new
// keyed path ("visual-editing/schema-union-types"), the Studio answers with a
// GROQ read of the draft, and the frame CACHES THE QUESTION: the same path is
// never asked about again.
//
// A section the editor has just added appears in the frame BEFORE that read can
// see it, because the frame renders the Studio's local copy of the draft the
// moment it is posted (card 184), ahead of the commit. So the one answer is
// "no type", every path inside the new section resolves to no field, and
// anything that needs a field never mounts: the layout card (card 28), instant
// typing on its text (card 185). The handle still outlines and still selects
// the field in the form, which is exactly the "draws and selects Width, card
// never opens" report. A full reload of the frame asks afresh and it works.
//
// THE NUDGE. The library re-asks about EVERY keyed path whenever ONE path it
// has not reported yet appears. So when a new keyed `data-sanity` target turns
// up in the page, the overlay adds a hidden element with a throwaway keyed path
// on the same document a moment later (when the commit is readable), which
// makes the library ask again for all of them; the throwaway path resolves to
// nothing and is dropped. One small read in the Studio per nudge.
//
// This file is the string handling, so it can be unit-tested without a DOM.
// The DOM half is src/components/preview/overlay/useUnionTypeRetry.ts.
// =============================================================================

/** The throwaway key. Never a real `_key` (Sanity keys are 12 random chars). */
export const RETRY_KEY_PREFIX = 'ncs-retype-';

/** Split a `data-sanity` value (`id=..;type=..;path=..;base=..`) into its parts. */
export function parseEditAttr(attr: string): Map<string, string> {
  const parts = new Map<string, string>();
  for (const piece of attr.split(';')) {
    const at = piece.indexOf('=');
    if (at > 0) parts.set(piece.slice(0, at), piece.slice(at + 1));
  }
  return parts;
}

/**
 * Is this a target INSIDE an array item? The encoded path writes
 * `field[_key=="x"]` as `field:x`, so a colon is the tell.
 */
export function isKeyedEditAttr(attr: string): boolean {
  const parts = parseEditAttr(attr);
  return Boolean(parts.get('id')) && (parts.get('path') ?? '').includes(':');
}

/** The keyed targets in `attrs` that `seen` has not had yet (deduplicated). */
export function newKeyedAttrs(seen: ReadonlySet<string>, attrs: Iterable<string>): string[] {
  const fresh = new Set<string>();
  for (const attr of attrs) if (!seen.has(attr) && isKeyedEditAttr(attr)) fresh.add(attr);
  return [...fresh];
}

/**
 * A throwaway target on the same document as `attr`: the same array field, a
 * key no item has. Returns null when `attr` is not a keyed target.
 */
export function retryAttrFor(attr: string, n: number): string | null {
  if (!isKeyedEditAttr(attr)) return null;
  const parts = parseEditAttr(attr);
  const field = (parts.get('path') ?? '').split(':')[0].split('.')[0];
  if (!field) return null;
  parts.set('path', `${field}:${RETRY_KEY_PREFIX}${n}`);
  return [...parts].map(([k, v]) => `${k}=${v}`).join(';');
}
