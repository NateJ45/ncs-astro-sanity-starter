// Safe to edit by hand
// =============================================================================
// Section layout variants: the designed column counts and media sides
// (PORTS.md card 26, 2026-08-28)
// =============================================================================
// ONE source of truth for the "how is this section laid out" controls, the way
// src/lib/surfaces.ts is the one source for what a surface IS. Read by three
// kinds of caller that must never drift:
//
//   1. the grid sections in src/components/sections/ - they ask for a class
//      string and put it on the grid element, nothing else,
//   2. the block schemas in src/sanity/schemaTypes/ - the Studio list and the
//      stored default both come from here, so the list an editor sees and the
//      classes the site emits can never disagree,
//   3. src/lib/layout-variants.test.ts - asserts the fallback of every entry
//      emits the class string that section rendered BEFORE this file existed.
//
// THE PARITY RULE, and why this file is a registry rather than a formula. The
// three grids here do not agree with each other about where a phone stops
// stacking: the gallery breaks at `sm`, the values grid at `md`. Collapsing
// them into one formula would move live pages. So this holds each section's
// real classes verbatim, keyed by block type. Nothing here is derived.
//
// Every `fallback` is the value that section already defaulted to, and its
// entry in `classes` is that section's existing class string character for
// character. A page already in the dataset therefore renders byte-identical
// HTML; scripts/page-parity.mjs is what holds that line.
//
// STORED VALUES ARE NUMBERS. `gallerySection.columns` has been `type: 'number'`
// since it was written, and the two new controls follow it rather than
// introducing a second convention in one schema file. `columnsClass` therefore
// coerces, and the test covers the number, the string and the empty case.
//
// MOBILE IS NEVER THE VARIABLE, and it is asserted rather than assumed. Each
// entry records the section's own base grid class (`baseColumns`) and what a
// 320px phone therefore resolves to (`phoneColumns`); the test replays the two
// together for EVERY option and fails if any option lands somewhere else. That
// is what lets the reflow sweep over the live pages stand in for the
// non-default values.
//
// DENSITY is deliberately NOT here. Vertical rhythm in this template is owned
// by the `py-section-lg` / `py-section-md` spacing tokens and by
// `spacerSection`, which is the editor-facing way to open a page up. A
// per-section density enum would be a third spacing system arguing with two
// that already work.
// =============================================================================

/** One entry in a Studio list: what the editor reads, what gets stored. */
export interface LayoutOption {
  title: string;
  value: number;
}

interface ColumnSpec {
  /** The stored value a section with no choice renders. Emits today's classes. */
  fallback: number;
  /** The Studio list, in the order it is shown. */
  options: LayoutOption[];
  /** Exactly what the section puts on its grid element, per stored value. */
  classes: Record<string, string>;
  /**
   * The UNPREFIXED grid class the section's own markup already carries, copied
   * from the component. Not read at runtime: it is the other half of the reflow
   * invariant below, and the test needs both halves.
   */
  baseColumns: string;
  /** What a 320px phone resolves to, at EVERY option. */
  phoneColumns: string;
}

/** Plain-language labels. "Across" reads better to a non-technical editor. */
const TWO = { title: 'Two across', value: 2 };
const THREE = { title: 'Three across', value: 3 };
const FOUR = { title: 'Four across', value: 4 };

export const COLUMN_VARIANTS: Readonly<Record<string, ColumnSpec>> = {
  // --- Already had a columns field. Classes copied verbatim, default kept. ---
  gallerySection: {
    fallback: 3,
    options: [TWO, THREE, FOUR],
    classes: {
      '2': 'sm:grid-cols-2',
      '3': 'sm:grid-cols-2 lg:grid-cols-3',
      '4': 'sm:grid-cols-2 lg:grid-cols-4',
    },
    baseColumns: 'grid-cols-1',
    phoneColumns: 'grid-cols-1',
  },

  // --- New here. Both grids were hard-wired to their three-across form. -----
  // Three stays the default and emits the exact string that was inline in the
  // component, so no published page moves. Two is offered because both grids
  // commonly hold two items, and a three-across row with one empty cell is the
  // layout complaint this control exists to answer. Four is NOT offered: a
  // numbered value card carries a display numeral, a title and a paragraph, and
  // a fetched card carries a cover image, a meta line and a summary. Neither
  // survives a quarter-width column.
  valuesSection: {
    fallback: 3,
    options: [TWO, THREE],
    classes: {
      '2': 'md:grid-cols-2',
      '3': 'md:grid-cols-3',
    },
    baseColumns: 'grid-cols-1',
    phoneColumns: 'grid-cols-1',
  },
  dynamicListSection: {
    fallback: 3,
    options: [TWO, THREE],
    classes: {
      '2': 'sm:grid-cols-2',
      '3': 'sm:grid-cols-2 lg:grid-cols-3',
    },
    baseColumns: 'grid-cols-1',
    phoneColumns: 'grid-cols-1',
  },
};

/**
 * The responsive column classes for one section, for the value an editor chose.
 *
 * Unknown block type, unset value, or a value outside the list all resolve to
 * that section's fallback, which is what an already-published page stores
 * (nothing) and therefore what it renders.
 */
export function columnsClass(type: string, value: unknown): string {
  const spec = COLUMN_VARIANTS[type];
  if (!spec) return '';
  const key = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  return spec.classes[key] ?? spec.classes[String(spec.fallback)];
}

/** The Studio list for one section's column control. */
export function columnOptions(type: string): LayoutOption[] {
  return COLUMN_VARIANTS[type]?.options ?? [];
}

/** The stored default for one section's column control. */
export function columnFallback(type: string): number | undefined {
  return COLUMN_VARIANTS[type]?.fallback;
}

/**
 * The two-value radio for a section that pairs one piece of media with text.
 *
 * The stored values ('left' / 'right') and the field name (`imageSide` on the
 * image + text section) predate this file and are in the dataset, so neither
 * changes. What comes from here is the WORDING, so the section stops offering a
 * bare "Left / Right" that does not say what moves. Labels are Studio-only and
 * touch no rendered markup.
 */
export function sideOptions(noun: string): Array<{ title: string; value: string }> {
  return [
    { title: `${noun} on the left`, value: 'left' },
    { title: `${noun} on the right`, value: 'right' },
  ];
}
