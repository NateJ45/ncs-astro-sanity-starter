// Safe to edit by hand
// =============================================================================
// The Studio's edges for this site: wordmark, sign-in line, wording, splash
// (PORTS.md card 120)
// =============================================================================
// The ONE site-specific file for the branded edges of the embedded Studio. NOT
// marked PORTABLE: every fork rewrites it. The machinery is PORTABLE:
// src/pages/studio/index.astro (the page and its splash), src/lib/studio-route.ts,
// src/sanity/studioWording.ts and the navbar wordmark in StudioLook.tsx.
// Detail: docs/agent/studio-kit.md ("The Studio's edges").
//
// Everything here is optional; leave a value out and the starter's neutral
// default (built from brand.config.json `name`) applies.
// =============================================================================

import type { StudioWordingInput } from './studioWording';

export interface StudioEdgesConfig extends StudioWordingInput {
  wordmark: {
    /** Which brand.config.json `logoPaths` entry the navy top bar shows ('dark' is the reversed one). null hides it. */
    logo: 'dark' | 'light' | null;
    /**
     * Optional crop of an SVG logo, "x,y,width,height" in the file's own
     * viewBox units, so a lockup can show its words only (the square mark is
     * already the Studio's icon right beside it).
     */
    view?: string | null;
  };
}

export const studioEdges: StudioEdgesConfig = {
  // The starter's lockup is a disc then the name; the crop keeps the name.
  wordmark: { logo: 'dark', view: '64,4,200,44' },
  // Under the site's name on the sign-in card.
  // loginSubtitle: 'Sign in to edit the website',
  // Any Studio text key Sanity translates (see studioWording.ts STUDIO_WORDS).
  // words: { 'user-menu.action.invite-members': 'Invite someone to edit' },
};
