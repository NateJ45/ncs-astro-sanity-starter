// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Client notes: the pure rules (PORTS.md card 195)
// =============================================================================
// Before launch a site can show its client a review layer: a "notes" pill on
// every page, yellow highlighting of "[Client: ...]" and "[Placeholder: ...]"
// wording, and "Photo needed" boxes over stand-in pictures. It is a preview
// aid and must NEVER reach a real visitor. Two rules keep it that way, both
// here so a test can pin them:
//
//   1. The switch (CLIENT_NOTES_ON in src/data/client-notes.ts) ships OFF.
//   2. Even when it is ON, the layer only draws on a pre-launch address
//      (localhost, *.workers.dev, *.pages.dev, *.test, example.com). The day
//      src/data/site.ts moves to the real domain, the layer goes quiet on its
//      own, and client-notes.test.ts turns RED so the leftover switch is
//      noticed and removed. deploy.yml runs the unit tests first, so a
//      production deploy cannot go out with it on.
// =============================================================================

/** Hosts that are never a real visitor's address. A subdomain of one counts too. */
const PRE_LAUNCH_HOSTS = ['localhost', 'workers.dev', 'pages.dev', 'example.com', 'test'];

/** True when the URL's host is a pre-launch address (see above), false for a real domain. */
export function isPreLaunchUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === '127.0.0.1' || host === '[::1]') return true;
  return PRE_LAUNCH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Whether the review layer draws: the switch is on AND the site is on a pre-launch address. */
export function clientNotesActive(on: boolean, siteUrl: string): boolean {
  return on && isPreLaunchUrl(siteUrl);
}

/**
 * The problem to report when the switch is on but the site URL is a real domain, or null when
 * all is well. client-notes.test.ts fails on a non-null result.
 */
export function clientNotesProblem(on: boolean, siteUrl: string): string | null {
  if (!on || isPreLaunchUrl(siteUrl)) return null;
  return `CLIENT_NOTES_ON is true but the site URL is ${siteUrl}, a live address. Set CLIENT_NOTES_ON to false in src/data/client-notes.ts before launch.`;
}

/**
 * The live-site path for a rendered path: the `/preview` prefix of the draft preview removed and
 * a trailing slash ensured. `/preview` and `/preview/` are Home (`/`). Notes and shots are
 * looked up by this, so the preview finds the same ones as the live page.
 */
export function livePagePath(pathname: string): string {
  let path = pathname.replace(/^\/preview(?=\/|$)/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * The regular expression source for placeholder markers: "[Client: ...]" for the name "Client".
 * Names are plain words; anything else is dropped so a typo cannot break the pattern.
 */
export function markerPattern(names: readonly string[]): string {
  const safe = names.filter((n) => /^[A-Za-z][A-Za-z ]*$/.test(n));
  return `\\[(?:${safe.join('|')})\\b[^\\]\\n]*\\]`;
}
