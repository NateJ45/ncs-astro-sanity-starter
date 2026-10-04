// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// 2026-09-18: a destination now keeps its ?query and #fragment. buildRedirectMap
// ran normalizeRedirectPath over the DESTINATION as well as the source, and that
// function drops everything after "?" or "#" on purpose (a SOURCE is matched on
// its path alone). So every anchored target shipped truncated: "/visit#accessibility"
// went out as "/visit" and "/blog?category=ruminations" as "/blog". 25 of one
// site's 42 targets were wrong and only the anchor-free ones had been tested.
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
 * Normalize a DESTINATION: the same path arithmetic as normalizeRedirectPath,
 * applied to the path component only, with the `?query` and `#fragment`
 * re-attached byte for byte.
 *
 * The asymmetry with the source side is the whole point. A SOURCE is a key the
 * request's path is matched against, so its query and hash are noise and are
 * dropped. A DESTINATION is a string handed to the browser, so its query and
 * hash are the instruction: "/visit#accessibility" is what sends a visitor to
 * the right heading, and "/blog?category=ruminations" is what pre-filters the
 * index. Normalizing a destination with the source's rules silently deletes
 * exactly the part that made it a useful redirect.
 *
 * "/visit#accessibility"        -> "/visit#accessibility"
 * "/blog/?category=x"           -> "/blog?category=x"
 * "blog//a/?x=1#frag"           -> "/blog/a?x=1#frag"
 * External targets are returned untouched.
 */
export function normalizeRedirectTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isExternalTarget(trimmed)) return trimmed;

  const cut = trimmed.search(/[?#]/);
  if (cut === -1) return normalizeRedirectPath(trimmed);
  // A target that is only a query or a fragment ("#top") is anchored to "/".
  const path = normalizeRedirectPath(trimmed.slice(0, cut)) ?? '/';
  return `${path}${trimmed.slice(cut)}`;
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
    const to = normalizeRedirectTarget(doc?.to);
    if (!from || !to) continue;
    if (isExternalTarget(from)) continue;
    // The self-redirect guard compares PATHS, not the whole target. A browser
    // never sends the fragment and the key is matched on the path alone, so
    // "/a -> /a#top" and "/a -> /a?x=1" are both infinite loops even though
    // the two strings differ. Comparing the paths is what still catches them.
    if (from === normalizeRedirectPath(doc?.to)) continue;
    map[from] = { status: doc?.permanent === false ? 302 : 301, destination: to };
  }
  return map;
}
