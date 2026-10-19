// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio's splash and offline page, the pure half (PORTS.md card 132)
// =============================================================================
// /studio (while the Studio's code loads) and /studio/offline/ (the service
// worker's no-connection page) share one partial,
// src/components/studio/StudioSplash.astro. Everything it decides without a
// renderer is here, so node --test holds it (studio-splash.test.ts):
//
//   - splashPath(): a short stone path in the site's own look (brand.config.json
//     `studio.look`): its stone shape, its mark colours (contrast-guarded by
//     resolveLook for both schemes), its connector, seeded so the path is the
//     same on every build. Laid along a gentle line, it reads as progress.
//   - splashName(): the site's name, with its last word set in the site's
//     lettering when the look has one; each letter's colour cycles through the
//     lettering colours that read on the page (3:1, large text), falling back
//     to the stone colours, so a lettering made for a dark banner still reads
//     on the light paper.
//
// No site code: a site changes all of this from `studio.look` alone. With no
// look block (the starter) it is a neutral path of round stones in the accent.
// =============================================================================

import type { ConnectorKind, ResolvedLook } from './studio-look.ts';
import { stonePath } from './studio-look.ts';
import { colorLetters, fontFaceCss, letteringStack, readableColors } from './studio-banner.ts';

export interface SplashStone {
  /** The outline, in the stone's own w x h box. */
  d: string;
  x: number;
  y: number;
  w: number;
  h: number;
  light: string;
  dark: string;
}

export interface SplashPath {
  width: number;
  height: number;
  stones: SplashStone[];
  /** One connector segment between each pair of stones (path data, viewBox units). */
  links: string[];
  connector: ConnectorKind;
  connectorLight: string;
  connectorDark: string;
}

/** A small seeded random source (same idea as studio-look's lcg), so builds are stable. */
function seeded(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * The path: `count` stones along a gentle wave, each in the look's shape and
 * the next mark colour, with a connector segment from each stone to the next.
 */
export function splashPath(look: ResolvedLook, count = 5): SplashPath {
  const n = Math.max(2, Math.min(8, Math.round(count)));
  const r = seeded(17);
  const gap = 62;
  const pad = 26;
  const height = 72;
  const width = pad * 2 + gap * (n - 1);
  const mid = height / 2;
  const stones: SplashStone[] = [];
  for (let i = 0; i < n; i++) {
    // Pebbles vary in size, like laid stones; the drawn shapes stay even.
    const vary = look.stone === 'pebble' ? 0.86 + r() * 0.22 : 1;
    const w = Math.round(40 * vary);
    const h = Math.round((look.stone === 'pebble' ? 30 : 34) * vary);
    const cx = pad + i * gap;
    const cy = mid + Math.sin(i * 1.15 + 0.4) * 9;
    const k = i % look.light.stones.length;
    stones.push({
      d: stonePath(look.stone, i + 1, w, h),
      x: +(cx - w / 2).toFixed(1),
      y: +(cy - h / 2).toFixed(1),
      w,
      h,
      light: look.light.stones[k].fill,
      dark: look.dark.stones[k % look.dark.stones.length].fill,
    });
  }
  const links: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = stones[i];
    const b = stones[i + 1];
    const x1 = a.x + a.w - 2;
    const y1 = a.y + a.h / 2;
    const x2 = b.x + 2;
    const y2 = b.y + b.h / 2;
    // A slight sag between stones, so the line is walked, not ruled.
    const qx = (x1 + x2) / 2;
    const qy = (y1 + y2) / 2 + 5;
    links.push(
      `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    );
  }
  return {
    width,
    height,
    stones,
    links,
    connector: look.connector,
    connectorLight: look.light.connector,
    connectorDark: look.dark.connector,
  };
}

/** The connector's stroke for each kind (decorative, aria-hidden). */
export function connectorStroke(kind: ConnectorKind): {
  width: number;
  dash: string | null;
  cap: 'round' | 'butt';
} {
  if (kind === 'dashes') return { width: 3, dash: '6 6', cap: 'butt' };
  if (kind === 'dots') return { width: 3.5, dash: '0 8', cap: 'round' };
  return { width: 2, dash: null, cap: 'round' };
}

export interface SplashLetter {
  char: string;
  light: string | null;
  dark: string | null;
}

export interface SplashName {
  before: string;
  /** Empty when the look has no lettering: the whole name is in `before`. */
  lettered: SplashLetter[];
  after: string;
  /** The lettering's @font-face rule (its file is in public/), or null. */
  face: string | null;
  /** The lettering's font stack, ending in the display font. */
  stack: string;
}

/**
 * The name with its last word in the site's lettering (when the look has
 * one). Colours per letter for each scheme: the lettering colours that read on
 * that page at 3:1 (the name is large text), else the stone colours.
 */
export function splashName(name: string, look: ResolvedLook, displayStack: string): SplashName {
  const l = look.lettering;
  const face = l ? fontFaceCss(l.family, l.src) : null;
  if (!l || !face)
    return { before: name, lettered: [], after: '', face: null, stack: displayStack };
  const trimmed = name.trimEnd();
  const at = trimmed.lastIndexOf(' ') + 1;
  const word = trimmed.slice(at);
  const pick = (paper: string, stones: { fill: string }[]) => {
    const own = readableColors(l.colors, paper);
    return own.length ? own : stones.map((s) => s.fill);
  };
  const lightLetters = colorLetters(word, pick(look.light.paper, look.light.stones));
  const darkLetters = colorLetters(word, pick(look.dark.paper, look.dark.stones));
  return {
    before: trimmed.slice(0, at),
    lettered: lightLetters.map((x, i) => ({
      char: x.char,
      light: x.color,
      dark: darkLetters[i]?.color ?? null,
    })),
    after: name.slice(trimmed.length),
    face,
    stack: letteringStack(l.family, displayStack),
  };
}
