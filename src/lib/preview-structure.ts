// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-structure - instant section moves and picture swaps in the draft
// preview (2026-10-26, PORTS.md card 183)
// =============================================================================
// Instant text (preview-text-diff.ts) makes typed words show at once. A STRUCTURAL
// edit still waited for the whole loop: autosave, the query index, a ~0.4s
// server render, the morph. Moving a section, removing one, duplicating one and
// picking a different picture are all things the frame can show from the draft
// it already holds, without asking the server, because the page already has the
// pieces: the section wrappers are on the page (each one tagged with its
// `_key` by sectionEditAttr), and a Sanity image URL is derived from the asset
// ref alone.
//
// Sanity's own answer (`useOptimistic` in @sanity/visual-editing) re-renders a
// React tree from the optimistic document. This site renders Astro on the
// server, so there is no tree to re-render; the DOM is moved instead, and this
// file decides WHAT to move. The DOM glue is
// src/components/preview/overlay/instantStructure.ts.
//
// THE SAME CONTRACT AS INSTANT TEXT. A missed instant update is invisible; a
// wrong one is the preview lying about the page. So every helper here answers
// "not sure" with null or an empty list, and the soft refresh, which runs
// anyway, renders the truth a moment later:
//
//  - A section plan is made only when the array changed by moves, removals and
//    copies of a section already ON the page. One new item of any other kind
//    (an insert from the menu that matches nothing) and the whole plan is null.
//  - A picture swap is reported only for an image whose asset ref changed, in a
//    section that holds that asset exactly once and references no other
//    document (a referenced doc could render the same asset), and only onto a
//    URL with no crop rectangle (a `rect` is the OLD picture's crop).
//
// What waits for the refresh on purpose: the alternating surface cadence, the
// dividers between sections and the heading ids, which depend on position; a
// copy's click-to-edit on text (its stega still names the original until the
// refresh); crop and hotspot.
// =============================================================================

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The `_key` of an array item, when it has one. */
function keyOf(item: unknown): string | undefined {
  return isPlainObject(item) && typeof item._key === 'string' ? item._key : undefined;
}

// ---------------------------------------------------------------------------
// Section wrappers: reading and re-keying the `data-sanity` value
// ---------------------------------------------------------------------------

/** What a section wrapper's `data-sanity` value says. */
export interface SectionTarget {
  /** Document id, without a `drafts.` prefix. */
  id: string;
  /** The array field, e.g. `pageBuilder`. */
  field: string;
  /** The array item's `_key`. */
  key: string;
}

/**
 * Parse a section wrapper's `data-sanity` value
 * (`id=home;type=homePage;path=pageBuilder:abc;base=%2Fstudio`, the shape
 * createDataAttribute writes). Only a ONE-LEVEL item path counts: a deeper path
 * (`pageBuilder:abc.heading`) is a field inside a section, not a section.
 */
export function parseSectionAttr(value: string | null | undefined): SectionTarget | null {
  if (!value) return null;
  const parts = new Map<string, string>();
  for (const part of value.split(';')) {
    const at = part.indexOf('=');
    if (at > 0) parts.set(part.slice(0, at), part.slice(at + 1));
  }
  const id = parts.get('id');
  const path = parts.get('path');
  if (!id || !path) return null;
  const match = /^([A-Za-z_][\w]*):([^.:[\]"]+)$/.exec(path);
  if (!match) return null;
  return { id: id.replace(/^drafts\./, ''), field: match[1], key: match[2] };
}

/** The same `data-sanity` value, pointed at a different item of the same array. */
export function rekeySectionAttr(value: string, key: string): string | null {
  const target = parseSectionAttr(value);
  if (!target || !/^[^.:[\]";=]+$/.test(key)) return null;
  return value
    .split(';')
    .map((part) => (part.startsWith('path=') ? `path=${target.field}:${key}` : part))
    .join(';');
}

// ---------------------------------------------------------------------------
// Section plans
// ---------------------------------------------------------------------------

/** One section in the order the page should show. */
export interface PlannedSection {
  key: string;
  /** Set when this section is not on the page yet: copy the wrapper with this key. */
  cloneOf?: string;
}

/** What to do to the section wrappers. */
export interface SectionPlan {
  /** Every section to show, in order. */
  order: PlannedSection[];
  /** Wrappers on the page whose item is no longer in the array. */
  removed: string[];
}

/**
 * Deep equality that ignores every `_key`. A duplicated section is its source
 * with a new `_key`, and (depending on how it was made) new keys on its nested
 * items too, so keys are the one thing a copy is allowed to differ in. Bounded,
 * because this runs on every edit; a branch past the cap counts as different.
 */
export function sameIgnoringKeys(a: unknown, b: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameIgnoringKeys(item, b[i], depth + 1));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a).filter((k) => k !== '_key');
    const keysB = Object.keys(b).filter((k) => k !== '_key');
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => k in b && sameIgnoringKeys(a[k], b[k], depth + 1));
  }
  return false;
}

/**
 * Plan the section wrappers for a changed array.
 *
 * `onPage` is the keys of the wrappers in DOM order. `previous` and `next` are
 * the array before and after. Returns null when there is nothing to do OR when
 * it is not safe to do anything:
 *
 *  - a key on the page twice (a synced section expands to several wrappers
 *    under one key; moving a group is left to the refresh);
 *  - an item without a `_key`;
 *  - a new item that is not a copy of a section on the page.
 *
 * An item that is in the array but not on the page (a section the renderer
 * skips) stays skipped. Called again with the same arrays after a refresh, it
 * re-plans from whatever the page now shows, which is how a stale render is
 * put right.
 */
export function planSections(
  onPage: readonly string[],
  previous: readonly unknown[],
  next: readonly unknown[],
): SectionPlan | null {
  const rendered = new Set(onPage);
  if (rendered.size !== onPage.length) return null;

  const nextKeys: string[] = [];
  for (const item of next) {
    const key = keyOf(item);
    if (key === undefined) return null;
    nextKeys.push(key);
  }
  const previousKeys = new Set(previous.map(keyOf));

  // The source a copy is made from must be on the page; its content is read
  // from the newest array that has it.
  const sources: Array<[string, unknown]> = [];
  for (const item of [...next, ...previous]) {
    const key = keyOf(item);
    if (key !== undefined && rendered.has(key) && !sources.some(([k]) => k === key)) {
      sources.push([key, item]);
    }
  }

  const order: PlannedSection[] = [];
  next.forEach((item, index) => {
    const key = nextKeys[index];
    if (rendered.has(key)) {
      order.push({ key });
      return;
    }
    const source = sources.find(([k, value]) => k !== key && sameIgnoringKeys(value, item));
    if (source) {
      order.push({ key, cloneOf: source[0] });
      return;
    }
    // An item the page already did not show. Still not shown.
    if (previousKeys.has(key)) return;
    order.push({ key, cloneOf: '' });
  });
  if (order.some((entry) => entry.cloneOf === '')) return null;

  const wanted = new Set(nextKeys);
  const removed = onPage.filter((key) => !wanted.has(key));

  const kept = order.filter((entry) => !entry.cloneOf).map((entry) => entry.key);
  const unchanged =
    removed.length === 0 &&
    kept.length === order.length &&
    kept.join('\n') === onPage.filter((key) => wanted.has(key)).join('\n');
  return unchanged ? null : { order, removed };
}

// ---------------------------------------------------------------------------
// Picture swaps
// ---------------------------------------------------------------------------

/** One image field whose picture changed. */
export interface ImageChange {
  /** Studio path of the image object. */
  path: string;
  /** Old asset ref (`image-<id>-<w>x<h>-<ext>`). */
  previous: string;
  /** New asset ref. */
  next: string;
}

/** The parts of an image asset ref. */
export interface ImageRef {
  id: string;
  width: number;
  height: number;
  ext: string;
}

/** Parse `image-<id>-<w>x<h>-<ext>`, or null for anything else. */
export function parseImageRef(ref: unknown): ImageRef | null {
  if (typeof ref !== 'string') return null;
  const match = /^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/.exec(ref);
  if (!match) return null;
  return { id: match[1], width: Number(match[2]), height: Number(match[3]), ext: match[4] };
}

/** The file name a CDN URL carries for a ref: `<id>-<w>x<h>.<ext>`. */
function fileName(ref: ImageRef): string {
  return `${ref.id}-${ref.width}x${ref.height}.${ref.ext}`;
}

/** The asset ref of an image object, when it has a real one. */
function imageRefOf(value: unknown): string | undefined {
  if (!isPlainObject(value) || !isPlainObject(value.asset)) return undefined;
  const ref = value.asset._ref;
  return parseImageRef(ref) ? (ref as string) : undefined;
}

/**
 * The image fields whose asset ref changed between two snapshots. Arrays are
 * matched by `_key` (a moved section reports nothing). A picture that appears
 * or disappears is not reported: there is no `<img>` to repoint, or one to
 * take away, which is the refresh's job.
 */
export function diffImageRefs(previous: unknown, next: unknown, maxNodes = 5000): ImageChange[] {
  const changes: ImageChange[] = [];
  let visited = 0;
  const walk = (before: unknown, after: unknown, path: string, depth: number): void => {
    if (depth > 10 || visited >= maxNodes || changes.length >= 50) return;
    visited += 1;
    if (before === after) return;
    const oldRef = imageRefOf(before);
    const newRef = imageRefOf(after);
    if (oldRef && newRef) {
      if (oldRef !== newRef && path !== '') changes.push({ path, previous: oldRef, next: newRef });
      return;
    }
    if (Array.isArray(before) && Array.isArray(after)) {
      after.forEach((item) => {
        const key = keyOf(item);
        if (key === undefined) return;
        const match = before.find((candidate) => keyOf(candidate) === key);
        if (match !== undefined) walk(match, item, `${path}[_key=="${key}"]`, depth + 1);
      });
      return;
    }
    if (isPlainObject(before) && isPlainObject(after)) {
      for (const key of Object.keys(after)) {
        if (key.startsWith('_')) continue;
        walk(before[key], after[key], path === '' ? key : `${path}.${key}`, depth + 1);
      }
    }
  };
  walk(previous, next, '', 0);
  return changes;
}

/** The section key a path sits under (`pageBuilder[_key=="a"].image` -> `a`). */
export function sectionKeyOf(path: string, field = 'pageBuilder'): string | undefined {
  const match = new RegExp(`^${field}\\[_key=="([^"]+)"\\]`).exec(path);
  return match?.[1];
}

/** How many times an asset ref appears anywhere inside a value. */
export function countImageRef(value: unknown, ref: string, depth = 0): number {
  if (depth > 12) return Infinity;
  if (Array.isArray(value)) return value.reduce((n, v) => n + countImageRef(v, ref, depth + 1), 0);
  if (!isPlainObject(value)) return 0;
  let count = imageRefOf(value) === ref ? 1 : 0;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'asset') continue;
    count += countImageRef(child, ref, depth + 1);
  }
  return count;
}

/** True when a value holds a reference to another document anywhere inside it. */
export function holdsReference(value: unknown, depth = 0): boolean {
  if (depth > 12) return true;
  if (Array.isArray(value)) return value.some((v) => holdsReference(v, depth + 1));
  if (!isPlainObject(value)) return false;
  if (typeof value._ref === 'string' && !/^(image|file)-/.test(value._ref)) return true;
  return Object.values(value).some((v) => holdsReference(v, depth + 1));
}

/**
 * The picture changes that are safe to apply inside their section: the old
 * asset appears once in the section (so every `<img>` showing it is this
 * field's), and the section pulls in no other document (which could render the
 * same asset). `section` is the section item from the OLD snapshot.
 */
export function safeImageChange(change: ImageChange, section: unknown): boolean {
  if (!isPlainObject(section) || holdsReference(section)) return false;
  return countImageRef(section, change.previous) === 1;
}

/**
 * A Sanity CDN URL pointed at a different asset, query kept (`w`, `q`, `auto`,
 * `fit`). Null when the URL is not this asset's, or carries a `rect` (a crop
 * worked out for the OLD picture's pixels).
 */
export function swapAssetUrl(url: string, from: string, to: string): string | null {
  const oldRef = parseImageRef(from);
  const newRef = parseImageRef(to);
  if (!oldRef || !newRef) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'cdn.sanity.io' || !parsed.pathname.startsWith('/images/')) return null;
  if (parsed.searchParams.has('rect')) return null;
  const segments = parsed.pathname.split('/');
  if (segments[segments.length - 1] !== fileName(oldRef)) return null;
  segments[segments.length - 1] = fileName(newRef);
  parsed.pathname = segments.join('/');
  return parsed.toString();
}

/** A `srcset` with every candidate swapped, or null if any candidate cannot be. */
export function swapSrcset(srcset: string, from: string, to: string): string | null {
  const candidates = srcset
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (candidates.length === 0) return null;
  const out: string[] = [];
  for (const candidate of candidates) {
    const [url, ...descriptor] = candidate.split(/\s+/);
    const swapped = swapAssetUrl(url, from, to);
    if (!swapped) return null;
    out.push([swapped, ...descriptor].join(' '));
  }
  return out.join(', ');
}

/** True when a URL shows this asset (any size, any query). */
export function showsAsset(url: string | null, ref: string): boolean {
  const parsed = parseImageRef(ref);
  if (!url || !parsed) return false;
  try {
    const path = new URL(url).pathname;
    return path.endsWith(`/${fileName(parsed)}`);
  } catch {
    return false;
  }
}

/**
 * The `height` attribute for the new picture at the same `width`, when the URL
 * leaves the height free (no `h` param). Null when the URL fixes the height, so
 * the box is already the right shape.
 */
export function scaledHeight(src: string, width: number, ref: string): number | null {
  const parsed = parseImageRef(ref);
  if (!parsed || !Number.isFinite(width) || width <= 0) return null;
  try {
    if (new URL(src).searchParams.has('h')) return null;
  } catch {
    return null;
  }
  return Math.round((parsed.height * width) / parsed.width);
}
