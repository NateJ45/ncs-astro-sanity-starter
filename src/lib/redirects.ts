// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// redirects - the pure path arithmetic behind the Studio's Redirects manager
// =============================================================================
// Two things use this file, and they must agree exactly:
//
//   1. astro.config.mjs (BUILD time) turns the published `redirect` documents
//      into Astro's `redirects` map, which the Cloudflare adapter emits as real
//      301/302s. That is where redirects are actually SERVED.
//   2. src/sanity/components/slugRedirect.tsx (STUDIO) works out the old and new
//      paths when an editor renames a page, so it can file the redirect
//      automatically instead of relying on them to remember.
//
// Everything here is pure string work - no Sanity client, no Astro imports - so
// it is unit-testable (src/lib/redirects.test.ts) and safe to import from the
// Astro config, the Studio bundle, or a script.
//
// WHAT IS DELIBERATELY NOT HERE: the map from a document type to its public
// path. That is per-repo (different routes, different singletons), and every
// repo in this family already owns one: `pathForDoc()` in src/sanity/urls.ts.
// Keeping it out is what lets this file stay byte-identical across the family.
//
// WHY NOT A RUNTIME LOOKUP? These sites are `output: 'static'`, so the 404 route
// is prerendered and middleware never runs for it at request time. Making it SSR
// just to read a redirect list would put a Worker invocation in front of the one
// route that exists to be cheap. The build-time map costs nothing per request
// and is already a real 301. Publishing a redirect fires the deploy webhook, so
// a new entry is live in the same 1-2 minutes as any other content edit.
// =============================================================================

/** One published `redirect` document, as the build-time query returns it. */
export interface RedirectDoc {
  from?: string | null;
  to?: string | null;
  permanent?: boolean | null;
}

/** What Astro's `redirects` map wants for a non-default status. */
export interface RedirectTarget {
  status: 301 | 302;
  destination: string;
}

/** True for an off-site target ("https://example.org"), which is left alone. */
export function isExternalTarget(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Put an editor-typed path into the one canonical shape the map is keyed by:
 * leading slash, no trailing slash, no query string or hash, no doubled
 * slashes. Returns null for anything that isn't a usable path.
 *
 * "/old-page/"        -> "/old-page"
 * "old-page"          -> "/old-page"
 * " /a//b?x=1#frag "  -> "/a/b"
 * "/" or "" or "///"  -> "/"
 *
 * External targets are returned untouched (they are not ours to normalize).
 */
export function normalizeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isExternalTarget(trimmed)) return trimmed;

  // Drop the query string / fragment: matching is on the path alone. A visitor
  // arriving with "?utm_source=..." still matches, and the adapter carries the
  // query through to the destination.
  const pathOnly = trimmed.split(/[?#]/)[0];
  if (!pathOnly) return '/';

  const collapsed = `/${pathOnly}`.replace(/\/{2,}/g, '/');
  const withoutTrailing = collapsed.replace(/\/+$/, '');
  return withoutTrailing || '/';
}

/**
 * Turn the published `redirect` docs into Astro's `redirects` map.
 *
 * Rules, all of them there to stop an editor typo becoming a broken site:
 *   - both sides normalized (so "/old-page/" and "/old-page" are one key);
 *   - a redirect to itself is dropped (it would be an infinite loop);
 *   - a missing side is dropped;
 *   - an external left-hand side is dropped (it could never match a request);
 *   - later entries win for the same `from`, so callers control precedence by
 *     spread order (any hand-written launch map first, the CMS entries last).
 *
 * No chain following: a direct match only. If /a -> /b and /b -> /c both exist,
 * the browser simply follows two hops, which is correct and cheap.
 */
export function buildRedirectMap(docs: readonly RedirectDoc[]): Record<string, RedirectTarget> {
  const map: Record<string, RedirectTarget> = {};
  for (const doc of docs ?? []) {
    const from = normalizeRedirectPath(doc?.from);
    const to = normalizeRedirectPath(doc?.to);
    if (!from || !to) continue;
    if (isExternalTarget(from)) continue;
    if (from === to) continue;
    map[from] = { status: doc?.permanent === false ? 302 : 301, destination: to };
  }
  return map;
}
