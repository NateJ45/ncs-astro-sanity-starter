// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 168)
// The guard rails on the logo and icon a person can upload in Site settings. Pure,
// so the Studio validation (src/sanity/schemaTypes/siteSettings.ts) and the unit tests
// (brand-uploads.test.ts) share one set of rules.
//
// Sanity writes an image's size into its asset id: image-<hash>-<width>x<height>-<ext>. That is
// read here so the check runs as soon as the file is chosen, with no extra request. An SVG's
// numbers are its drawing size, not pixels, so the size rules skip SVG (it is sharp at any size).

export interface AssetDims {
  width: number;
  height: number;
  ext: string;
}

/** Read width, height and file type from an image asset id. Null when it is not one. */
export function assetDims(ref: unknown): AssetDims | null {
  const m = /^image-[a-zA-Z0-9]+-(\d+)x(\d+)-([a-z0-9]+)$/.exec(String(ref ?? ''));
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]), ext: m[3] };
}

type ImageValue = { asset?: { _ref?: string } } | null | undefined;

/** The smallest a logo may be (pixels wide): the header draws it 280px wide, twice that on phones. */
export const LOGO_MIN_WIDTH = 400;
export const LOGO_GOOD_WIDTH = 560;
/** The icon: 512 is the largest size it is drawn at (install prompts, the Studio app). */
export const ICON_MIN = 512;
/** How far from square an icon may be before it is refused (2%: a pixel or two of trim). */
export const ICON_SQUARE_TOLERANCE = 0.02;

export interface UploadCheck {
  /** Blocks publishing. */
  error?: string;
  /** Shown in yellow; publishing still works. */
  warning?: string;
}

/** The header logo: wide enough to stay sharp, and shaped like a lockup rather than a square. */
export function checkLogo(value: ImageValue): UploadCheck {
  const d = assetDims(value?.asset?._ref);
  if (!d) return {};
  if (d.ext === 'svg') return {};
  if (d.width < LOGO_MIN_WIDTH) {
    return {
      error: `This logo is ${d.width} pixels wide, which would look blurry. Please upload one at least ${LOGO_GOOD_WIDTH} pixels wide (an SVG is best).`,
    };
  }
  if (d.width < LOGO_GOOD_WIDTH) {
    return {
      warning: `This logo is ${d.width} pixels wide. It will work, but ${LOGO_GOOD_WIDTH} or wider stays sharper on phones.`,
    };
  }
  if (d.width / d.height < 1.5) {
    return {
      warning:
        'This looks more square than a logo usually is. The header has room for a wide logo (a mark with the name beside it). A square picture belongs in "Square icon" below.',
    };
  }
  return {};
}

/** The square icon: square, and at least 512 pixels so the home-screen and app icons stay sharp. */
export function checkIcon(value: ImageValue): UploadCheck {
  const d = assetDims(value?.asset?._ref);
  if (!d) return {};
  const off = Math.abs(d.width - d.height) / Math.max(d.width, d.height);
  if (off > ICON_SQUARE_TOLERANCE) {
    return {
      error: `The icon must be square (the same width and height). This one is ${d.width} by ${d.height}. Crop it to a square and upload it again.`,
    };
  }
  if (d.ext !== 'svg' && d.width < ICON_MIN) {
    return {
      error: `This icon is ${d.width} pixels across. Please upload one at least ${ICON_MIN} by ${ICON_MIN} pixels so it stays sharp on phones.`,
    };
  }
  return {};
}
