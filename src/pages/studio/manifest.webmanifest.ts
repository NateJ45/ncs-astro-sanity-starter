// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /studio/manifest.webmanifest: the Studio as a phone app (PORTS.md card 125)
// =============================================================================
// Built once at build time from the brand and the Studio's own colours, so a
// rebrand carries it. The shape and the reasons are in src/lib/studio-app.ts;
// the site's choices (short name, start page) in src/sanity/studioEdges.config.ts.
// Linked from the boot page only (src/pages/studio/index.astro).
// =============================================================================
import type { APIRoute } from 'astro';
import brand from '../../../brand/brand.config.json';
import { STUDIO_COLORS } from '../../sanity/studioTheme';
import { studioEdges } from '../../sanity/studioEdges.config';
import { studioManifest } from '../../lib/studio-app';

export const prerender = true;

export const GET: APIRoute = () => {
  const manifest = studioManifest({
    name: brand.name,
    shortName: studioEdges.app?.shortName,
    themeColor: STUDIO_COLORS.chrome.bg,
    backgroundColor: STUDIO_COLORS.white,
    start: studioEdges.app?.start,
  });
  return new Response(JSON.stringify(manifest, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
