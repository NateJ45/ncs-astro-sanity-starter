// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-text-diff — which plain strings changed between two draft snapshots
// (2026-08-28)
// =============================================================================
// The instant-text path watches the optimistic document actor and gets handed a
// whole document every time anything in it changes. To turn that into "swap
// these words in the page" it needs the narrow question answered: which PLAIN
// STRING FIELDS are different, and what is their studio path.
//
// DELIBERATELY NARROW, in three ways, because everything this returns is written
// straight into the live DOM:
//
//  1. STRING LEAVES ONLY. Objects and arrays are walked, never reported. A
//     changed number, boolean, image or reference is not text on the page and is
//     left to the soft refresh, which re-renders the page properly.
//  2. BOTH SIDES MUST BE STRINGS. A field that appears (undefined -> "Hello")
//     was not rendered before, so there is no text node to swap; a field that
//     disappears cannot be un-rendered by editing characters. Both are the soft
//     refresh's job.
//  3. PORTABLE TEXT ONLY WHEN THE BLOCK KEPT ITS SHAPE. A block's marks, splits
//     and merges move text between spans as you type, so patching one span's
//     characters after a bold or a link was added can show a sentence that never
//     existed. But plain typing inside a paragraph changes NOTHING except span
//     text, and each span renders as its own stega-tagged text node. So a block
//     is diffed when, apart from its spans' `text`, it is identical to its old
//     self: same style, list, markDefs, and the same spans (keys, order, marks).
//     Then every span change is reported at its full path
//     (`body[_key=="b"].children[_key=="s"].text`) and the page reads exactly as
//     the new block would render. Any other difference skips the block, and so
//     does any non-block item (an image in the body): the soft refresh's job.
//     (2026-10-26, PORTS.md card 182: before this, every keystroke in a rich
//     text box waited the full 3 to 5 second refresh.)
//
// Paths come out as STUDIO PATH STRINGS (`flexibleSections[_key=="a1"].heading`)
// because that is the form the stega payload carries, so the caller can compare
// them without parsing either side.
//
// The caps below exist because this runs on every keystroke burst in a preview
// tab: a pathological document must cost a bounded walk, not a frozen frame.
// =============================================================================

/** One plain string field that differs between two snapshots. */
export interface StringChange {
  /** Studio path string of the field. */
  path: string;
  /** The value in the OLD snapshot — the caller matches it against the DOM. */
  previous: string;
  /** The value in the NEW snapshot. */
  next: string;
}

/** Bounds on the walk. Defaults are sized for this schema with room to spare. */
export interface DiffLimits {
  /** How deep to descend before giving up on a branch. */
  maxDepth: number;
  /** How many values to visit in total. */
  maxNodes: number;
  /** How many changes to report before stopping. */
  maxChanges: number;
  /** Longest string to consider; anything longer is left to the soft refresh. */
  maxLength: number;
}

export const DEFAULT_DIFF_LIMITS: DiffLimits = {
  maxDepth: 10,
  maxNodes: 5000,
  maxChanges: 100,
  maxLength: 2000,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** True for an array that holds portable text blocks. */
function isPortableText(value: unknown[]): boolean {
  return value.some((item) => isPlainObject(item) && item._type === 'block');
}

/**
 * A block with its spans' text blanked, as a string: two blocks with the same
 * shape give the same string whatever their words say. Key order is the
 * document store's own, which is stable between snapshots of one document.
 */
function blockShape(block: Record<string, unknown>): string {
  const children = Array.isArray(block.children)
    ? block.children.map((child) => (isPlainObject(child) ? { ...child, text: '' } : child))
    : block.children;
  return JSON.stringify({ ...block, children });
}

/** Append a segment to a studio path string. */
function step(base: string, segment: string): string {
  return base === '' ? segment : `${base}.${segment}`;
}

/** The `_key` of an array item, when it has one. */
function keyOf(item: unknown): string | undefined {
  return isPlainObject(item) && typeof item._key === 'string' ? item._key : undefined;
}

/**
 * Collect the plain string fields whose value differs between two snapshots of
 * the same document.
 *
 * Underscore-prefixed keys (`_id`, `_rev`, `_type`, `_key`, `_updatedAt`, ...)
 * are skipped: they are Sanity's bookkeeping, they change on every save, and
 * none of them is text anybody reads on the page.
 */
export function diffStringFields(
  previous: unknown,
  next: unknown,
  limits: DiffLimits = DEFAULT_DIFF_LIMITS,
): StringChange[] {
  const changes: StringChange[] = [];
  let visited = 0;

  const walk = (before: unknown, after: unknown, path: string, depth: number): void => {
    if (changes.length >= limits.maxChanges) return;
    if (depth > limits.maxDepth) return;
    if (visited >= limits.maxNodes) return;
    visited += 1;
    if (before === after) return;

    if (typeof before === 'string' || typeof after === 'string') {
      if (typeof before !== 'string' || typeof after !== 'string') return;
      if (before.length > limits.maxLength || after.length > limits.maxLength) return;
      if (path !== '') changes.push({ path, previous: before, next: after });
      return;
    }

    if (Array.isArray(before) && Array.isArray(after)) {
      if (isPortableText(before) || isPortableText(after)) {
        // Rule 3: only blocks whose shape is unchanged, matched by `_key`.
        for (const block of after) {
          const key = keyOf(block);
          if (key === undefined || !isPlainObject(block) || block._type !== 'block') continue;
          if (!Array.isArray(block.children)) continue;
          const old = before.find((candidate) => keyOf(candidate) === key);
          if (!isPlainObject(old) || blockShape(old) !== blockShape(block)) continue;
          const oldChildren = old.children as unknown[];
          (block.children as unknown[]).forEach((child, index) => {
            const span = keyOf(child);
            if (span === undefined) return;
            walk(
              (oldChildren[index] as Record<string, unknown>).text,
              (child as Record<string, unknown>).text,
              `${path}[_key=="${key}"].children[_key=="${span}"].text`,
              depth + 1,
            );
          });
        }
        return;
      }
      // Items are matched by `_key`, never by position, so reordering a section
      // reports nothing rather than reporting every string in the array as
      // changed. Keyless arrays (rare in this schema, and never text) are
      // compared by index.
      after.forEach((item, index) => {
        const key = keyOf(item);
        const match =
          key === undefined ? before[index] : before.find((candidate) => keyOf(candidate) === key);
        if (match === undefined) return;
        const segment = key === undefined ? `[${index}]` : `[_key=="${key}"]`;
        walk(match, item, `${path}${segment}`, depth + 1);
      });
      return;
    }

    if (isPlainObject(before) && isPlainObject(after)) {
      for (const key of Object.keys(after)) {
        if (key.startsWith('_')) continue;
        walk(before[key], after[key], step(path, key), depth + 1);
      }
      return;
    }
  };

  walk(previous, next, '', 0);
  return changes;
}
