// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Studio's own design language: the pure half (PORTS.md card 128)
// =============================================================================
// The kit's shared primitives (src/sanity/kit/ui/) draw a site's own devices
// inside the Studio: its section marker, its stone (or token) shape, the
// connector between numbered steps, its motif strip, its lettering, its
// texture, its colour edge and the way things arrive (its motion verb). Every
// family site has to differ in FORM, not only in colour, so these are named in
// brand/brand.config.json `studio.look`; the starter's defaults are neutral (a
// dot marker, round tokens, a plain line, no texture, no lettering).
//
// This file holds everything that needs no React, so node --test can hold it:
//   - resolveLook(): the brand's look plus the Studio colours -> light and dark
//     tokens, with every text and marker colour guarded for contrast (AA text,
//     3:1 for markers and other non-text marks) and nudged when it fails;
//   - pebblePath() / stoneRadius(): the hand-laid stone shapes, seeded so a
//     stone looks the same on every render;
//   - guideMeaning(): a guide's `icon` name -> a meaning in the icon registry;
//   - inlineParts(): the guide text marks (**bold**, `button`, _aside_);
//   - chipKind(): which real Studio button a `button` name is drawn as;
//   - shotMarks(): GuideShot annotations, checked and clamped.
//   - resolveShot(): a guide's shot block by key into the site's registry (card 130).
// studio-look.test.ts is the gate, including a contrast check on every token.
// =============================================================================

import { AA_BODY_TEXT, AA_NON_TEXT, contrastRatio } from './contrast.ts';
import { isHex, mix } from './studio-theme.ts';
import { isBrandIconKey, type BrandIconKey } from './studio-icons.ts';

// -----------------------------------------------------------------------------
// The look, as brand.config.json says it
// -----------------------------------------------------------------------------

/** A marker drawn from a file in public/ (the site's own art), at its own size. */
export interface MarkerArt {
  src: string;
  width: number;
  height: number;
}

export type MarkerKind = 'dot' | 'steps' | 'rule' | 'diamond';
export type StoneShape = 'pebble' | 'round' | 'square' | 'lozenge';
export type ConnectorKind = 'dashes' | 'dots' | 'line' | 'none';
export type MotionVerb = 'lay' | 'draw' | 'none';

/** brand.config.json `studio.look`. Every key optional. */
export interface StudioLookInput {
  /** The section marker: a built-in device or the site's art. Default 'dot'. */
  marker?: MarkerKind | MarkerArt;
  /** The marker's colour for the built-in devices. Default: the accent. */
  markerColor?: string;
  /** Headings and links, when the site sets them in a colour of their own. Default: the accent. */
  headingColor?: string;
  /** The numbered stones' colours, in order. Default: the accent alone. */
  markColors?: string[];
  /** The stones' shape. Default 'round'. */
  stone?: StoneShape;
  /** What joins numbered steps. Default a plain line in the rule colour. */
  connector?: { kind?: ConnectorKind; color?: string };
  /** The three callout colours (the hue; grounds and text are worked out). */
  tones?: { note?: string; tip?: string; careful?: string };
  /** A decorative strip for a banner's foot (an SVG in public/), and its phone version. */
  motif?: string;
  motifNarrow?: string;
  /** A repeating tile for featured panels (an SVG in public/). */
  texture?: string;
  /** The colours of a ColourEdge, left to right. Default: markColors. */
  edgeColors?: string[];
  /** Banner titles in the site's own display lettering; colours cycle letter by letter. */
  lettering?: { family: string; src: string; colors?: string[] };
  /** How things arrive. 'lay' sets stones down one by one, 'draw' draws the connector. Default 'draw'. */
  motion?: MotionVerb;
}

/** The colours the Studio theme already settled (studioTheme.ts STUDIO_COLORS). */
export interface LookBase {
  /** The light page (palette white, the paper). */
  paper: string;
  /** The dark page (palette black). */
  dark: string;
  /** The navbar's deep colour: banners use it in both schemes. */
  chrome: string;
  /** The accent at a readable step on the paper (accent 500 after the guard). */
  accent: string;
  /** The accent readable on the dark page (accent 400). */
  accentOnDark: string;
  /** Text colours from the brand palette, when it has them. */
  ink?: string | null;
  inkOnDark?: string | null;
  muted?: string | null;
  mutedOnDark?: string | null;
}

export interface ToneTokens {
  /** The callout's ground. */
  bg: string;
  /** Its stone marker's fill: the hue as the brand names it, not darkened. */
  fill: string;
  /** The marker's outline (3:1 on bg), so the fill can stay the true hue. */
  mark: string;
  /** Its title (AA on bg). */
  title: string;
  /** Card 131: the hue as a card's left edge on the raised surface (3:1 on surface). */
  edge: string;
}

export interface SchemeTokens {
  paper: string;
  /** A raised surface (cards). */
  surface: string;
  ink: string;
  muted: string;
  rule: string;
  /** Headings and links. */
  heading: string;
  marker: string;
  connector: string;
  /** Numbered stones, each with the number's colour on it. */
  stones: { fill: string; text: string }[];
  /**
   * Card 132: the stones that read as "good" (indexes into `stones`): every
   * mark colour except one near the careful tone's hue. A finished state (Is it
   * live, all clear) is laid in these, so brick never says "done".
   */
  calm: number[];
  tones: Record<'note' | 'tip' | 'careful' | 'plain', ToneTokens>;
  /** Studio button copies. */
  chip: { bg: string; fg: string; border: string };
  chipTool: { bg: string; fg: string };
  chipPositive: { bg: string; fg: string };
  chipCritical: { bg: string; fg: string };
  focus: string;
}

export interface ResolvedLook {
  marker: MarkerKind | MarkerArt;
  stone: StoneShape;
  connector: ConnectorKind;
  motion: MotionVerb;
  motif?: string;
  motifNarrow?: string;
  texture?: string;
  edgeColors: string[];
  lettering?: { family: string; src: string; colors: string[] };
  /** The banner (always the chrome colour) and the text on it. */
  banner: { bg: string; ink: string; muted: string; accent: string };
  light: SchemeTokens;
  dark: SchemeTokens;
  /** One line per input that was ignored or adjusted. */
  notes: string[];
}

// -----------------------------------------------------------------------------
// Colour helpers
// -----------------------------------------------------------------------------

const hex = (v: unknown): string | null => (isHex(v) ? v.trim().toLowerCase() : null);

/**
 * `fg`, moved toward `toward` (black or white, or any colour) in small steps
 * until it reaches `min` against `bg`. Returns `fg` unchanged when it already
 * passes, and `toward` itself as the last resort.
 */
export function ensure(fg: string, bg: string, min: number, toward?: string): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target =
    toward ?? (contrastRatio('#000000', bg) > contrastRatio('#ffffff', bg) ? '#000000' : '#ffffff');
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(fg, target, Math.min(t, 1));
    if (contrastRatio(c, bg) >= min) return c;
  }
  return target;
}

const LIGHT_INK = '#1f2430';
const DARK_INK = '#eef0f4';

/** Neutral starter hues for the three callouts when the brand names none. */
export const DEFAULT_TONES = { tip: '#b7791f', careful: '#c2410c' };

function tone(hue: string, bg0: string, ink: string, dark: boolean): Omit<ToneTokens, 'edge'> {
  // Light: a clear wash of the hue on white (a wash on a warm paper goes grey).
  const bg = dark ? mix(hue, bg0, 0.8) : mix(hue, '#ffffff', 0.87);
  return {
    bg,
    fill: hue,
    mark: ensure(hue, bg, AA_NON_TEXT, dark ? '#ffffff' : '#000000'),
    title: ensure(hue, bg, AA_BODY_TEXT, dark ? '#ffffff' : ink),
  };
}

function scheme(
  input: StudioLookInput,
  base: LookBase,
  dark: boolean,
  marks: string[],
): SchemeTokens {
  const paper = dark ? base.dark : base.paper;
  const ink = ensure(
    hex(dark ? base.inkOnDark : base.ink) ?? (dark ? DARK_INK : LIGHT_INK),
    paper,
    7,
  );
  const muted = ensure(
    hex(dark ? base.mutedOnDark : base.muted) ?? mix(ink, paper, 0.3),
    paper,
    AA_BODY_TEXT,
  );
  const accent = dark ? base.accentOnDark : base.accent;
  const heading = ensure((dark ? null : hex(input.headingColor)) ?? accent, paper, AA_BODY_TEXT);
  const rule = mix(ink, paper, dark ? 0.78 : 0.84);
  const surface = dark ? mix('#ffffff', paper, 0.94) : mix('#ffffff', paper, 0.35);
  const marker = ensure(hex(input.markerColor) ?? accent, paper, AA_NON_TEXT);
  // Decorative (aria-hidden, and the numbers carry the order), so the site's own
  // colour is kept as it is, as the site draws it: Auburn's gold on white.
  const connector = hex(input.connector?.color) ?? (input.connector?.kind ? marker : rule);
  const stones = marks.map((m) => {
    // Card 131: on the paper AND the raised surface (white cards), so either ground holds 3:1.
    const fill = ensure(
      ensure(m, paper, AA_NON_TEXT),
      surface,
      AA_NON_TEXT,
      dark ? '#ffffff' : '#000000',
    );
    // The number on the stone: white or ink, whichever reads; AA either way.
    const text =
      contrastRatio('#ffffff', fill) >= contrastRatio(LIGHT_INK, fill) ? '#ffffff' : LIGHT_INK;
    return { fill, text: ensure(text, fill, AA_BODY_TEXT) };
  });
  const hues = {
    note: hex(input.tones?.note) ?? accent,
    tip: hex(input.tones?.tip) ?? DEFAULT_TONES.tip,
    careful: hex(input.tones?.careful) ?? DEFAULT_TONES.careful,
  };
  const calm = calmStones(
    stones.map((x) => x.fill),
    hues.careful,
  );
  const edgeOn = (hue: string) => ensure(hue, surface, AA_NON_TEXT, dark ? '#ffffff' : '#000000');
  const tones = {
    note: { ...tone(hues.note, paper, ink, dark), edge: edgeOn(hues.note) },
    tip: { ...tone(hues.tip, paper, ink, dark), edge: edgeOn(hues.tip) },
    careful: { ...tone(hues.careful, paper, ink, dark), edge: edgeOn(hues.careful) },
    plain: {
      bg: surface,
      fill: ensure(muted, surface, AA_NON_TEXT),
      mark: ensure(muted, surface, AA_NON_TEXT),
      title: ink,
      edge: ensure(muted, surface, AA_NON_TEXT),
    },
  };
  const chrome = base.chrome;
  return {
    paper,
    surface,
    ink,
    muted,
    rule,
    heading,
    marker,
    connector,
    stones,
    calm,
    tones,
    chip: dark
      ? { bg: mix('#ffffff', paper, 0.88), fg: ink, border: mix('#ffffff', paper, 0.72) }
      : { bg: '#ffffff', fg: ink, border: mix(ink, '#ffffff', 0.75) },
    chipTool: { bg: chrome, fg: ensure('#ffffff', chrome, AA_BODY_TEXT) },
    // Sanity's own Publish green and Delete red, at a step their white label reads on.
    chipPositive: { bg: ensure('#2d8a57', '#ffffff', AA_BODY_TEXT), fg: '#ffffff' },
    chipCritical: { bg: ensure('#d03c3c', '#ffffff', AA_BODY_TEXT), fg: '#ffffff' },
    focus: ensure(accent, paper, AA_NON_TEXT),
  };
}

const MARKERS: MarkerKind[] = ['dot', 'steps', 'rule', 'diamond'];
const STONES: StoneShape[] = ['pebble', 'round', 'square', 'lozenge'];
const CONNECTORS: ConnectorKind[] = ['dashes', 'dots', 'line', 'none'];
const MOTIONS: MotionVerb[] = ['lay', 'draw', 'none'];

const isPublicPath = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('/') && !v.startsWith('//');

function pick<T extends string>(
  v: unknown,
  list: T[],
  fallback: T,
  key: string,
  notes: string[],
): T {
  if (v === undefined) return fallback;
  if (typeof v === 'string' && (list as string[]).includes(v)) return v as T;
  notes.push(`look.${key}: "${String(v)}" is not one of ${list.join(', ')}; using ${fallback}.`);
  return fallback;
}

/** The brand's `studio.look` and the Studio colours -> every token the primitives draw with. */
export function resolveLook(input: StudioLookInput | undefined, base: LookBase): ResolvedLook {
  const look = input ?? {};
  const notes: string[] = [];

  let marker: ResolvedLook['marker'] = 'dot';
  if (typeof look.marker === 'object' && look.marker) {
    const m = look.marker as Partial<MarkerArt>;
    if (isPublicPath(m.src) && Number(m.width) > 0 && Number(m.height) > 0) {
      marker = { src: m.src, width: Number(m.width), height: Number(m.height) };
    } else
      notes.push('look.marker: art needs src (a path in public/), width and height; using dot.');
  } else marker = pick(look.marker, MARKERS, 'dot', 'marker', notes);

  const given = (look.markColors ?? []).map(hex).filter((c): c is string => !!c);
  if (look.markColors && given.length !== look.markColors.length)
    notes.push('look.markColors: some entries are not hex colours and were left out.');
  const marks = given.length ? given : [base.accent];

  const lettering =
    look.lettering && typeof look.lettering.family === 'string' && isPublicPath(look.lettering.src)
      ? {
          family: look.lettering.family,
          src: look.lettering.src,
          colors: (look.lettering.colors ?? [])
            .map(hex)
            .filter((c): c is string => !!c)
            // Banner titles are large text (3:1) on the chrome colour.
            .filter((c) => contrastRatio(c, base.chrome) >= 3),
        }
      : undefined;
  if (look.lettering && !lettering)
    notes.push('look.lettering: needs family and src (a path in public/).');

  const bannerInk = ensure('#ffffff', base.chrome, 7);
  return {
    marker,
    stone: pick(look.stone, STONES, 'round', 'stone', notes),
    connector: pick(look.connector?.kind, CONNECTORS, 'line', 'connector.kind', notes),
    motion: pick(look.motion, MOTIONS, 'draw', 'motion', notes),
    motif: isPublicPath(look.motif) ? look.motif : undefined,
    motifNarrow: isPublicPath(look.motifNarrow) ? look.motifNarrow : undefined,
    texture: isPublicPath(look.texture) ? look.texture : undefined,
    edgeColors: ((look.edgeColors ?? []).map(hex).filter(Boolean) as string[]).length
      ? ((look.edgeColors ?? []).map(hex).filter(Boolean) as string[])
      : marks,
    lettering,
    banner: {
      bg: base.chrome,
      ink: bannerInk,
      muted: ensure(mix(bannerInk, base.chrome, 0.2), base.chrome, AA_BODY_TEXT),
      accent: ensure(hex(look.tones?.tip) ?? base.accentOnDark, base.chrome, AA_BODY_TEXT),
    },
    light: scheme(look, base, false, marks),
    dark: scheme(look, base, true, marks),
    notes,
  };
}

/** Every text-on-ground pair a scheme draws, for the contrast gate. */
export function contrastPairs(
  t: SchemeTokens,
): { name: string; fg: string; bg: string; min: number }[] {
  const pairs = [
    { name: 'ink on paper', fg: t.ink, bg: t.paper, min: AA_BODY_TEXT },
    { name: 'ink on surface', fg: t.ink, bg: t.surface, min: AA_BODY_TEXT },
    { name: 'muted on paper', fg: t.muted, bg: t.paper, min: AA_BODY_TEXT },
    { name: 'heading on paper', fg: t.heading, bg: t.paper, min: AA_BODY_TEXT },
    { name: 'marker on paper', fg: t.marker, bg: t.paper, min: AA_NON_TEXT },
    { name: 'focus on paper', fg: t.focus, bg: t.paper, min: AA_NON_TEXT },
    { name: 'chip', fg: t.chip.fg, bg: t.chip.bg, min: AA_BODY_TEXT },
    { name: 'tool chip', fg: t.chipTool.fg, bg: t.chipTool.bg, min: AA_BODY_TEXT },
    { name: 'publish chip', fg: t.chipPositive.fg, bg: t.chipPositive.bg, min: AA_BODY_TEXT },
    { name: 'critical chip', fg: t.chipCritical.fg, bg: t.chipCritical.bg, min: AA_BODY_TEXT },
  ];
  t.stones.forEach((s, i) => {
    pairs.push({ name: `stone ${i} number`, fg: s.text, bg: s.fill, min: AA_BODY_TEXT });
    pairs.push({ name: `stone ${i} on paper`, fg: s.fill, bg: t.paper, min: AA_NON_TEXT });
  });
  for (const [k, v] of Object.entries(t.tones)) {
    pairs.push({ name: `${k} title`, fg: v.title, bg: v.bg, min: AA_BODY_TEXT });
    pairs.push({ name: `${k} text`, fg: t.ink, bg: v.bg, min: AA_BODY_TEXT });
    pairs.push({ name: `${k} marker outline`, fg: v.mark, bg: v.bg, min: AA_NON_TEXT });
    pairs.push({ name: `${k} card edge on surface`, fg: v.edge, bg: t.surface, min: AA_NON_TEXT });
  }
  // Card 131: the surfaces' white cards and the empty stone of a step not yet done.
  pairs.push({ name: 'muted on surface', fg: t.muted, bg: t.surface, min: AA_BODY_TEXT });
  pairs.push({ name: 'heading on surface', fg: t.heading, bg: t.surface, min: AA_BODY_TEXT });
  t.stones.forEach((s, i) => {
    pairs.push({ name: `stone ${i} on surface`, fg: s.fill, bg: t.surface, min: AA_NON_TEXT });
  });
  return pairs;
}

// -----------------------------------------------------------------------------
// Card 131: step states (the Sunday checklist, "Is it live?", the navbar line)
// -----------------------------------------------------------------------------

/** A stone on a path: laid (done), being laid (now), waiting (todo), or one that did not go down. */
export type StepState = 'done' | 'now' | 'todo' | 'failed' | 'slow';

/** The three steps of an update, Saved, Building, On the website, from the live state. */
export function liveSteps(
  state: 'live' | 'on-its-way' | 'slow' | 'unknown' | 'failed',
): [StepState, StepState, StepState] {
  switch (state) {
    case 'live':
      return ['done', 'done', 'done'];
    case 'on-its-way':
      return ['done', 'now', 'todo'];
    case 'slow':
      return ['done', 'slow', 'todo'];
    case 'failed':
      return ['done', 'failed', 'todo'];
    default:
      return ['todo', 'todo', 'todo'];
  }
}

export const LIVE_STEP_WORDS = ['Saved', 'Building', 'On the website'] as const;

/** A sentence for a screen reader: "Saved, done. Building, in progress. On the website, not yet." */
export function stepsLabel(words: readonly string[], states: readonly StepState[]): string {
  const say: Record<StepState, string> = {
    done: 'done',
    now: 'in progress',
    todo: 'not yet',
    failed: 'did not go through',
    slow: 'taking longer than usual',
  };
  return words.map((w, i) => `${w}, ${say[states[i] ?? 'todo']}.`).join(' ');
}

/** How far along a checklist is, for the path's heading: "2 of 5 done". */
export function pathProgress(done: readonly boolean[]): {
  done: number;
  total: number;
  text: string;
} {
  const n = done.filter(Boolean).length;
  const total = done.length;
  return {
    done: n,
    total,
    text: total === 0 ? '' : n === total ? 'All done' : `${n} of ${total} done`,
  };
}

// -----------------------------------------------------------------------------
// Stones
// -----------------------------------------------------------------------------

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** A colour's hue (0-360) and saturation (0-1). */
function hueSat(c: string): { h: number; s: number } {
  const n = parseInt(c.replace('#', '').slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s };
}

/**
 * Card 132: which stones may stand for "done". A stone within 28 degrees of the
 * careful (warning) hue, and saturated enough to read as it, is left out; if
 * that leaves none, every stone is kept.
 */
export function calmStones(fills: readonly string[], careful: string): number[] {
  const c = hueSat(careful);
  const keep = fills
    .map((f, i) => ({ i, ...hueSat(f) }))
    .filter((x) => {
      const dh = Math.min(Math.abs(x.h - c.h), 360 - Math.abs(x.h - c.h));
      return !(dh < 28 && x.s > 0.3 && c.s > 0.3);
    })
    .map((x) => x.i);
  return keep.length ? keep : fills.map((_, i) => i);
}

/** A hand-laid stone: a seeded irregular outline, smoothed (Chaikin), as an SVG path in a w x h box. */
export function pebblePath(seed: number, w: number, h: number, sides = 6): string {
  const r = lcg(seed * 7919 + 13);
  let pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const k = 0.8 + r() * 0.2;
    pts.push([w / 2 + Math.cos(a) * (w / 2) * k, h / 2 + Math.sin(a) * (h / 2) * k]);
  }
  for (let pass = 0; pass < 3; pass++) {
    const out: [number, number][] = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      out.push(
        [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25],
        [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75],
      );
    });
    pts = out;
  }
  return 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z';
}

/** The token outline for a shape, as an SVG path in a w x h box. */
export function stonePath(shape: StoneShape, seed: number, w: number, h: number): string {
  if (shape === 'pebble') return pebblePath(seed, w, h);
  if (shape === 'square') {
    const r = Math.min(w, h) * 0.22;
    return `M${r} 0H${w - r}Q${w} 0 ${w} ${r}V${h - r}Q${w} ${h} ${w - r} ${h}H${r}Q0 ${h} 0 ${h - r}V${r}Q0 0 ${r} 0Z`;
  }
  if (shape === 'lozenge') return `M${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}L0 ${h / 2}Z`;
  const rx = w / 2;
  const ry = h / 2;
  return `M0 ${ry}A${rx} ${ry} 0 1 0 ${w} ${ry}A${rx} ${ry} 0 1 0 0 ${ry}Z`;
}

// -----------------------------------------------------------------------------
// Guides
// -----------------------------------------------------------------------------

/**
 * A guide's `icon` -> a meaning in the icon registry, so a guide wears the
 * site's own art for that meaning (a stone, on Auburn) where it has some. A
 * meaning name itself is accepted too; anything else (an old emoji) is 'guide'.
 */
export const GUIDE_ICON_MEANINGS: Record<string, BrandIconKey> = {
  info: 'guide',
  document: 'page',
  add: 'pages',
  blocks: 'sections',
  copy: 'savedSection',
  sync: 'savedSection',
  arrow: 'redirect',
  image: 'image',
  menu: 'link',
  home: 'home',
  clock: 'times',
  play: 'preview',
  search: 'search',
  check: 'checkup',
  activity: 'checkup',
  bulb: 'help',
  bolt: 'quickUpdate',
  restore: 'restore',
  mail: 'message',
  code: 'code',
};

export function guideMeaning(icon: unknown): BrandIconKey {
  if (typeof icon !== 'string') return 'guide';
  if (GUIDE_ICON_MEANINGS[icon]) return GUIDE_ICON_MEANINGS[icon];
  return isBrandIconKey(icon) ? icon : 'guide';
}

export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'aside'; text: string }
  | { kind: 'button'; text: string };

/** The guide marks: **bold**, `a thing you click`, _a light aside_ (not inside words). */
export function inlineParts(text: string): InlinePart[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|(?<![\w])_[^_]+_(?![\w]))/g)
    .filter((p) => p !== '')
    .map((part): InlinePart => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
        return { kind: 'bold', text: part.slice(2, -2) };
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
        return { kind: 'button', text: part.slice(1, -1) };
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2)
        return { kind: 'aside', text: part.slice(1, -1) };
      return { kind: 'text', text: part };
    });
}

/** How a Studio button is drawn: as the real thing looks. */
export type ChipKind = 'publish' | 'critical' | 'tool' | 'button';

/** The top-bar tools every kit Studio has, by the names the guides use. */
export const TOOL_NAMES = [
  'Home',
  'Content',
  'Live preview',
  'Site Guide',
  'Checkup',
  'Quick update',
  'Messages',
  'Vision',
  'Presentation',
  'Media',
];

export function chipKind(name: string, tools: string[] = TOOL_NAMES): ChipKind {
  const n = name.trim().toLowerCase();
  if (n === 'publish' || n === 'publish now' || n === 'schedule') return 'publish';
  if (/^(delete|discard|discard changes|unpublish|remove field|move to trash)$/.test(n))
    return 'critical';
  if (tools.some((t) => t.toLowerCase() === n)) return 'tool';
  return 'button';
}

/** Which guide is meant by a "See also" line: a title (as the guides write them) or a slug. */
export function findGuide<T extends { slug: string; title: string }>(
  guides: T[],
  ref: string,
): T | undefined {
  const r = ref.trim().toLowerCase();
  return guides.find((g) => g.slug === ref || g.title.trim().toLowerCase() === r);
}

// -----------------------------------------------------------------------------
// GuideShot: a screenshot with annotations positioned from data
// -----------------------------------------------------------------------------

/**
 * One mark on a GuideShot. Positions are PERCENTAGES of the picture (0 to 100),
 * so a later, larger capture of the same screen keeps its marks:
 *   - stone: a numbered stone centred at (x, y); the number matches a step.
 *   - ring: a highlight ring around a box (x, y = its top left; w, h = size).
 *   - arrow: from (x, y) to (toX, toY), its head at the far end.
 * `label` is said to screen readers and shown under the picture as a key.
 */
export type ShotMark =
  | { kind: 'stone'; x: number; y: number; n?: number; label?: string }
  | { kind: 'ring'; x: number; y: number; w: number; h: number; label?: string }
  | { kind: 'arrow'; x: number; y: number; toX: number; toY: number; label?: string };

export interface GuideShotData {
  /** The picture: a file in public/ ("/guides/shots/publish.png"), or an https address. */
  src: string;
  /** What the picture shows, for someone who cannot see it. Required. */
  alt: string;
  /** The capture's own size in px, so the frame keeps its shape before it loads. */
  width: number;
  height: number;
  marks?: ShotMark[];
  caption?: string;
}

const pct = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0));

/** The shot's marks, clamped into the picture; marks with a bad kind are dropped. Stones get numbers in order. */
export function shotMarks(marks: unknown): ShotMark[] {
  if (!Array.isArray(marks)) return [];
  let n = 0;
  const out: ShotMark[] = [];
  for (const m of marks as Record<string, unknown>[]) {
    const label = typeof m?.label === 'string' ? m.label : undefined;
    if (m?.kind === 'stone') {
      n = typeof m.n === 'number' && m.n > 0 ? m.n : n + 1;
      out.push({ kind: 'stone', x: pct(m.x), y: pct(m.y), n, label });
    } else if (m?.kind === 'ring') {
      const x = pct(m.x);
      const y = pct(m.y);
      out.push({
        kind: 'ring',
        x,
        y,
        w: Math.min(pct(m.w), 100 - x),
        h: Math.min(pct(m.h), 100 - y),
        label,
      });
    } else if (m?.kind === 'arrow') {
      out.push({
        kind: 'arrow',
        x: pct(m.x),
        y: pct(m.y),
        toX: pct(m.toX),
        toY: pct(m.toY),
        label,
      });
    }
  }
  return out;
}

/** A shot's source is safe to draw: a public/ path or an https address. */
export function shotSrc(src: unknown): string | null {
  if (typeof src !== 'string') return null;
  if (isPublicPath(src)) return src;
  return /^https:\/\/[^/]/.test(src) ? src : null;
}

/**
 * A guide's shot block (card 130). Either a KEY into the site's shot registry
 * (src/sanity/guides/shots.ts), so the guide text stays site-neutral while each
 * site draws its own captures, or a full shot written in place. Anything the
 * block sets itself (a caption, an alt, marks) wins over the registry's.
 */
export type GuideShotBlock = Partial<GuideShotData> & { key?: string };

/**
 * The wireframe drawing shown when a guide asks for a key the site has no
 * capture for (public/guide-shots/example-editor.svg). It says it is a drawing,
 * so a site with no screenshots yet still reads sensibly.
 */
export const PLACEHOLDER_SHOT: GuideShotData = {
  src: '/guide-shots/example-editor.svg',
  alt: 'A drawing of the editor: the page form on the left and the Publish button at the bottom right.',
  width: 1280,
  height: 760,
  marks: [
    { kind: 'ring', x: 80.5, y: 88.5, w: 17, h: 8, label: 'The Publish button' },
    { kind: 'stone', x: 34, y: 33, label: 'Type in the boxes. It saves as a draft.' },
    { kind: 'stone', x: 89, y: 80, label: 'Publish when it reads right.' },
    { kind: 'arrow', x: 66, y: 64, toX: 79, toY: 87 },
  ],
  caption: 'A drawing, not a screenshot. This site has not added its own picture of this yet.',
};

/**
 * The shot to draw for a guide block, or null when there is nothing to draw.
 * A block with its own src and alt is drawn as written; a block with a key is
 * looked up in the site's registry, and a key with no entry falls back to the
 * wireframe drawing so a guide never shows a hole.
 */
export function resolveShot(
  block: GuideShotBlock,
  registry: Record<string, GuideShotData>,
): GuideShotData | null {
  if (block.src && block.alt) return block as GuideShotData;
  const key = typeof block.key === 'string' ? block.key : '';
  if (!key) return null;
  const found = Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
  const base = found ?? PLACEHOLDER_SHOT;
  return {
    ...base,
    ...(block.alt ? { alt: block.alt } : {}),
    ...(block.caption ? { caption: block.caption } : {}),
    ...(block.marks ? { marks: block.marks } : {}),
  };
}

// -----------------------------------------------------------------------------
// From the brand file
// -----------------------------------------------------------------------------

/** The look's base colours, from the Studio's resolved colours and the brand palette's text colours. */
export function lookBase(
  colors: { white: string; black: string; accent: Record<string, string>; chrome: { bg: string } },
  brand: unknown,
): LookBase {
  const p = (brand as { palette?: Record<string, Record<string, string>> })?.palette;
  return {
    paper: colors.white,
    dark: colors.black,
    chrome: colors.chrome.bg,
    accent: colors.accent['500'],
    accentOnDark: colors.accent['400'],
    ink: p?.light?.['--foreground'] ?? null,
    inkOnDark: p?.dark?.['--foreground'] ?? null,
    muted: p?.light?.['--muted-foreground'] ?? null,
    mutedOnDark: p?.dark?.['--muted-foreground'] ?? null,
  };
}

/** brand.config.json `studio.look`, or nothing. */
export function lookInput(brand: unknown): StudioLookInput | undefined {
  const look = (brand as { studio?: { look?: unknown } })?.studio?.look;
  return look && typeof look === 'object' ? (look as StudioLookInput) : undefined;
}
