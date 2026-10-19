// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Home's banner styles, as five family sites set them by hand (PORTS.md card 135)
// =============================================================================
// Each entry is what that site's own CSS file did to the banner before card 135,
// written as the style slot (kitConfig.homeBanner.style). They are the test's
// proof that the slot covers what the sites really do (studio-banner-style.test.ts
// resolves every one with no ignored value) and the kit bench's pictures
// (/kit-harness/guide/?view=banner&look=<key>). They are also the migration
// recipe: a site copies its entry into kit.config.ts and deletes its CSS rules.
// `ground` is a stand-in for the site's navbar colour, for the contrast guards.
// =============================================================================

import type { HomeBannerStyle } from '../../../lib/studio-banner-style.ts';

export interface BannerLook {
  ground: string;
  style: HomeBannerStyle;
}

const SOFIA = "'Sofia Sans Semi Condensed Variable', system-ui, sans-serif";
const STAATLICHES = "'Staatliches', 'Arial Narrow', system-ui, sans-serif";

export const BANNER_LOOKS: Record<string, BannerLook> = {
  // fbcm: studioHomeBanner.css (eyebrow with a gold hairline, italic greeting, square gold
  // plate with a standing ring, the rendering behind the words).
  fbcm: {
    ground: '#1c1b3a',
    style: {
      background: { rule: '#d59b29' },
      eyebrow: {
        font: SOFIA,
        size: '13px',
        weight: 600,
        tracking: '0.14em',
        case: 'upper',
        color: '#f4efe6',
        mark: { kind: 'rule', color: '#d59b29' },
      },
      greeting: { font: "'Castoro', Georgia, serif", italic: true, weight: 400 },
      chip: {
        shape: 'square',
        bg: '#d59b29',
        fg: '#1c1b3a',
        hoverBg: '#e2ae4a',
        halo: '#d59b29',
        ring: '#f4efe6',
        font: SOFIA,
        size: '14px',
        weight: 600,
        tracking: '0.14em',
        case: 'upper',
      },
      motif: { place: 'behind-right' },
    },
  },
  // presacademy: studioLook.css rule 3 (the pill in brass on the green band).
  presacademy: {
    ground: '#1f3a2c',
    style: {
      chip: {
        shape: 'pill',
        bg: '#c7a875',
        fg: '#222a25',
        hoverBg: '#d9c79f',
        size: '13px',
        weight: 700,
        tracking: '0.1em',
        case: 'upper',
      },
    },
  },
  // reid-design-site: studioArt.css part 2 (the sample tag: notch and punched hole).
  reid: {
    ground: '#3a2e28',
    style: {
      chip: { shape: 'tag', bg: '#f5ede3', fg: '#231e1b', hoverBg: '#fffdfa' },
    },
  },
  // mas-monograms: studioArt.css (the paper patch with a running stitch, gold thread on hover).
  mas: {
    ground: '#0f1b2d',
    style: {
      chip: {
        shape: 'stitched',
        bg: '#fbf8f1',
        fg: '#26312e',
        hoverBg: '#f0d58a',
        hoverFg: '#0f1b2d',
        edge: '#0f1b2d',
        ring: '#f0d58a',
        size: '0.8125rem',
        weight: 700,
        tracking: '0.2em',
        case: 'upper',
      },
    },
  },
  // stonesteps-50k: studioArt.css (poster title with its echo and outlined K, mono eyebrow with
  // a blaze dot, the stamp, the plate button).
  stonesteps: {
    ground: '#1e3a2a',
    style: {
      eyebrow: {
        font: "'JetBrains Mono Variable', ui-monospace, monospace",
        size: '0.75rem',
        weight: 600,
        tracking: '0.22em',
        case: 'upper',
        color: '#fed89b',
        mark: { kind: 'dot', color: '#fed89b' },
      },
      title: {
        font: STAATLICHES,
        weight: 400,
        size: 'clamp(2.6rem, 2.2rem + 2.6vw, 4.6rem)',
        leading: 0.92,
        tracking: '0.01em',
        case: 'upper',
        color: '#ffebbb',
        echo: { color: '#a83c26' },
        lastLetterOutline: '#fed89b',
      },
      chip: {
        shape: 'plate',
        bg: '#a83c26',
        fg: '#ffebbb',
        hoverBg: '#8f3323',
        edge: '#000000',
        ring: '#fed89b',
        font: STAATLICHES,
        size: '1.2rem',
        weight: 400,
        tracking: '0.08em',
        case: 'upper',
      },
      stamp: {
        text: "Cincinnati's longest running ultra marathon",
        color: '#fed89b',
        font: STAATLICHES,
      },
    },
  },
};
