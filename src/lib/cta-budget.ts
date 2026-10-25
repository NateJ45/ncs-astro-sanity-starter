// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// One accent button per page (PORTS.md card 158)
// =============================================================================
// A page reads best with ONE filled accent button: the page's single primary
// next step. When an editor stacks a hero with a button, a closing band and
// another closing band, every one of them used to draw the filled button, and
// none of them stood out. The page builder's renderer (SectionRenderer.astro)
// now asks this budget which variant each row's main button draws: the first
// row that draws a primary button keeps it, every later one draws the quieter
// secondary (outlined) variant.
//
// It is a renderer concern on purpose. Blocks carry no colour field (rule 9),
// so an editor cannot ask for "the red one"; the page decides.
//
// Pure, so it is unit-tested (cta-budget.test.ts). Which blocks draw a primary
// button is the site's own knowledge (its block list differs), so the caller
// passes that test in as `drawsPrimary`.
// =============================================================================

export type CtaVariant = 'primary' | 'secondary';

/** The index of the first block that draws a primary button, or -1 when none does. */
export function firstPrimaryIndex<T>(
  blocks: readonly T[],
  drawsPrimary: (block: T) => boolean,
): number {
  return blocks.findIndex((b) => drawsPrimary(b));
}

/**
 * The variant each row's main button draws: 'primary' for the first row that
 * draws one, 'secondary' for every other row. Call the returned function with
 * the row's index in the same list.
 */
export function primaryBudget<T>(
  blocks: readonly T[],
  drawsPrimary: (block: T) => boolean,
): (index: number) => CtaVariant {
  const first = firstPrimaryIndex(blocks, drawsPrimary);
  return (index: number) => (index === first ? 'primary' : 'secondary');
}
