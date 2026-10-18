// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio as a phone app: its manifest and its paths (PORTS.md card 124)
// =============================================================================
// /studio installs to a phone's home screen like an app: its own icon, no
// browser bars, opening straight on Home or Quick update. Three pieces:
//
//   - /studio/manifest.webmanifest (src/pages/studio/manifest.webmanifest.ts),
//     built from studioManifest() below: the site's name, its icons, the
//     Studio's navy and paper, scope /studio/ so the public website never
//     installs as part of it. The public site keeps its own /site.webmanifest
//     (display: browser, generate-favicons.mjs); the two never mix.
//   - /studio/sw.js (public/studio/sw.js), a small service worker scoped to
//     /studio/ that keeps the boot page's static files for a quicker start and
//     shows /studio/offline/ when there is no connection. It never stores a
//     Sanity API answer, a login or anything from /api/.
//   - the boot page (src/pages/studio/index.astro) links the manifest and
//     registers the worker. Nothing else on the site does.
//
// Pure and free of Astro imports, so src/lib/studio-app.test.ts can check the
// manifest in bare Node.
// =============================================================================

/** Everything the Studio app owns lives under here. */
export const STUDIO_SCOPE = '/studio/';
export const STUDIO_MANIFEST_PATH = '/studio/manifest.webmanifest';
export const STUDIO_SW_PATH = '/studio/sw.js';
export const STUDIO_OFFLINE_PATH = '/studio/offline/';

/** Where the app opens: Home, or straight on the Quick update tool. */
export type StudioStart = 'home' | 'quick-update';

export interface StudioAppInput {
  /** The site's name (brand.config.json `name`). */
  name: string;
  /** Under the icon on the home screen. About 12 characters fits every phone. */
  shortName?: string;
  /** The navy top bar (STUDIO_COLORS.chrome.bg): the phone's status bar. */
  themeColor: string;
  /** The Studio's paper (STUDIO_COLORS.white): the ground while it opens. */
  backgroundColor: string;
  start?: StudioStart;
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: 'any' | 'maskable';
}

export interface StudioManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  scope: string;
  display: 'standalone';
  background_color: string;
  theme_color: string;
  icons: ManifestIcon[];
}

/**
 * The icons, from the files generate-favicons.mjs writes into public/. The
 * maskable one has the mark inside the middle of the square, so Android can
 * cut it to a circle or a squircle without losing an edge of it.
 */
export const STUDIO_ICONS: ManifestIcon[] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** The address the app opens on. Hash routes: the Studio uses hash history. */
export function studioStartUrl(start: StudioStart = 'home'): string {
  return start === 'quick-update' ? `${STUDIO_SCOPE}#/quick-update` : STUDIO_SCOPE;
}

/** The manifest for /studio/manifest.webmanifest. */
export function studioManifest(input: StudioAppInput): StudioManifest {
  const name = input.name.trim() || 'Website editor';
  return {
    // A fixed id, so a later change of start page or name updates the
    // installed app instead of offering a second one.
    id: STUDIO_SCOPE,
    name,
    short_name: (input.shortName ?? name).trim() || name,
    description: `Edit the ${name} website.`,
    lang: 'en',
    start_url: studioStartUrl(input.start),
    scope: STUDIO_SCOPE,
    display: 'standalone',
    background_color: input.backgroundColor,
    theme_color: input.themeColor,
    icons: STUDIO_ICONS,
  };
}
