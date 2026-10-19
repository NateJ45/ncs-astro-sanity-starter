// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// lightbox - the pure half of the photo viewer (src/components/Lightbox.astro)
// =============================================================================
// The viewer is a native <dialog> driven by a small script; this file holds the
// decisions that script makes, with no DOM, so node --test can pin them:
//
//   stepIndex     which photo is next or previous, wrapping at the ends
//   swipeStep     whether a finger drag was a swipe, and which way
//   counterLabel  "3 of 8", read out by the live region on every change
//   trapStep      where Tab goes inside the open viewer (the focus trap)
//   viewerSources the full-size URL and srcset ladder, from a URL builder
//
// No dependency: the URL builder is passed in, so this file works with any
// repo's urlFor() and never imports the Sanity client into the browser.
// =============================================================================

/** The photo `delta` steps away from `current`, wrapping around both ends. */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}

/**
 * Read a drag as a swipe. Returns +1 for "next" (finger moved left), -1 for
 * "previous" (finger moved right), 0 for anything else: too short, or more
 * vertical than horizontal (a scroll or a pinch, not a swipe).
 */
export function swipeStep(dx: number, dy: number, threshold = 48): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold) return 0;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** The position line under a photo. Empty for a single photo, which needs none. */
export function counterLabel(index: number, length: number): string {
  return length > 1 ? `${index + 1} of ${length}` : '';
}

/**
 * Where Tab (or Shift+Tab) lands among the viewer's controls. `current` is the
 * index of the focused control, or -1 when focus is somewhere else inside the
 * dialog (the photo itself), in which case Tab goes to the first control and
 * Shift+Tab to the last. Wraps at both ends, which is the trap.
 */
export function trapStep(current: number, length: number, backwards: boolean): number {
  if (length <= 0) return -1;
  if (current < 0) return backwards ? length - 1 : 0;
  return stepIndex(current, backwards ? -1 : 1, length);
}

/** The widths the viewer asks for. 2400 covers a 1200px-wide screen at 2x. */
export const VIEWER_WIDTHS = [800, 1200, 1600, 2000, 2400] as const;

export interface ViewerSources {
  href: string;
  srcset: string;
}

/**
 * The full-size photo for the viewer, and its srcset.
 *
 * `build(width)` returns the CDN URL for the WHOLE photo at that width (for a
 * Sanity image: `urlFor(img).width(w).fit('max').auto('format')`, which keeps
 * the editor's crop and never cuts into it, so the subject the hotspot marks is
 * always in frame). Widths above the photo's own width are dropped, since the
 * CDN would only upscale them.
 */
export function viewerSources(
  build: (width: number) => string,
  intrinsicWidth?: number,
): ViewerSources {
  const cap = intrinsicWidth && intrinsicWidth > 0 ? intrinsicWidth : Infinity;
  const widths = VIEWER_WIDTHS.filter((w) => w <= cap);
  const ladder = widths.length > 0 ? widths : [Math.min(VIEWER_WIDTHS[0], cap)];
  const top = ladder[ladder.length - 1];
  return {
    // The JS-off link opens the largest useful size, up to 2000 wide.
    href: build(Math.min(top, 2000)),
    srcset: ladder.map((w) => `${build(w)} ${w}w`).join(', '),
  };
}
