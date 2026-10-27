// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Site layout variants: the STRUCTURE axis of the brand config (PORTS.md card 72)
// =============================================================================
// brand/brand.config.json carries a `layout` block next to the palette and
// fonts. Colours and type reskin one fixed structure; this is the second axis,
// so two sites built from this starter can differ in shape, not just paint.
//
// ONE source of truth for the slots, the allowed values and the defaults. Read
// by: scripts/apply-brand.mjs (validates and writes src/data/layout.ts),
// BaseLayout.astro (emits the data-* attributes), Hero.astro (hero variant),
// SectionRenderer.astro (the board's section rules) and
// src/lib/site-layout.test.ts (asserts the schema enum and this file agree).
//
// THE DEFAULT RULE. Every slot's first value is today's behaviour. A default
// emits NO attribute, so a site that never sets `layout` renders the same
// markup it always did. The variants are CSS keyed on those attributes
// (html[data-header=...], html[data-density=...], html[data-cards=...]) except
// the hero, which is a per-section attribute because it changes what the hero
// renders, not just how it is painted. One hero value reaches the page body:
// board (card 188) also puts data-hero="board" on <html>, because its grammar
// (the section rules, one ground, one left edge) covers every section.
//
// NAMING. Not to be confused with src/lib/layout-variants.ts, which is the
// per-SECTION column count and media side an editor picks in the Studio.

export const LAYOUT_SLOTS = {
  /** Site header. inline = logo left, nav right. centered = logo centred over a
   *  centred nav row. minimal = logo plus a menu button at every width. */
  header: ['inline', 'centered', 'minimal'],
  /** Page hero. bleed = full-bleed image under a scrim (text-only when the page
   *  has no image). split = dark text panel beside the image. editorial =
   *  type only: large display heading on the page ground, image ignored.
   *  board = FBC Auburn's grammar (card 188): an inner page opens on a short
   *  head on the page ground (eyebrow with the brand marker, title, subhead,
   *  buttons, the photo beside it in the brand's standalone shape), and the
   *  sections below sit on one ground and one left edge, opened by a rule
   *  instead of a change of band colour. A tall (home) hero draws as bleed. */
  hero: ['bleed', 'split', 'editorial', 'board'],
  /** Vertical rhythm between sections. */
  density: ['standard', 'airy', 'tight'],
  /** Card and list surface. standard = hairline border and soft shadow.
   *  outline = square, firmer border, no shadow. soft = borderless tinted fill. */
  cards: ['standard', 'outline', 'soft'],
  /** Motion (card 192). reveal = the starter's scroll reveals ([data-reveal],
   *  stagger grids, the image curtain) and the plain cross-fade between pages.
   *  flow = FBC Auburn's flow layer: on a page marked full (Home and the 404)
   *  headings rise line by line, the rest fades up, photos settle and drift, and
   *  pages lift and rise between clicks; every other page gets a 200ms fade.
   *  fade = the 200ms fade on every page. none = nothing moves, not even the
   *  reveals or the page cross-fade. src/scripts/flow.ts, src/styles/flow.css. */
  motion: ['reveal', 'flow', 'fade', 'none'],
} as const;

export type LayoutSlot = keyof typeof LAYOUT_SLOTS;
export type SiteLayout = { [K in LayoutSlot]: (typeof LAYOUT_SLOTS)[K][number] };

export const DEFAULT_LAYOUT: SiteLayout = {
  header: 'inline',
  hero: 'bleed',
  density: 'standard',
  cards: 'standard',
  motion: 'reveal',
};

/** Fill a partial or missing config with defaults; an unknown value falls back
 *  to the slot default rather than throwing, so a stale config cannot break a build. */
export function resolveLayout(raw?: Partial<Record<LayoutSlot, string>> | null): SiteLayout {
  const out: Record<string, string> = { ...DEFAULT_LAYOUT };
  for (const slot of Object.keys(LAYOUT_SLOTS) as LayoutSlot[]) {
    const v = raw?.[slot];
    if (v && (LAYOUT_SLOTS[slot] as readonly string[]).includes(v)) out[slot] = v;
  }
  return out as SiteLayout;
}

/** The data-* attributes for <html>. Header, density, cards and motion; and the hero
 *  only when it is board, the one hero whose grammar covers the page body. A
 *  slot at its default contributes nothing, so the default site's markup is
 *  unchanged. */
export function layoutAttrs(layout: SiteLayout): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const slot of ['header', 'density', 'cards', 'motion'] as const) {
    if (layout[slot] !== DEFAULT_LAYOUT[slot]) attrs[`data-${slot}`] = layout[slot];
  }
  if (layout.hero === 'board') attrs['data-hero'] = 'board';
  return attrs;
}

/** True when the site draws the board grammar (hero: board): SectionRenderer
 *  opens each section with a BoardRule. */
/** True when the flow layer runs (motion flow or fade): BaseLayout loads
 *  src/scripts/flow.ts only then, so the default site ships no extra script. */
export function hasFlow(layout: SiteLayout): boolean {
  return layout.motion === 'flow' || layout.motion === 'fade';
}

export function isBoard(layout: SiteLayout): boolean {
  return layout.hero === 'board';
}
