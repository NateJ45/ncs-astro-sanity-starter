// Safe to edit by hand
// =============================================================================
// This site's own icon art for the Studio (PORTS.md card 119)
// =============================================================================
// NOT PORTABLE: every fork rewrites it. The registry in src/sanity/brandIcons.tsx
// draws every meaning with @sanity/icons; any meaning listed here is drawn with
// the site's art instead, everywhere the Studio uses it (type icons, list-row
// tiles, the desk, field groups, templates, the phone sidebar's tools).
//
// Keep the art as the brand kit drew it. Point artIcon() at the kit's SVG file
// (Vite's `?url` import, so the file is fetched once and cached):
//
//   import bible from '../assets/brand/icon-bible.svg?url';
//   import { artIcon } from './artIcon';
//   export const BRAND_ICON_ART = { scripture: artIcon(bible, 'Bible') };
//
// or hand over a React component shaped like @sanity/icons (an <svg width="1em"
// height="1em" data-sanity-icon> using currentColor). Which document type,
// field group or tool means what lives in brand/brand.config.json
// `studio.icons`. Check every icon at 16, 20 and 24px in light AND dark.
// =============================================================================

import type { BrandIconKey } from '../lib/studio-icons';
import type { BrandIcon } from './artIcon';

/** The starter has no art of its own: every meaning uses @sanity/icons. */
export const BRAND_ICON_ART: Partial<Record<BrandIconKey, BrandIcon>> = {};
