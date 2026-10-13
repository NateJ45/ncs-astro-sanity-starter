// Width ladder for the srcset that SanityImage.astro writes. Pure functions, no
// imports, so `node --test` can exercise them without Astro or a DOM.
//
// Why a ladder with small steps: the first step used to be 400w, so a 112px
// course thumbnail on a DPR 1 screen downloaded a 400w file (about 3.5x the
// pixels it paints, 1.4 to 2x the bytes once format and compression are
// counted). The browser picks the SMALLEST candidate that is at least as wide as
// the slot times the device pixel ratio, so adding steps below 400 changes the
// pick for small slots only. A slot that needed 400w or more picks the same file
// it always did. The 700 step closes the mobile-retina gap (DPR 1.875 needs about
// 713 effective px); 900 and 1200 cover laptops, 1600 and 2400 retina screens.

/** Every width the ladder can contain, ascending. 400 and up are the original ladder. */
export const LADDER_STEPS = [160, 240, 320, 400, 600, 700, 800, 900, 1200, 1600, 2400];

/** Narrowest viewport a `vw` length is assumed to meet (a small phone). */
export const NARROWEST_VIEWPORT = 320;

/** Pixels per rem or em, at the browser default font size. */
const REM = 16;

/**
 * Steps below this fraction of the smallest rendered slot are dropped. A step
 * under the slot is never picked at device pixel ratio 1 or more, so it is dead
 * weight in the markup; 0.75 leaves slack for a slot that renders a little
 * smaller than `sizes` claims.
 */
export const DROP_BELOW = 0.75;

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * The smallest width, in CSS pixels, any entry of a `sizes` attribute can
 * render the image at, or null when it cannot be known. Handles `px` and `vw`
 * (and rem/em at 16px) lengths with optional media conditions. A `min-width` condition raises the
 * viewport that entry is evaluated at; everything else is evaluated at the
 * narrowest viewport. Anything else (calc, min, max, clamp, %, an
 * unparseable entry) returns null so the caller keeps the full ladder.
 */
export function smallestRenderedWidth(sizes: string | undefined | null): number | null {
  if (!sizes || !sizes.trim()) return null;
  let smallest = Infinity;
  for (const entry of splitTopLevel(sizes)) {
    // The length is the last whitespace-separated token outside parentheses.
    const m = entry.match(/^(?:(.*\))\s+)?(-?\d*\.?\d+)(px|vw|rem|em)$/i);
    if (!m) return null;
    const condition = m[1] ?? '';
    const value = Number(m[2]);
    if (!(value > 0)) return null;
    let px: number;
    const unit = m[3].toLowerCase();
    if (unit === 'px') {
      px = value;
    } else if (unit === 'rem' || unit === 'em') {
      // Browser default font size; a visitor who shrinks it renders the slot
      // smaller than this, which the DROP_BELOW slack absorbs.
      px = value * REM;
    } else {
      const minWidth = condition.match(/min-width\s*:\s*(\d*\.?\d+)px/i);
      const viewport = Math.max(NARROWEST_VIEWPORT, minWidth ? Number(minWidth[1]) : 0);
      px = (value * viewport) / 100;
    }
    smallest = Math.min(smallest, px);
  }
  return Number.isFinite(smallest) ? smallest : null;
}

/**
 * The widths to put in a srcset for an image whose largest rendering is `width`.
 * Every ladder step up to `width`, plus `width` itself as the last (and so the
 * `src`) candidate. When `sizes` is known, steps well below its smallest slot
 * are dropped; the last width is always kept, so the result is never empty.
 */
export function buildLadder(width: number, sizes?: string | null): number[] {
  const widths = LADDER_STEPS.filter((w) => w <= width);
  if (widths[widths.length - 1] !== width) widths.push(width);
  const smallest = smallestRenderedWidth(sizes);
  if (smallest === null) return widths;
  const floor = smallest * DROP_BELOW;
  const last = widths[widths.length - 1];
  return widths.filter((w) => w >= floor || w === last);
}
