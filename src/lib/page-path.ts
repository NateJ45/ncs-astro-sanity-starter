// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// page-path: the public address of the page being rendered (PORTS.md card 187)
// =============================================================================
// The draft preview renders the same components as the live site, but at
// `/preview/...`: Home is `/preview/`, About is `/preview/about/`. Anything that
// looks a page up BY ITS ADDRESS (a per-page note, a "this is Home" check, a
// "leave the page you are on out of the list" row) finds nothing there, so the
// preview quietly draws a different page. Every such lookup goes through
// `publicPath()`, which is the identity on live pages.
// =============================================================================

/**
 * The live-site path for a rendered path: the `/preview` prefix removed and a
 * trailing slash ensured. `/preview` and `/preview/` are Home (`/`).
 */
export function publicPath(pathname: string): string {
  let path = pathname.replace(/^\/preview(?=\/|$)/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  return path.endsWith('/') ? path : `${path}/`;
}
