// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-text-nodes — matching draft fields to the text on the page (2026-08-28)
// =============================================================================
// The instant-text path knows WHICH FIELD changed (src/lib/preview-text-diff.ts)
// and needs to find the text showing it. Every display string the preview client
// returned carries a stega payload naming its document and path
// (src/lib/preview-stega.ts), so one walk of the page's text nodes builds the
// index, and a lookup answers the question.
//
// Both functions here work on the minimal shape `{ data: string }`, which a DOM
// `Text` node satisfies. That is not an accident: it keeps the interesting logic
// out of the browser and under test, and leaves the island with nothing but a
// TreeWalker.
//
// THE MATCH IS EXACT, ON PURPOSE. `applyTextChange` writes only when the node's
// visible characters are EXACTLY the field's old value. That one condition is
// what makes this safe to point at a live page:
//
//   - a heading split around an accent word (src/lib/heading-accent.ts) has had
//     its stega stripped by `plain()` and its text cut in two, so it never
//     matches and never gets half a headline written into it;
//   - a value rendered inside a longer sentence, upper-cased, truncated, or
//     joined with a separator does not match either;
//   - a field rendered in two places (a nav label and a heading) matches in both
//     and both are updated.
//
// Everything that does not match is simply not touched, and the soft refresh
// that follows a second later renders it correctly. A missed instant update is
// invisible; a wrong one is a lie about what the page says.
//
// `applyKnownChange` widens WHICH value counts as "the old one" — a whole set of
// values the field is known to have held — without loosening the match itself,
// which stays exact. See its own note for why that is still the same promise.
// =============================================================================
import { reattachStega, sourceKey, splitStega, stegaSource } from './preview-stega.ts';

/** The only thing this module needs from a DOM text node. */
export interface TextLike {
  data: string;
}

/** How many text nodes to inspect before giving up on indexing a page. */
export const MAX_INDEXED_NODES = 4000;

/**
 * Build a map from `sourceKey(documentId, path)` to the text nodes rendering it.
 *
 * Nodes with no stega — whitespace between tags, hard-coded copy, anything a
 * component transformed — are skipped, so the map holds only the text that can
 * be matched to a field with certainty.
 */
export function indexStegaNodes<T extends TextLike>(
  nodes: Iterable<T>,
  cap: number = MAX_INDEXED_NODES,
): Map<string, T[]> {
  const index = new Map<string, T[]>();
  let seen = 0;
  for (const node of nodes) {
    if (seen >= cap) break;
    seen += 1;
    const source = stegaSource(node.data);
    if (!source) continue;
    const key = sourceKey(source.id, source.path);
    const bucket = index.get(key);
    if (bucket) bucket.push(node);
    else index.set(key, [node]);
  }
  return index;
}

/**
 * Swap a node's visible characters, keeping its stega payload.
 *
 * Returns false — and changes nothing — unless the node currently reads exactly
 * `previous`. A node that already reads `next` counts as done and also returns
 * false, so a caller re-applying a pending edit after a refresh can tell "the
 * server caught up" from "still waiting".
 */
export function applyTextChange(node: TextLike, previous: string, next: string): boolean {
  const { cleaned, encoded } = splitStega(node.data);
  if (cleaned !== previous || previous === next) return false;
  node.data = reattachStega(next, encoded);
  return true;
}

/**
 * Swap a node's visible characters when it reads exactly one of `known`.
 *
 * The generalisation of `applyTextChange` used by the pending-swap re-apply
 * after a soft refresh, where the question is not "does this node still show the
 * value the burst started from" but "is this node showing a STALE version of
 * this field" — and server HTML that started rendering mid-burst holds an
 * INTERMEDIATE value, which is stale but is not the starting one.
 *
 * The match is still exact against a value the field is KNOWN to have held (the
 * caller's job: see `PendingSwap.seen`), so nothing here can invent text. A node
 * already showing `next` is done, not stale, and returns false — that is how the
 * caller tells "the server caught up" from "still waiting".
 */
export function applyKnownChange(node: TextLike, known: readonly string[], next: string): boolean {
  const { cleaned, encoded } = splitStega(node.data);
  if (cleaned === next) return false;
  if (!known.includes(cleaned)) return false;
  node.data = reattachStega(next, encoded);
  return true;
}

/** True when a node already shows the given text. */
export function showsText(node: TextLike, text: string): boolean {
  return splitStega(node.data).cleaned === text;
}
