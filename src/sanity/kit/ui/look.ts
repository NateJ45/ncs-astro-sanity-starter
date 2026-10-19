// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The resolved look for this site (PORTS.md card 128)
// =============================================================================
// brand/brand.config.json `studio.look` (the site's devices: marker, stone,
// connector, motif, texture, lettering, motion) over the Studio colours
// studioTheme.ts already settled. The maths and the contrast guards are in
// src/lib/studio-look.ts (tested); this file only joins it to the brand file.
// =============================================================================

import brand from '../../../../brand/brand.config.json';
import { lookBase, lookInput, resolveLook, type ResolvedLook } from '../../../lib/studio-look';
import { STUDIO_COLORS } from '../../studioTheme';

export const LOOK: ResolvedLook = resolveLook(lookInput(brand), lookBase(STUDIO_COLORS, brand));

/** Large surfaces (banners, cards, callouts): the brand radius, scaled up as the site's frames are. */
export const SURFACE_RADIUS = (() => {
  const r = String((brand as { radius?: unknown }).radius ?? '0.5rem');
  const px = r.endsWith('rem') ? parseFloat(r) * 16 : parseFloat(r);
  return Number.isFinite(px) ? Math.round(Math.min(24, Math.max(6, px * 1.6))) : 12;
})();
