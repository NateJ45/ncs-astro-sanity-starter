// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand
// =============================================================================
// The Studio's own name and mark (PORTS.md card 110)
// =============================================================================
// Replaces StudioLogo.tsx, which was registered as `studio.components.logo`.
// Sanity marks that prop "@deprecated Custom logo components are no longer
// supported" and never renders it, so every fork opened on Sanity's mark and
// "My Studio". The supported route is the workspace `icon` and `title` in
// defineConfig, which sanity.config.ts now fills from brand/brand.config.json.
//
// THE MARK IS public/favicon.svg, the one drawing the whole icon set is made
// from (scripts/generate-favicons.mjs). It is already drawn to read at 16px and
// carries its own dark-mode colours, so the Studio corner, the Studio tab and
// the site's tab all show the same thing and cannot drift. A reskin redraws
// favicon.svg; `npm run apply-brand` warns when the brand name has changed but
// favicon.svg is still the starter's.
// =============================================================================

const MARK_HREF = '/favicon.svg';

/** Workspace icon: the site's mark, filling whatever box the navbar gives it. */
export function StudioIcon() {
  return (
    <img
      src={MARK_HREF}
      alt=""
      aria-hidden
      draggable={false}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}

/**
 * Point the browser tab at the site's mark. @sanity/astro's /studio page
 * hard-codes Sanity's logo as a data: URI in its <head>, and that file lives in
 * node_modules, so the swap happens here, once, when the config module loads
 * in the browser (before the login screen draws). It names the tab too. The sanity CLI also loads
 * this module, in Node, where there is no document and this does nothing.
 */
export function applySiteFavicon(siteName?: string): void {
  if (typeof document === 'undefined') return;
  // The login screen keeps the page's own <title> ("Sanity Studio"); once
  // signed in, the Studio sets its own titles from the workspace title.
  if (siteName && document.title === 'Sanity Studio') document.title = siteName;
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    links.push(link);
    document.head.appendChild(link);
  }
  for (const link of links) {
    link.type = 'image/svg+xml';
    link.href = MARK_HREF;
  }
}
