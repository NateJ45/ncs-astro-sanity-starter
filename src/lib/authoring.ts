// Safe to edit by hand
// =============================================================================
// authoring - the pure logic behind the authoring kit (PORTS.md card 109)
// =============================================================================
// The authoring kit lets an editor build pages the way a block-editor handover
// does: start from a page template, pick sections from a picture grid, drop in
// a saved pattern, or place a SYNCED section that changes everywhere when its
// saved copy changes. The Studio pieces live in src/sanity/ (pageTemplates.ts,
// components/PageBuilderInput.tsx, ../lib/page-guardrails.ts); everything here is plain data
// in, plain data out, so node --test can pin it without a Studio.
//
// Four jobs:
//   1. Fresh `_key`s for anything copied into a page (templates and patterns).
//   2. Reading a saved section document as a list of sections (a "pattern").
//   3. Expanding synced sections on the live site, so SectionRenderer only ever
//      sees ordinary blocks and its alternating-surface cadence (rule 9) runs
//      across the expanded list exactly as if the sections were typed in.
//   4. The example-text marker templates fill sections with, so a guardrail can
//      say "this still has example text in it" before the page goes live.
// =============================================================================

type Rec = Record<string, unknown>;

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The block type a synced section is stored as. */
export const SYNCED_SECTION_TYPE = 'syncedSection';

/**
 * Every example sentence a page template writes starts with this, so an editor
 * can see at a glance what to replace, and the "example text left in" warning
 * can find it. Plain words, no brackets: it renders on the preview as written.
 */
export const EXAMPLE_PREFIX = 'Example:';

/** Wrap a line of template copy in the example marker. */
export const example = (text: string): string => `${EXAMPLE_PREFIX} ${text}`;

/** A short random `_key`, the same shape Sanity's own keys take. */
export function randomKey(): string {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * A deep copy of `value` with every `_key` replaced, at every depth. Objects
 * inside arrays that have no `_key` get one, because the Studio refuses to edit
 * an array member without one ("missing keys"). `makeKey` is injectable so the
 * tests can make the output predictable.
 */
export function freshKeys<T>(value: T, makeKey: () => string = randomKey): T {
  const walk = (node: unknown, inArray: boolean): unknown => {
    if (Array.isArray(node)) return node.map((child) => walk(child, true));
    if (!isRecord(node)) return node;
    const out: Rec = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '_key') continue;
      out[k] = walk(v, false);
    }
    if (inArray || '_key' in node) return { _key: makeKey(), ...out };
    return out;
  };
  return walk(value, false) as T;
}

// -----------------------------------------------------------------------------
// Patterns: a saved section document read as a list of sections
// -----------------------------------------------------------------------------

/** A saved section (`sectionPreset`) as the picker reads it. */
export interface PatternDoc {
  _id: string;
  title?: string;
  note?: string;
  section?: unknown;
}

export interface Pattern {
  /** The published id (no `drafts.` prefix), which is what a reference points at. */
  id: string;
  title: string;
  note: string;
  sections: Rec[];
  /** Every block type in it, in order, duplicates removed. */
  types: string[];
  /**
   * Whether a published version exists. A synced section can only point at a
   * published saved section: a page that references a never-published one
   * cannot itself be published.
   */
  published: boolean;
}

/**
 * Turn saved-section documents into patterns. Draft and published twins of one
 * document collapse to one entry, and the draft's words win (they are what the
 * editor last typed). Sorted by name, because the name is how one is found.
 */
export function patternsFrom(docs: PatternDoc[]): Pattern[] {
  const byId = new Map<string, PatternDoc>();
  const published = new Set<string>();
  for (const doc of docs) {
    if (!doc || typeof doc._id !== 'string') continue;
    const id = doc._id.replace(/^drafts\./, '');
    if (!doc._id.startsWith('drafts.')) published.add(id);
    if (doc._id.startsWith('drafts.') || !byId.has(id)) byId.set(id, doc);
  }
  const out: Pattern[] = [];
  for (const [id, doc] of byId) {
    const sections = (Array.isArray(doc.section) ? doc.section : []).filter(
      (s): s is Rec => isRecord(s) && typeof s._type === 'string',
    );
    out.push({
      id,
      title: (doc.title ?? '').trim() || '(unnamed saved section)',
      note: (doc.note ?? '').trim(),
      sections,
      types: [...new Set(sections.map((s) => String(s._type)))],
      published: published.has(id),
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The block types in a pattern that the target list does not accept. A pattern
 * saved from the home page can hold a block a custom page has no room for, and
 * inserting it would leave an "invalid item" the editor cannot open.
 */
export function typesNotAllowed(pattern: Pattern, allowed: Iterable<string>): string[] {
  const ok = new Set(allowed);
  return pattern.types.filter((t) => !ok.has(t));
}

/** Copies of a pattern's sections, ready to insert: deep, with fresh keys. */
export function patternCopies(pattern: Pattern, makeKey: () => string = randomKey): Rec[] {
  return pattern.sections.map((s) => freshKeys(s, makeKey));
}

/** A synced section that points at a pattern. */
export function syncedBlockFor(pattern: Pattern, makeKey: () => string = randomKey): Rec {
  return {
    _type: SYNCED_SECTION_TYPE,
    _key: makeKey(),
    preset: { _type: 'reference', _ref: pattern.id },
  };
}

// -----------------------------------------------------------------------------
// Synced sections on the live site
// -----------------------------------------------------------------------------

/**
 * Replace each synced section with the sections its saved copy holds (the GROQ
 * projection resolves them into a `sections` array). Each expanded block gets
 * a key made from both keys, so two synced copies of one pattern on a page
 * never share a heading id, and `_editKey` keeps the synced block's OWN key so
 * the preview's in-canvas controls act on the synced block, which is the thing
 * that is really in the page. A synced section whose saved copy is gone, or
 * holds nothing, renders nothing. A synced section is never expanded inside
 * another: the saved-section schema does not accept one, and this skips any
 * that slipped in, so there is no way to build a loop.
 */
export function expandSyncedSections<T extends { _type?: string; _key?: string }>(
  sections: readonly T[] | null | undefined,
): T[] {
  const out: T[] = [];
  for (const block of sections ?? []) {
    if (!isRecord(block)) continue;
    if (block._type !== SYNCED_SECTION_TYPE) {
      out.push(block);
      continue;
    }
    const inner = Array.isArray((block as Rec).sections)
      ? ((block as Rec).sections as unknown[])
      : [];
    const outerKey = typeof block._key === 'string' ? block._key : 'synced';
    inner.forEach((child, i) => {
      if (!isRecord(child) || typeof child._type !== 'string') return;
      if (child._type === SYNCED_SECTION_TYPE) return;
      const childKey = typeof child._key === 'string' ? child._key : String(i);
      out.push({ ...child, _key: `${outerKey}-${childKey}`, _editKey: outerKey } as unknown as T);
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Example text
// -----------------------------------------------------------------------------

/** True when any string anywhere in `value` still starts with the example marker. */
export function hasExampleText(value: unknown): boolean {
  if (typeof value === 'string') return value.trimStart().startsWith(EXAMPLE_PREFIX);
  if (Array.isArray(value)) return value.some(hasExampleText);
  if (isRecord(value)) return Object.values(value).some(hasExampleText);
  return false;
}
