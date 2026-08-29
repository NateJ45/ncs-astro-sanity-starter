// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// sanity-path - reading the `path` a visual-editing node carries (2026-08-28)
// =============================================================================
// Every element the Presentation overlay knows about arrives with a STUDIO PATH
// string: `pageBuilder[_key=="a1b2"].heading`, or `heroHeadline`, or
// `pageBuilder[_key=="x"].subheadRich[_key=="y"].children[_key=="z"].text`. To
// patch the document the mutation API wants that path as an ARRAY of segments,
// with array members addressed by key object:
//
//   ['pageBuilder', {_key: 'a1b2'}, 'heading']
//
// The Studio has a parser for this (`@sanity/util/paths`), but it lives inside
// the `sanity` package, and the in-canvas overlay ships in the PREVIEW ISLAND -
// a browser bundle that must not grow a Studio dependency. So: a small parser,
// here, pure, and covered by src/lib/sanity-path.test.ts.
//
// The grammar is deliberately narrow. It handles exactly what the overlay hands
// us - dotted property names, `[_key=="..."]` members, and numeric indices - and
// returns an empty path for anything it does not recognise, so a shape we have
// never seen makes a control DISAPPEAR rather than write to a guessed location.
//
// CANONICAL EVOLUTION, ON THE WAY IN (2026-08-28). presacademy's ancestor of
// this file baked its own two page-builder array names into a module constant,
// which is exactly what stopped it from being shared: this template calls its
// array `pageBuilder`, presacademy calls its two `flexibleSections` and
// `sections`. `readSectionPath` now TAKES the names, and the repo's own list
// lives beside the rest of its vocabulary in src/lib/section-fields.ts. Same
// move card 22 made on `redirects.ts`, for the same reason.
// =============================================================================

/** One step along a document path. */
export type PathSegment = string | number | { _key: string };

const PROPERTY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEY_MEMBER = /^_key\s*==\s*"([^"]*)"$/;

/**
 * Parse a studio path string into segments. Returns `[]` when the string is
 * empty or contains anything this grammar does not cover.
 */
export function parseSanityPath(path?: string | null): PathSegment[] {
  if (typeof path !== 'string' || path.trim() === '') return [];
  const out: PathSegment[] = [];
  let i = 0;
  const source = path.trim();

  while (i < source.length) {
    if (source[i] === '.') {
      i += 1;
      continue;
    }
    if (source[i] === '[') {
      const close = source.indexOf(']', i);
      if (close < 0) return [];
      const inner = source.slice(i + 1, close).trim();
      const keyed = inner.match(KEY_MEMBER);
      if (keyed) {
        out.push({ _key: keyed[1] });
      } else if (/^\d+$/.test(inner)) {
        out.push(Number(inner));
      } else {
        return [];
      }
      i = close + 1;
      continue;
    }
    let j = i;
    while (j < source.length && source[j] !== '.' && source[j] !== '[') j += 1;
    const word = source.slice(i, j);
    if (!PROPERTY.test(word)) return [];
    out.push(word);
    i = j;
  }

  return out;
}

/** The last property name in a path, or '' when the path ends in a member. */
export function lastProperty(segments: PathSegment[]): string {
  const last = segments[segments.length - 1];
  return typeof last === 'string' ? last : '';
}

/** The path with its final segment removed. */
export function parentOf(segments: PathSegment[]): PathSegment[] {
  return segments.slice(0, -1);
}

/**
 * Walk a document snapshot to the value at `segments`, or undefined when any
 * step is missing. Array members are found by `_key`, never by position, so a
 * section that moved while a control was open still resolves to itself.
 */
export function valueAtPath(root: unknown, segments: PathSegment[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === 'string') {
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[segment];
    } else if (typeof segment === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else {
      if (!Array.isArray(current)) return undefined;
      current = current.find(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          (item as { _key?: string })._key === segment._key,
      );
    }
  }
  return current;
}

/** What a path tells us about the section it points into. */
export interface SectionPathInfo {
  /** The array field the section lives in. */
  array: string;
  /** The section item's `_key`. */
  key: string;
  /** Path to the section item itself. */
  itemPath: PathSegment[];
  /** Everything below the item, e.g. `['heading']`. */
  rest: PathSegment[];
}

/**
 * Read a path that points at a section item, or at anything inside one.
 *
 * `arrayFields` is the repo's own list of page-builder array names. Returns null
 * for a path that is not inside one of them - a document field like
 * `heroHeadline`, a menu item, or a node on some other document entirely.
 */
export function readSectionPath(
  path: string | null | undefined,
  arrayFields: readonly string[],
): SectionPathInfo | null {
  const segments = parseSanityPath(path);
  if (segments.length < 2) return null;
  const [array, member, ...rest] = segments;
  if (typeof array !== 'string') return null;
  if (!arrayFields.includes(array)) return null;
  if (typeof member !== 'object' || member === null || !('_key' in member)) return null;
  return { array, key: member._key, itemPath: [array, { _key: member._key }], rest };
}

/**
 * Find one section item in a document snapshot, by array field and `_key`.
 *
 * Every in-canvas control starts here: the path names the section, and only the
 * document says what `_type` it is. That answer decides which control the editor
 * may have, so it is read once and shared.
 */
export function sectionByKey(
  doc: Record<string, unknown> | null | undefined,
  array: string,
  key: string,
): Record<string, unknown> | null {
  const list = doc?.[array];
  if (!Array.isArray(list)) return null;
  const found = list.find((item) => (item as { _key?: string } | null)?._key === key);
  return (found as Record<string, unknown> | undefined) ?? null;
}
