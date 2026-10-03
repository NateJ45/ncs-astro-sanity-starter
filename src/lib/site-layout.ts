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
// BaseLayout.astro (emits the data-* attributes), Hero.astro (hero variant) and
// src/lib/site-layout.test.ts (asserts the schema enum and this file agree).
//
// THE DEFAULT RULE. Every slot's first value is today's behaviour. A default
// emits NO attribute, so a site that never sets `layout` renders the same
// markup it always did. The variants are CSS keyed on those attributes
// (html[data-header=...], html[data-density=...], html[data-cards=...]) except
// the hero, which is a per-section attribute because it changes what the hero
// renders, not just how it is painted.
//
// NAMING. Not to be confused with src/lib/layout-variants.ts, which is the
// per-SECTION column count and media side an editor picks in the Studio.

export const LAYOUT_SLOTS = {
  /** Site header. inline = logo left, nav right. centered = logo centred over a
   *  centred nav row. minimal = logo plus a menu button at every width. */
  header: ['inline', 'centered', 'minimal'],
  /** Page hero. bleed = full-bleed image under a scrim (text-only when the page
   *  has no image). split = dark text panel beside the image. editorial =
   *  type only: large display heading on the page ground, image ignored. */
  hero: ['bleed', 'split', 'editorial'],
  /** Vertical rhythm between sections. */
  density: ['standard', 'airy', 'tight'],
  /** Card and list surface. standard = hairline border and soft shadow.
   *  outline = square, firmer border, no shadow. soft = borderless tinted fill. */
  cards: ['standard', 'outline', 'soft'],
} as const;

export type LayoutSlot = keyof typeof LAYOUT_SLOTS;
export type SiteLayout = { [K in LayoutSlot]: (typeof LAYOUT_SLOTS)[K][number] };

export const DEFAULT_LAYOUT: SiteLayout = {
  header: 'inline',
  hero: 'bleed',
  density: 'standard',
  cards: 'standard',
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

/** The data-* attributes for <html>. Header, density and cards only; a slot at
 *  its default contributes nothing, so the default site's markup is unchanged. */
export function layoutAttrs(layout: SiteLayout): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const slot of ['header', 'density', 'cards'] as const) {
    if (layout[slot] !== DEFAULT_LAYOUT[slot]) attrs[`data-${slot}`] = layout[slot];
  }
  return attrs;
}
