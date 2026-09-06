// EXPECTED TO DIFFER PER SITE. Every other file in tests/ is a canonical copy
// carried by the whole family; this one is the list of routes THIS repo builds,
// and it changes with src/pages.
//
// Single source of truth for the starter's public, statically-known routes.
// Every path below was verified against dist/client after `npm run build`.
//
// Deliberately absent:
//   /[slug] and /journal/[slug]   dynamic, and build zero paths with no
//                                 Sanity project configured (which is how the
//                                 starter builds by default)
//   /studio, /preview/**,
//   /api/draft-mode/*             SSR only, never emitted into dist/client
//   the nine module routes        staged under modules/, opt-in, not built
//   /404                          reachable as 404.html, not as a route

/** Routes that render real content and must pass every check. */
export const routes: string[] = [
  '/',
  '/about',
  '/services',
  '/process',
  '/faq',
  '/contact',
  '/journal',
  '/privacy',
];

/**
 * Routes that must answer 200 but are not expected to render a full page.
 *
 * Empty here. The sibling repos use this for the meta-refresh stubs Astro
 * bakes when a section is switched off in Sanity; the starter has no Sanity
 * project, so nothing is switched off and nothing stubs out. Keep the export:
 * smoke and reflow read it, and a project that hides a section will want it.
 */
export const hiddenRoutes: string[] = [];

/** Every route that should return HTTP 200, whether or not it renders content. */
export const allRoutes: string[] = [...routes, ...hiddenRoutes];

/**
 * Prerendered routes that carry a form, for the focus-indicator check in
 * a11y-dark.spec.ts. It lives here rather than in that spec so the spec stays
 * byte-identical across the family; only this file knows which pages a given
 * site puts a form on. /contact is the starter's only one. A project that
 * enables the lead-magnet module gets a form on /guides/[slug]; add it here
 * once a guide is published and that route builds.
 */
export const FORM_ROUTES: string[] = ['/contact'];
