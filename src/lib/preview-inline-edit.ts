// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-inline-edit - the pure half of typing straight onto the page
// (PORTS.md card 185, 2026-10-26)
// =============================================================================
// In the Presentation preview's Edit mode an editor can click a heading, a
// subhead, a button label or a paragraph and type right there, the way a
// Squarespace page edits. The browser half (making the element editable,
// placing the caret, reading what was typed, sending the patch) lives in
// src/components/preview/overlay/InlineText.tsx. Everything that DECIDES
// something lives here, where node:test can reach it:
//
//   - which stega paths are candidates at all (`classifyInlinePath`),
//   - which portable-text blocks can round-trip through a contenteditable
//     without losing anything (`editableBlockRuns`),
//   - what a typed value is once the browser's own artefacts are taken out
//     (`typedPlainValue`, `stegaRanges`),
//   - the span list a typed paragraph is written back as, reusing the keys it
//     had (`blockChildrenFromRuns`),
//   - and the throttle that keeps a typing burst to fewer patches than
//     keystrokes (`createTrailingWriter`).
//
// THE SAFETY RULE, which every function here leans towards: when in doubt, the
// element is NOT editable and the editor uses the form panel, as before. An
// element the page shows differently from the stored value (a date formatted,
// a string upper-cased in code, a heading split around an accent word) must
// never become an editing surface, because what the editor typed would not be
// what got stored. That check needs the DOM and the draft together, so the
// component does it, comparing with `sameRuns` / exact strings.
// =============================================================================

import type { InlineRun } from './inline-rich.ts';
import { normalizeRuns } from './inline-rich-write.ts';
import { RUN_SOURCE } from './preview-stega.ts';
import { parseSanityPath, type PathSegment } from './sanity-path.ts';

export { INLINE_EDIT_ATTRIBUTE } from './preview-morph.ts';

/** How often, at most, a typing burst sends its newest value (ms). */
export const INLINE_WRITE_INTERVAL_MS = 250;

/**
 * Event the island dispatches on `window` when an editor stops typing into the
 * page. VisualEditingOverlay hears it and, when a soft refresh was held back
 * from the edited element meanwhile, asks for one more, so the element gets
 * the server's own render (and fresh click-to-edit markers) again.
 */
export const INLINE_EDIT_DONE_EVENT = 'preview:inline-edit-done';

/** Field types whose rendered text node can be typed into as-is. */
const PLAIN_TYPES: ReadonlySet<string> = new Set(['string', 'text']);

/** The two decorators a contenteditable paragraph round-trips. */
const ROUND_TRIP_MARKS: ReadonlySet<string> = new Set(['strong', 'em']);

/** What one clicked text node edits. */
export type InlineTarget =
  | {
      kind: 'plain';
      /** Where the string is stored. */
      path: PathSegment[];
      /** `text` fields may hold line breaks; `string` fields never do. */
      multiline: boolean;
    }
  | {
      kind: 'block';
      /** The portable-text block that holds the clicked span. */
      blockPath: PathSegment[];
      /** The clicked span's key, for reading the block back. */
      spanKey: string;
    };

/**
 * Decide from the stega path (and the schema type the overlay resolved for
 * it) whether a text node is a candidate for typing in place.
 *
 * - `...children[_key=="s"].text` inside a block is a SPAN: the whole block is
 *   the editing surface, if `editableBlockRuns` later agrees.
 * - any other path ending in a property, whose type is `string` or `text`, is
 *   a PLAIN field.
 * - everything else (numbers, urls, slugs, dates, a path this grammar cannot
 *   read) returns null and keeps the form panel.
 */
export function classifyInlinePath(
  path?: string | null,
  type?: string | null,
): InlineTarget | null {
  const segments = parseSanityPath(path);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];
  if (typeof last !== 'string') return null;

  // `<block path>.children[_key=="s"].text`
  const n = segments.length;
  if (
    n >= 4 &&
    last === 'text' &&
    segments[n - 3] === 'children' &&
    typeof segments[n - 2] === 'object' &&
    typeof segments[n - 4] === 'object'
  ) {
    return {
      kind: 'block',
      blockPath: segments.slice(0, n - 3),
      spanKey: (segments[n - 2] as { _key: string })._key,
    };
  }

  // A key-only or underscore property is bookkeeping, never prose.
  if (last.startsWith('_')) return null;
  if (!PLAIN_TYPES.has(String(type ?? ''))) return null;
  return { kind: 'plain', path: segments, multiline: type === 'text' };
}

/** A portable-text span as stored. */
export interface StoredSpan {
  _type?: string;
  _key?: string;
  text?: string;
  marks?: string[];
}

/** A portable-text block as stored. */
export interface StoredBlock {
  _type?: string;
  _key?: string;
  style?: string;
  listItem?: string;
  markDefs?: unknown[];
  children?: StoredSpan[];
}

/**
 * The runs a block reads as, or null when typing into it could lose something.
 *
 * Editable: a `block` that is not a list item, carries no mark definitions
 * (links and other annotations live there), and whose children are all spans
 * marked with nothing but `strong` and `em`. A list, a link, a footnote, an
 * inline object, a third decorator: null, and the form panel stays the way to
 * edit it, because a contenteditable round trip would drop or flatten it.
 */
export function editableBlockRuns(block: unknown): InlineRun[] | null {
  if (!block || typeof block !== 'object') return null;
  const b = block as StoredBlock;
  if (b._type !== 'block' || b.listItem) return null;
  if (Array.isArray(b.markDefs) && b.markDefs.length > 0) return null;
  if (!Array.isArray(b.children) || b.children.length === 0) return null;
  const runs: InlineRun[] = [];
  for (const child of b.children) {
    if (!child || child._type !== 'span' || typeof child.text !== 'string') return null;
    const marks = child.marks ?? [];
    if (!marks.every((mark) => ROUND_TRIP_MARKS.has(mark))) return null;
    runs.push({ text: child.text, strong: marks.includes('strong'), em: marks.includes('em') });
  }
  return runs;
}

/**
 * Two run lists say the same thing, once both are normalized. Used to prove
 * the element on the page shows exactly the stored block before it becomes
 * editable.
 */
export function sameRuns(a: InlineRun[], b: InlineRun[]): boolean {
  const left = normalizeRuns(a.map((run) => ({ ...run })));
  const right = normalizeRuns(b.map((run) => ({ ...run })));
  if (left.length !== right.length) return false;
  return left.every(
    (run, i) =>
      run.text === right[i].text && run.strong === right[i].strong && run.em === right[i].em,
  );
}

/**
 * Where the stega runs sit in a string, as [start, end) UTF-16 offsets, last
 * first, so a caller can `deleteData` them one by one without re-measuring.
 * Deleting AFTER the caret leaves the caret where it is, which is why the
 * component removes the runs this way instead of reassigning the text.
 */
export function stegaRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const all = new RegExp(RUN_SOURCE, 'gu');
  for (let match = all.exec(text); match; match = all.exec(text)) {
    out.push([match.index, match.index + match[0].length]);
  }
  return out.reverse();
}

/** Remove every stega run. */
export function withoutStega(text: string): string {
  return text.replace(new RegExp(RUN_SOURCE, 'gu'), '');
}

/**
 * What the editor typed into a plain field, as it should be stored.
 *
 * A contenteditable writes U+00A0 for a space it would otherwise collapse (a
 * trailing one, or the second of two). Those become ordinary spaces, unless
 * the stored value already used non-breaking spaces on purpose, in which case
 * the text is left as typed. A single-line field never stores a line break.
 */
export function typedPlainValue(raw: string, original: string, multiline: boolean): string {
  let value = withoutStega(raw).replace(/\r\n?/g, '\n');
  if (!original.includes(' ')) value = value.replace(/ /g, ' ');
  if (!multiline) value = value.replace(/\n+/g, ' ');
  return value;
}

/** A fresh `_key`. Injectable so tests can read the output. */
export type KeyFactory = () => string;

const randomKey: KeyFactory = () => Math.random().toString(36).slice(2, 14);

/**
 * The children a typed paragraph is written back as.
 *
 * Keys are REUSED in order: the first new span takes the first old span's
 * key, and so on, with fresh keys only for spans the edit added. Typing inside
 * one run therefore changes one span's `text` and nothing else, which is the
 * same patch the panel would have made, and the block keeps the identity the
 * Studio's form and the instant-text path match on.
 *
 * An emptied paragraph keeps one empty span, the shape the Studio itself
 * leaves, rather than a block with no children.
 */
export function blockChildrenFromRuns(
  runs: InlineRun[],
  previous: StoredSpan[] = [],
  nextKey: KeyFactory = randomKey,
): StoredSpan[] {
  const used = new Set<string>();
  const keyAt = (i: number): string => {
    const old = previous[i]?._key;
    if (typeof old === 'string' && old !== '' && !used.has(old)) {
      used.add(old);
      return old;
    }
    let key = nextKey();
    while (used.has(key)) key = nextKey();
    used.add(key);
    return key;
  };
  const kept = runs.filter((run) => run.text !== '');
  if (kept.length === 0) return [{ _type: 'span', _key: keyAt(0), text: '', marks: [] }];
  return kept.map((run, i) => ({
    _type: 'span',
    _key: keyAt(i),
    text: run.text,
    marks: [...(run.strong ? ['strong'] : []), ...(run.em ? ['em'] : [])],
  }));
}

/** A clock and timer pair, injectable for tests. */
export interface WriterClock {
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

/** The throttle a typing burst writes through. */
export interface TrailingWriter<T> {
  /** The newest value. Sent now if the window is open, else when it closes. */
  push: (value: T) => void;
  /** Send the newest value now if it has not been sent. */
  flush: () => void;
  /** Forget anything pending without sending it. */
  cancel: () => void;
}

/**
 * Leading-and-trailing throttle with "same as last sent" suppression.
 *
 * The first keystroke goes at once, so the form panel answers straight away;
 * after that at most one write per `intervalMs`, always carrying the NEWEST
 * value; `flush` sends the last one when the editor lets go. A burst of N
 * keystrokes therefore sends at most N writes and usually far fewer, and never
 * sends a value twice in a row. `initial`, when given, counts as already sent,
 * so typing a field back to what it was writes nothing.
 */
export function createTrailingWriter<T>(
  write: (value: T) => void,
  intervalMs: number = INLINE_WRITE_INTERVAL_MS,
  clock: WriterClock = {
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
  same: (a: T, b: T) => boolean = (a, b) => a === b,
  initial?: T,
): TrailingWriter<T> {
  let timer: unknown = null;
  let hasPending = false;
  let pending: T;
  let hasSent = initial !== undefined;
  let sent = initial as T;

  const send = () => {
    if (!hasPending) return;
    hasPending = false;
    if (hasSent && same(sent, pending)) return;
    hasSent = true;
    sent = pending;
    write(pending);
  };

  const open = () => {
    timer = clock.setTimer(() => {
      timer = null;
      if (hasPending) {
        send();
        open();
      }
    }, intervalMs);
  };

  return {
    push(value: T) {
      pending = value;
      hasPending = true;
      if (timer === null) {
        send();
        open();
      }
    },
    flush() {
      if (timer !== null) {
        clock.clearTimer(timer);
        timer = null;
      }
      send();
    },
    cancel() {
      if (timer !== null) {
        clock.clearTimer(timer);
        timer = null;
      }
      hasPending = false;
    },
  };
}
