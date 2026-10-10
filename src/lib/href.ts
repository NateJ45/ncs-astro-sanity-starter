// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Internal page links always end in a slash.
//
// Astro is configured with `trailingSlash: 'always'`, so every page lives at
// `/about/` (canonical tags and the sitemap say so too). A link written as
// `/about` is answered with a 307 to `/about/`, and Google reports those as
// "Page with redirect". Every internal link therefore goes through this
// helper, or is written with the slash.
//
// Left untouched: external URLs, protocol-relative URLs, `#anchors`,
// `mailto:`/`tel:`, paths whose last segment has a file extension (.pdf,
// .xml, .png), and the embedded Studio (`/studio`) and API routes (`/api`).
// A `?query` or `#hash` keeps its place, with the slash before it.

const SKIP_PREFIX = /^\/(studio|api)(\/|$|\?|#)/;

/** Return `href` with a trailing slash on its path when it is an internal page link. */
export function withTrailingSlash(href: string): string;
export function withTrailingSlash(href: string | null | undefined): string | undefined;
export function withTrailingSlash(href: string | null | undefined): string | undefined {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//'))
    return href ?? undefined;
  if (SKIP_PREFIX.test(href)) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? '' : href.slice(cut);
  if (path.endsWith('/')) return href;
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (last.includes('.')) return href;
  return `${path}/${rest}`;
}
