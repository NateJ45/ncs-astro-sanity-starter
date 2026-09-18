// Foundation, edit with care
// Single source of truth for reserved URL slugs — routes served by explicit
// Astro page files that a custom `page` document may not shadow.
//
// Used by:
//   - src/sanity/schemaTypes/page.ts   (Studio slug validation rule)
//   - src/pages/[slug].astro           (getStaticPaths filter)
//
// TWO RULES, AND THE SECOND ONE IS NEW (2026-09-18).
//
// 1. A slug belongs here when THIS REPO ACTUALLY SERVES THAT ROUTE. The list
//    used to carry seventeen names, seven of which (`e-design`, `shop`,
//    `gift-certificates`, `quiz`, `calculator`, `guides`, `press`) guarded
//    module routes that the starter has never built and that now live in
//    `archive/modules/`. Reserving a route nothing serves is not free: it tells
//    an editor that `/press` is taken when nothing is there, and it does it in
//    a validation message that offers no way to find out why. A module that
//    comes back out of the archive adds its slug here as part of enabling it,
//    which archive/README.md spells out.
//
// 2. A slug that belongs to a scaffold capability carries that capability's
//    marker, so `npm run scaffold --remove faq` takes `'faq'` out with the FAQ
//    page. Otherwise a race site that dropped the FAQ would still be telling
//    its editors that `/faq` is reserved, and the custom page they wanted to
//    put there would be refused by a guard protecting a route that no longer
//    exists.

export const RESERVED_SLUGS = new Set([
  'about', // scaffold: about
  'services', // scaffold: services
  'process', // scaffold: process
  'faq', // scaffold: faq
  'journal', // scaffold: journal
  'contact',
  'privacy',
  // The fixed-data wall the visual-regression suite shoots (PORTS.md card 37).
  // noindex and out of the sitemap, but a real built route, so a custom page
  // must not be able to shadow it.
  'styleguide',
  '404',
  'sitemap-index.xml',
  'og',
  '_astro',
]);

/** Returns true when a slug collides with a built-in route. */
export function isReservedSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return RESERVED_SLUGS.has(slug);
}
