// Safe to edit by hand
// =============================================================================
// section-fields - which sections carry which in-canvas controls (card 28)
// =============================================================================
// The in-canvas overlay (the floating controls that appear over a section in the
// Presentation preview) has to answer one question before it draws anything:
// DOES THIS SECTION ACTUALLY HAVE THIS FIELD? A control over a section whose
// type has no `headingAccent` would write a field the schema does not know
// about, and the editor would click a word and see nothing happen.
//
// The overlay cannot ask the Studio's schema for the answer. It runs inside the
// preview iframe, in the site's own bundle, and the schema lives in the parent
// window. So the answer is a REGISTRY, here, and the registry is kept honest by
// src/lib/section-fields.test.ts, which reads sections.ts and richSections.ts
// and fails if a section gains or loses one of these fields without this file
// being updated. Same discipline as the contrast gate in surfaces.test.ts: the
// duplicated knowledge is allowed only because a test measures the duplicate.
//
// -----------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT HERE: a surface or band control
// -----------------------------------------------------------------------------
// Every sibling repo's version of this file opens with a list of section types
// carrying a background/tone field, and its overlay hangs a swatch card off a
// preview-only handle in each band's corner. THIS TEMPLATE HAS NO SUCH FIELD
// AND MUST NOT GROW ONE. CLAUDE.md #9: the alternating-surface cadence belongs
// to SectionRenderer (src/lib/sectionCadence.ts) precisely so that reordering a
// page can never break the page's rhythm, and PORTS.md card 26 records that the
// appearance-controls card landed here PARTIAL for the same reason. A band card
// would need a per-block colour field to write to; adding one to get the control
// would trade an architectural guarantee for a convenience.
//
// So this repo's card 28 is two controls, not three: the click-a-word heading
// accent, and the "Edit here" text popover.
//
// It also holds the two PURE decisions those controls make - which control an
// element gets, and which field a text popover writes to - so the React
// components in src/components/preview/overlay/ are left holding only what a
// browser has to do.
// =============================================================================

import { inlineRichRuns, hasInlineRich, type InlineRun } from './inline-rich.ts';
import { normalizeRuns } from './inline-rich-write.ts';
import { plain } from './nav-href.ts';
import { parseSanityPath, readSectionPath, type PathSegment } from './sanity-path.ts';

/**
 * The page-builder array fields in this schema. Every page type names its main
 * builder `pageBuilder`; some also carry an `additionalSections` append zone,
 * which renders through the same SectionRenderer and therefore deserves the same
 * controls. Passed to `readSectionPath`, which is canonical and takes the names
 * rather than owning them.
 */
export const SECTION_ARRAY_FIELDS: readonly string[] = ['pageBuilder', 'additionalSections'];

/**
 * Section types carrying `headingAccentField()`, and THE FIELD EACH ONE'S
 * ACCENT WORD IS MATCHED AGAINST.
 *
 * The name is not always `heading`: four of the five call their big line
 * `headline`. That is not a typo to fix, because the value is in the dataset,
 * and it is exactly why this is a map rather than a list - a control that
 * assumed `heading` would read an empty string on the CTA band and quietly offer
 * no words at all. The drift gate in section-fields.test.ts re-derives the field
 * name straight out of the schema, so this cannot fall out of step again.
 */
export const HEADING_ACCENT_FIELDS: Readonly<Record<string, string>> = {
  richTextSection: 'heading',
  ctaBandSection: 'headline',
  servicesGridSection: 'headline',
  testimonialsSection: 'headline',
  faqSection: 'headline',
};

/** The section types that offer an accent word. */
export const HEADING_ACCENT_SECTION_TYPES: readonly string[] = Object.keys(HEADING_ACCENT_FIELDS);

/** Every name a heading field goes by, for the synchronous path gate. */
export const HEADING_FIELD_NAMES: ReadonlySet<string> = new Set(
  Object.values(HEADING_ACCENT_FIELDS),
);

/** A curated plain-string field and the rich twin that supersedes it. */
export interface RichTwin {
  /** The plain string field, still stored and still the fallback. */
  plain: string;
  /** The portable-text twin: one paragraph, bold and italic only. */
  rich: string;
}

/**
 * The six rich twins, by section type. `richTwin()` in _appearanceFields.ts
 * creates the twin and `hideWhenRich()` hides the plain field once the twin
 * holds text, so these two names always travel together.
 */
export const RICH_TWINS: Readonly<Record<string, RichTwin>> = {
  ctaBandSection: { plain: 'subhead', rich: 'subheadRich' },
  servicesGridSection: { plain: 'subhead', rich: 'subheadRich' },
  testimonialsSection: { plain: 'subhead', rich: 'subheadRich' },
  faqSection: { plain: 'subhead', rich: 'subheadRich' },
  teamSection: { plain: 'subhead', rich: 'subheadRich' },
  dynamicListSection: { plain: 'subhead', rich: 'subheadRich' },
};

/**
 * Every field name either half of a twin can be called, as one flat set. The
 * overlay resolver runs before it knows a section's `_type` (that comes from the
 * document snapshot, which is read asynchronously), so it uses this to decide
 * whether a clicked field is even a CANDIDATE, and the control confirms against
 * RICH_TWINS once the type is known.
 */
export const RICH_TWIN_FIELD_NAMES: ReadonlySet<string> = new Set(
  Object.values(RICH_TWINS).flatMap((twin) => [twin.plain, twin.rich]),
);

/**
 * The two document-level hero strings the popover editor offers. They live at
 * the top of a page document and every page type that has a hero names them the
 * same way, so the path alone identifies them and no type list is needed.
 *
 * Only the BESPOKE pages (faq, contact, journal, privacy, 404) render these -
 * the builder pages open with a `heroSection` block instead, and their copies of
 * these fields are hidden and read-only in the Studio. That is why no control
 * can reach a read-only one: an element that is never rendered carries no stega,
 * so the overlay never sees its path.
 *
 * `heroSubhead` is a `text` field, several sentences long, so it wants rows.
 */
export const HERO_TEXT_FIELDS: Readonly<Record<string, { label: string; rows: number }>> = {
  heroHeadline: { label: 'Headline', rows: 2 },
  heroSubhead: { label: 'Subhead', rows: 4 },
};

/** Does this section type carry `headingAccent`? */
export function hasHeadingAccent(type?: string | null): boolean {
  return HEADING_ACCENT_SECTION_TYPES.includes(String(type ?? ''));
}

/**
 * The heading field an accent word is matched against on this section type, or
 * null when the type has no accent word at all. Pass `field` to also require
 * that the clicked field IS that heading, so a click on some other string on a
 * testimonials block does not open the word picker.
 */
export function headingAccentFieldFor(type?: string | null, field?: string | null): string | null {
  const name = HEADING_ACCENT_FIELDS[String(type ?? '')];
  if (!name) return null;
  if (field === undefined) return name;
  return String(field ?? '') === name ? name : null;
}

/**
 * Resolve a field name on a section type to its rich twin, whichever half the
 * caller happens to hold. A click on the rendered text lands on the PLAIN field
 * while the twin is empty and inside the TWIN once it has content, and both
 * gestures should open the same editor.
 */
export function richTwinFor(type?: string | null, field?: string | null): RichTwin | null {
  const twin = RICH_TWINS[String(type ?? '')];
  if (!twin) return null;
  const name = String(field ?? '');
  return name === twin.plain || name === twin.rich ? twin : null;
}

// -----------------------------------------------------------------------------
// What the in-canvas layer offers on a given element
// -----------------------------------------------------------------------------
// The overlay resolver runs SYNCHRONOUSLY, the instant an element is hovered,
// and all it holds is the element's path. That is enough to decide which
// controls are even candidates; each control then confirms against the section's
// real `_type` once the document snapshot arrives, and renders nothing if the
// answer is no. Two gates, in that order, because the cheap one runs on every
// hover and the accurate one costs a read.

/** The controls this layer can put on one element. */
export type OverlayControl = 'headingAccent' | 'text';

/**
 * Which controls a path is a candidate for. Order is the order they are
 * rendered in, and an empty list means the element gets nothing.
 */
export function overlayControlsForPath(path?: string | null): OverlayControl[] {
  const section = readSectionPath(path, SECTION_ARRAY_FIELDS);

  if (!section) {
    // A document-level field. Only the two hero strings are offered; nothing
    // else on a page document is a single line of prose.
    const segments = parseSanityPath(path);
    const name = segments.length === 1 && typeof segments[0] === 'string' ? segments[0] : '';
    return name in HERO_TEXT_FIELDS ? ['text'] : [];
  }

  // NOTE, learned on presacademy's deployed Studio (2026-08-28): a BARE
  // array-item path (`pageBuilder[_key=="..."]`, nothing after it) gets no
  // controls, and CANNOT. The host builds the resolver context through
  // `getField(node)` and bails on `!field`, and the schema hook resolves no
  // FIELD for an array item on its own, so the resolver is never called for the
  // section wrapper at all. Anything anchored to a whole section therefore needs
  // a real field to hang on - which in the sibling repos means a preview-only
  // handle carrying `...[_key=="x"].background`. This template has no such
  // field and wants none (see the header), so nothing here mounts on a section
  // wrapper and the bare-item case is deliberately not kept as a fallback: it
  // can never fire, and a branch that can never fire is a branch that will one
  // day be trusted.
  const first = typeof section.rest[0] === 'string' ? section.rest[0] : '';
  // The heading is `heading` on the text block and `headline` on the other four;
  // the control confirms the pairing by type.
  if (HEADING_FIELD_NAMES.has(first) && section.rest.length === 1) return ['headingAccent'];
  // Either half of a rich twin, and any span inside the rich half, opens the
  // same editor on the same twin.
  if (RICH_TWIN_FIELD_NAMES.has(first)) return ['text'];
  return [];
}

// -----------------------------------------------------------------------------
// What a text popover is editing
// -----------------------------------------------------------------------------

/** The resolved subject of the text popover. */
export interface TextTarget {
  kind: 'plain' | 'rich';
  /** Where the value is written. */
  path: PathSegment[];
  /** Plain kind: the current string. */
  text: string;
  /** Rich kind: the current value, as runs. */
  runs: InlineRun[];
  /** The field's name as the form shows it. */
  label: string;
  /** Rows for the textarea. */
  rows: number;
}

/**
 * Work out what a clicked element edits, from the path it carries and the
 * document as it currently stands. Returns null for anything the popover does
 * not offer, which is what makes the pencil disappear rather than write
 * somewhere unexpected.
 *
 * A rich twin is seeded from the PLAIN string when the twin is still empty, so
 * an editor's first emphasis keeps the words that were already there.
 */
export function resolveTextTarget(
  doc: Record<string, unknown>,
  path?: string | null,
): TextTarget | null {
  const section = readSectionPath(path, SECTION_ARRAY_FIELDS);

  if (!section) {
    const segments = parseSanityPath(path);
    const name = segments.length === 1 && typeof segments[0] === 'string' ? segments[0] : '';
    const hero = HERO_TEXT_FIELDS[name];
    if (!hero) return null;
    const value = doc?.[name];
    return {
      kind: 'plain',
      path: [name],
      text: typeof value === 'string' ? plain(value) : '',
      runs: [],
      label: hero.label,
      rows: hero.rows,
    };
  }

  const list = doc?.[section.array];
  const item = Array.isArray(list)
    ? (list.find((s) => (s as { _key?: string })?._key === section.key) as
        Record<string, unknown> | undefined)
    : undefined;
  const fieldName = typeof section.rest[0] === 'string' ? section.rest[0] : '';
  const twin = richTwinFor(typeof item?._type === 'string' ? item._type : '', fieldName);
  if (!item || !twin) return null;

  const stored = item[twin.rich];
  const fallback = item[twin.plain];
  return {
    kind: 'rich',
    path: [...section.itemPath, twin.rich],
    text: '',
    runs: hasInlineRich(stored)
      ? inlineRichRuns(stored)
      : normalizeRuns([
          { text: typeof fallback === 'string' ? plain(fallback) : '', strong: false, em: false },
        ]),
    label: twin.plain.charAt(0).toUpperCase() + twin.plain.slice(1),
    rows: 3,
  };
}

/**
 * The heading an accent picker should offer words from, and where the accent is
 * stored. Null when the clicked element is not a heading that carries one.
 *
 * The component reads the STORED heading rather than the rendered one, because
 * the rendered one may already be split around an accent span - and, on a
 * heading whose accent HAS matched, is deliberately stega-free (see
 * heading-accent.ts). `heading` is the value; `accentPath` is where a click
 * writes.
 */
export interface AccentTarget {
  /** The section item's path, for context. */
  itemPath: PathSegment[];
  /** Where the heading string lives. */
  headingPath: PathSegment[];
  /** Where the accent word is stored. */
  accentPath: PathSegment[];
}

export function resolveAccentTarget(
  doc: Record<string, unknown>,
  path?: string | null,
): AccentTarget | null {
  const section = readSectionPath(path, SECTION_ARRAY_FIELDS);
  if (!section) return null;

  const list = doc?.[section.array];
  const item = Array.isArray(list)
    ? (list.find((s) => (s as { _key?: string })?._key === section.key) as
        Record<string, unknown> | undefined)
    : undefined;
  if (!item) return null;

  const clicked = typeof section.rest[0] === 'string' ? section.rest[0] : '';
  const headingField = headingAccentFieldFor(
    typeof item._type === 'string' ? item._type : '',
    clicked,
  );
  if (!headingField) return null;

  return {
    itemPath: section.itemPath,
    headingPath: [...section.itemPath, headingField],
    accentPath: [...section.itemPath, 'headingAccent'],
  };
}
