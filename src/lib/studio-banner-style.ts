// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Home's banner, the style slot (Studio kit, PORTS.md card 135)
// =============================================================================
// A site sets the banner's look in kitConfig.homeBanner.style (typed:
// HomeBannerStyle below). It used to do that with a site CSS file that reached
// into the kit's class names (.ncs-hb__go, [data-ui='Stack']...), so a kit
// rename silently undid the look. Now the look is DATA, and the only markup a
// site may still select is the small documented set exported here:
//
//   HOME_BANNER_PARTS  the `data-hb-part` values the banner's elements carry;
//   HOME_BANNER_ATTRS  the state attributes the style turns on (shape, mark...);
//   HOME_BANNER_VARS   the `--hb-*` custom properties the style defines on the
//                      banner, for a site's own extra CSS to READ (never to set).
//
// studio-banner-style.test.ts fails if any of them disappears or is renamed, and
// docs/agent/studio-kit.md ("Home's banner style") is the one list of what is
// supported. Everything else in the banner's markup is the kit's to change.
//
// This file is the pure half (no React): resolveBannerStyle() checks every
// value (a colour must be a hex and must read on the banner, a length or font
// stack is stripped of anything that could close a CSS rule) and returns the
// stylesheet and the attributes. Anything unusable is dropped and said in `notes`.
// With no style it returns nothing at all, so a site that sets none is unchanged.
// =============================================================================

import { contrastRatio } from './contrast.ts';
import { BODY_CONTRAST, LARGE_CONTRAST } from './studio-banner.ts';
import { isHex, mix } from './studio-theme.ts';

// -----------------------------------------------------------------------------
// The style, as kit.config.ts says it
// -----------------------------------------------------------------------------

export type BannerCase = 'upper' | 'none';
export type ChipShape = 'pill' | 'square' | 'tag' | 'plate' | 'stitched';
export type MotifPlace = 'foot' | 'behind-right';
export type EyebrowMarkKind = 'rule' | 'dot';

/** Every field optional. A font is a CSS font stack the site already loads (the kit does not load fonts). */
export interface HomeBannerStyle {
  background?: {
    /** The banner's colour instead of the navbar's. White text must reach 7:1 on it, or it is ignored. */
    color?: string;
    /** A tiling picture (an SVG or image in public/) over the colour. */
    texture?: string;
    /** A one-pixel line along the foot, in this colour. */
    rule?: string;
  };
  /** The date line above the greeting. */
  eyebrow?: {
    /** The words. `{date}` is today's date as the banner writes it ("Monday 19 October"). Default `{date}`. */
    text?: string;
    font?: string;
    /** A CSS length ("13px", "0.75rem"). */
    size?: string;
    weight?: number;
    /** Letter spacing as a CSS length ("0.14em"). */
    tracking?: string;
    case?: BannerCase;
    /** Needs 4.5:1 on the banner. */
    color?: string;
    /** A small device before the words: a short rule or a round dot. Needs 3:1 on the banner. */
    mark?: { kind: EyebrowMarkKind; color?: string };
  };
  /** "Good morning, Ann". */
  greeting?: { font?: string; italic?: boolean; weight?: number };
  /** The site's name. */
  title?: {
    font?: string;
    weight?: number;
    /** A CSS length or clamp(): "clamp(2.6rem, 2.2rem + 2.6vw, 4.6rem)". */
    size?: string;
    /** Line height, a plain number ("0.92"). */
    leading?: number;
    tracking?: string;
    case?: BannerCase;
    /** Needs 3:1 on the banner (large text). */
    color?: string;
    /** A hard shadow offset down and right of the letters, as a poster echoes its type. */
    echo?: { color: string; offset?: string };
    /** The last letter of the lettered part is drawn as an outline in this colour. */
    lastLetterOutline?: string;
  };
  /** "View the website". */
  chip?: {
    shape?: ChipShape;
    /** The chip's fill and the text on it (4.5:1 together). Both are needed for a shape. */
    bg?: string;
    fg?: string;
    /** The hover fill (default: the fill, a step lighter) and its text (default: the text). */
    hoverBg?: string;
    hoverFg?: string;
    /** The plate's edge and shadow, the stitch's thread, the focus ring. Default: the text colour. */
    edge?: string;
    /** The keyboard focus ring. Default: edge. */
    ring?: string;
    /** A ring standing off the chip, in this colour (square and pill). */
    halo?: string;
    font?: string;
    size?: string;
    weight?: number;
    tracking?: string;
    case?: BannerCase;
  };
  /** Where the motif strip sits. 'foot' (the default) is a band under the words; 'behind-right' stands behind them at the right, full height, from 600px. */
  motif?: { place?: MotifPlace };
  /** A claim struck at an angle above the button, from 900px. Decorative: hidden from screen readers. */
  stamp?: { text: string; color?: string; font?: string };
}

// -----------------------------------------------------------------------------
// The documented hooks (the test holds these; the docs list them)
// -----------------------------------------------------------------------------

/** The `data-hb-part` values. The banner's root carries `banner`. */
export const HOME_BANNER_PARTS = [
  'banner',
  'body',
  'mark',
  'eyebrow',
  'greeting',
  'name',
  'title',
  'lettering',
  'lettering-last',
  'intro',
  'chip',
  'stamp',
  'motif',
] as const;
export type HomeBannerPart = (typeof HOME_BANNER_PARTS)[number];

/** The state attributes the style sets. */
export const HOME_BANNER_ATTRS = [
  'data-hb-bg',
  'data-hb-texture',
  'data-hb-rule',
  'data-hb-motif',
  'data-hb-mark',
  'data-hb-shape',
  'data-hb-halo',
  'data-hb-stamp',
] as const;

/** The custom properties the style defines on the banner (read them, do not set them). */
export const HOME_BANNER_VARS = [
  '--hb-bg',
  '--hb-rule',
  '--hb-texture',
  '--hb-mark-color',
  '--hb-chip-bg',
  '--hb-chip-fg',
  '--hb-chip-bg-hover',
  '--hb-chip-fg-hover',
  '--hb-chip-edge',
  '--hb-chip-ring',
  '--hb-chip-halo',
  '--hb-title-outline',
  '--hb-stamp-color',
] as const;

// -----------------------------------------------------------------------------
// Cleaning
// -----------------------------------------------------------------------------

const hex = (v: unknown): string | null => (isHex(v) ? v.trim().toLowerCase() : null);

/** A font stack: family names, commas, quotes, dashes. Null when anything else is in it. */
export function cleanFont(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s && s.length <= 160 && /^[A-Za-z0-9 ,'\-_.]+$/.test(s) ? s : null;
}

/** A CSS length, or a clamp()/calc()/min()/max() of them. Null when it could be anything else. */
export function cleanLength(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > 80) return null;
  if (/^-?\d*\.?\d+(px|rem|em|%|vw|vh|ch)?$/i.test(s)) return s;
  if (/^(clamp|calc|min|max)\([0-9a-z.,%+\-*/ ()]+\)$/i.test(s) && balanced(s)) return s;
  return null;
}

function balanced(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === '(') d++;
    if (c === ')' && --d < 0) return false;
  }
  return d === 0;
}

const weight = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 100 && v <= 900 ? v : null;

const publicPath = (v: unknown): string | null =>
  typeof v === 'string' && /^\/[A-Za-z0-9/_.\-]+$/.test(v.trim()) && !v.includes('..')
    ? v.trim()
    : null;

/** Plain words for the eyebrow or stamp: no markup, no control characters. */
export function cleanWords(v: unknown, max = 80): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[<>\u0000-\u001f]/g, '').trim();
  return s && s.length <= max ? s : null;
}

/** The eyebrow's words with `{date}` filled in. */
export function eyebrowText(template: string | undefined, dateLine: string): string {
  const t = cleanWords(template, 120);
  return t ? t.replace(/\{date\}/g, dateLine) : dateLine;
}

// -----------------------------------------------------------------------------
// Resolving
// -----------------------------------------------------------------------------

export interface ResolvedBannerStyle {
  /** The stylesheet for this style, scoped to the banner. Empty when no style is set. */
  css: string;
  /** Attributes for the banner's root. */
  root: Record<string, string>;
  /** Attributes for the eyebrow's element. */
  eyebrow: Record<string, string>;
  /** Attributes for the button's wrapper. */
  chip: Record<string, string>;
  /** The stamp's words, when there is a usable one. */
  stamp: { text: string } | null;
  /** The eyebrow's words template (cleaned), or undefined for the plain date. */
  eyebrowTemplate: string | undefined;
  /** One line per value that was ignored. */
  notes: string[];
}

const NONE: ResolvedBannerStyle = {
  css: '',
  root: {},
  eyebrow: {},
  chip: {},
  stamp: null,
  eyebrowTemplate: undefined,
  notes: [],
};

const P = (part: HomeBannerPart) => `.ncs-hb [data-hb-part="${part}"]`;
const TRANSFORM = (c: BannerCase | undefined) =>
  c === 'upper' ? 'uppercase' : c === 'none' ? 'none' : null;

/** Declarations as one rule, `!important` on each (Sanity's own styles and inline styles sit under it). */
function rule(selector: string, decls: [string, string | number | null | undefined][]): string {
  const body = decls
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}!important`)
    .join(';');
  return body ? `${selector}{${body}}` : '';
}

/**
 * The banner's style, checked. `chrome` is the navbar's deep colour (the banner's
 * ground unless `background.color` replaces it).
 */
export function resolveBannerStyle(
  style: HomeBannerStyle | undefined,
  chrome: string,
): ResolvedBannerStyle {
  if (!style || typeof style !== 'object') return NONE;
  const notes: string[] = [];
  const root: Record<string, string> = {};
  const eyebrowAttrs: Record<string, string> = {};
  const chipAttrs: Record<string, string> = {};
  const out: string[] = [];
  const rootVars: string[] = [];

  // ---- background ----------------------------------------------------------
  let ground = chrome;
  const bg = style.background;
  if (bg) {
    const color = hex(bg.color);
    if (bg.color !== undefined) {
      if (color && contrastRatio('#ffffff', color) >= 7) {
        ground = color;
        root['data-hb-bg'] = '';
        rootVars.push(`--hb-bg:${color}`);
      } else notes.push('background.color: needs a hex color white text reads on at 7:1; ignored.');
    }
    const tex = publicPath(bg.texture);
    if (bg.texture !== undefined) {
      if (tex) {
        root['data-hb-texture'] = '';
        rootVars.push(`--hb-texture:url("${tex}")`);
      } else notes.push('background.texture: needs a path in public/; ignored.');
    }
    const line = hex(bg.rule);
    if (bg.rule !== undefined) {
      if (line) {
        root['data-hb-rule'] = '';
        rootVars.push(`--hb-rule:${line}`);
      } else notes.push('background.rule: needs a hex color; ignored.');
    }
  }

  const readable = (c: unknown, min: number, what: string): string | null => {
    const h = hex(c);
    if (c === undefined) return null;
    if (!h) {
      notes.push(`${what}: not a hex color; ignored.`);
      return null;
    }
    if (contrastRatio(h, ground) < min) {
      notes.push(`${what}: under ${min}:1 on the banner; ignored.`);
      return null;
    }
    return h;
  };

  // ---- eyebrow -------------------------------------------------------------
  const eb = style.eyebrow;
  let eyebrowTemplate: string | undefined;
  if (eb) {
    if (eb.text !== undefined) {
      eyebrowTemplate = cleanWords(eb.text, 120) ?? undefined;
      if (!eyebrowTemplate) notes.push('eyebrow.text: needs plain words; ignored.');
    }
    const font = eb.font === undefined ? null : cleanFont(eb.font);
    if (eb.font !== undefined && !font) notes.push('eyebrow.font: not a font stack; ignored.');
    const size = eb.size === undefined ? null : cleanLength(eb.size);
    if (eb.size !== undefined && !size) notes.push('eyebrow.size: not a length; ignored.');
    const track = eb.tracking === undefined ? null : cleanLength(eb.tracking);
    if (eb.tracking !== undefined && !track) notes.push('eyebrow.tracking: not a length; ignored.');
    const color = readable(eb.color, BODY_CONTRAST, 'eyebrow.color');
    out.push(
      rule(P('eyebrow'), [
        ['font-family', font],
        ['font-size', size],
        ['font-weight', weight(eb.weight)],
        ['letter-spacing', track],
        ['text-transform', TRANSFORM(eb.case)],
        ['color', color],
      ]),
    );
    // Sanity's Text keeps its words in a span; let it take the colour set above.
    if (color) out.push(`${P('eyebrow')} > span{color:inherit!important}`);
    if (eb.mark) {
      const kind = eb.mark.kind === 'rule' || eb.mark.kind === 'dot' ? eb.mark.kind : null;
      const mc = readable(eb.mark.color ?? color ?? '#ffffff', 3, 'eyebrow.mark.color');
      if (kind && mc) {
        eyebrowAttrs['data-hb-mark'] = kind;
        rootVars.push(`--hb-mark-color:${mc}`);
      } else if (!kind) notes.push('eyebrow.mark.kind: "rule" or "dot"; ignored.');
    }
  }

  // ---- greeting ------------------------------------------------------------
  const gr = style.greeting;
  if (gr) {
    const font = gr.font === undefined ? null : cleanFont(gr.font);
    if (gr.font !== undefined && !font) notes.push('greeting.font: not a font stack; ignored.');
    out.push(
      rule(P('greeting'), [
        ['font-family', font],
        ['font-style', gr.italic === true ? 'italic' : gr.italic === false ? 'normal' : null],
        ['font-weight', weight(gr.weight)],
      ]),
    );
  }

  // ---- title ---------------------------------------------------------------
  const ti = style.title;
  if (ti) {
    const font = ti.font === undefined ? null : cleanFont(ti.font);
    if (ti.font !== undefined && !font) notes.push('title.font: not a font stack; ignored.');
    const size = ti.size === undefined ? null : cleanLength(ti.size);
    if (ti.size !== undefined && !size) notes.push('title.size: not a length; ignored.');
    const track = ti.tracking === undefined ? null : cleanLength(ti.tracking);
    if (ti.tracking !== undefined && !track) notes.push('title.tracking: not a length; ignored.');
    const lead =
      typeof ti.leading === 'number' && ti.leading >= 0.7 && ti.leading <= 2 ? ti.leading : null;
    if (ti.leading !== undefined && lead === null) notes.push('title.leading: 0.7 to 2; ignored.');
    const color = readable(ti.color, LARGE_CONTRAST, 'title.color');
    let shadow: string | null = null;
    if (ti.echo) {
      const ec = hex(ti.echo.color);
      const off = ti.echo.offset === undefined ? '0.055em' : cleanLength(ti.echo.offset);
      if (ec && off) shadow = `${off} ${off} 0 ${ec}`;
      else notes.push('title.echo: needs a hex color and a length; ignored.');
    }
    out.push(
      rule(P('title'), [
        ['font-family', font],
        ['font-weight', weight(ti.weight)],
        ['font-size', size],
        ['line-height', lead],
        ['letter-spacing', track],
        ['text-transform', TRANSFORM(ti.case)],
        ['color', color],
        ['text-shadow', shadow],
      ]),
    );
    // At poster size Sanity's text trims (zero-height pseudo-elements on the span) clip an echo.
    if (size || shadow)
      out.push(`${P('title')} > span::before,${P('title')} > span::after{display:none!important}`);
    if (ti.lastLetterOutline !== undefined) {
      const oc = readable(ti.lastLetterOutline, LARGE_CONTRAST, 'title.lastLetterOutline');
      if (oc) {
        rootVars.push(`--hb-title-outline:${oc}`);
        out.push(
          `${P('lettering-last')}{color:transparent!important;-webkit-text-stroke:0.03em var(--hb-title-outline);text-shadow:none!important}`,
        );
      }
    }
  }

  // ---- chip ----------------------------------------------------------------
  const ch = style.chip;
  if (ch) {
    const font = ch.font === undefined ? null : cleanFont(ch.font);
    if (ch.font !== undefined && !font) notes.push('chip.font: not a font stack; ignored.');
    const size = ch.size === undefined ? null : cleanLength(ch.size);
    if (ch.size !== undefined && !size) notes.push('chip.size: not a length; ignored.');
    const track = ch.tracking === undefined ? null : cleanLength(ch.tracking);
    if (ch.tracking !== undefined && !track) notes.push('chip.tracking: not a length; ignored.');
    const text = `${P('chip')} [data-ui="Text"],${P('chip')} [data-ui="Text"] > span`;
    out.push(
      rule(text, [
        ['font-family', font],
        ['font-size', size],
        ['font-weight', weight(ch.weight)],
        ['letter-spacing', track],
        ['text-transform', TRANSFORM(ch.case)],
      ]),
    );
    const shapes: ChipShape[] = ['pill', 'square', 'tag', 'plate', 'stitched'];
    if (ch.shape !== undefined || ch.bg !== undefined || ch.fg !== undefined) {
      const shape = shapes.includes(ch.shape as ChipShape) ? (ch.shape as ChipShape) : null;
      const cbg = hex(ch.bg);
      const cfg = hex(ch.fg);
      if (!shape)
        notes.push(
          'chip.shape: pill, square, tag, plate or stitched; chip left as Sanity draws it.',
        );
      else if (!cbg || !cfg)
        notes.push(
          'chip: a shape needs both bg and fg as hex colors; chip left as Sanity draws it.',
        );
      else if (contrastRatio(cfg, cbg) < BODY_CONTRAST)
        notes.push('chip: fg on bg is under 4.5:1; chip left as Sanity draws it.');
      else {
        const hbg = hex(ch.hoverBg) ?? mix(cbg, '#ffffff', 0.18);
        let hfg = hex(ch.hoverFg) ?? cfg;
        if (contrastRatio(hfg, hbg) < BODY_CONTRAST) {
          notes.push('chip.hoverFg: under 4.5:1 on the hover fill; the text color is kept.');
          hfg = cfg;
        }
        const edge = hex(ch.edge) ?? cfg;
        const ring = hex(ch.ring) ?? edge;
        chipAttrs['data-hb-shape'] = shape;
        rootVars.push(
          `--hb-chip-bg:${cbg}`,
          `--hb-chip-fg:${cfg}`,
          `--hb-chip-bg-hover:${hbg}`,
          `--hb-chip-fg-hover:${hfg}`,
          `--hb-chip-edge:${edge}`,
          `--hb-chip-ring:${ring}`,
        );
        const halo = hex(ch.halo);
        if (ch.halo !== undefined) {
          if (halo && (shape === 'square' || shape === 'pill')) {
            chipAttrs['data-hb-halo'] = '';
            rootVars.push(`--hb-chip-halo:${halo}`);
          } else notes.push('chip.halo: a hex color, on the square or pill shape; ignored.');
        }
      }
    }
  }

  // ---- motif ---------------------------------------------------------------
  if (style.motif?.place !== undefined) {
    if (style.motif.place === 'behind-right' || style.motif.place === 'foot')
      root['data-hb-motif'] = style.motif.place;
    else notes.push('motif.place: "foot" or "behind-right"; ignored.');
  }

  // ---- stamp ---------------------------------------------------------------
  let stamp: { text: string } | null = null;
  if (style.stamp) {
    const words = cleanWords(style.stamp.text, 60);
    const sc =
      style.stamp.color === undefined ? '#ffffff' : readable(style.stamp.color, 3, 'stamp.color');
    const sf = style.stamp.font === undefined ? null : cleanFont(style.stamp.font);
    if (style.stamp.font !== undefined && !sf) notes.push('stamp.font: not a font stack; ignored.');
    if (words && sc) {
      stamp = { text: words };
      chipAttrs['data-hb-stamp'] = '';
      rootVars.push(`--hb-stamp-color:${sc}`);
      out.push(rule(P('stamp'), [['font-family', sf]]));
    } else notes.push('stamp: needs words (under 60 characters) and a readable color; ignored.');
  }

  if (rootVars.length) out.unshift(`.ncs-hb{${rootVars.join(';')}}`);
  const css = out.filter(Boolean).join('\n');
  const anyAttr = [root, eyebrowAttrs, chipAttrs].some((a) => Object.keys(a).length > 0);
  if (!css && !anyAttr && !stamp && !notes.length && !eyebrowTemplate) return NONE;
  return {
    css: css || anyAttr ? [css, HOME_BANNER_STYLE_CSS].filter(Boolean).join('\n') : '',
    root,
    eyebrow: eyebrowAttrs,
    chip: chipAttrs,
    stamp,
    eyebrowTemplate,
    notes,
  };
}

// -----------------------------------------------------------------------------
// The shapes (static: each rule is switched on by an attribute the style sets)
// -----------------------------------------------------------------------------

const B = '.ncs-hb [data-hb-part="chip"]';
const A = 'a[data-ui="Button"]';
const shape = (s: ChipShape) => `${B}[data-hb-shape="${s}"] > ${A}`;
const TAG_HOLE = 'radial-gradient(circle at .8rem 50%,#0000 .25rem,#000 calc(.25rem + .6px))';

export const HOME_BANNER_STYLE_CSS = `
.ncs-hb[data-hb-bg]{background:var(--hb-bg);--card-bg-color:var(--hb-bg)}
.ncs-hb[data-hb-texture]{background-image:var(--hb-texture)}
.ncs-hb[data-hb-rule]{border-bottom:1px solid var(--hb-rule)}
${P('eyebrow')}[data-hb-mark]{display:flex;align-items:center;gap:14px}
${P('eyebrow')}[data-hb-mark]::before{content:'';flex:none;background:var(--hb-mark-color)}
${P('eyebrow')}[data-hb-mark="rule"]::before{width:44px;height:1px}
${P('eyebrow')}[data-hb-mark="dot"]{gap:12px}
${P('eyebrow')}[data-hb-mark="dot"]::before{width:9px;height:9px;border-radius:50%}
@media (min-width:600px){
.ncs-hb[data-hb-motif="behind-right"]{isolation:isolate}
.ncs-hb[data-hb-motif="behind-right"] ${P('body').replace('.ncs-hb ', '')}{position:relative;z-index:1}
.ncs-hb[data-hb-motif="behind-right"] ${P('motif').replace('.ncs-hb ', '')}{position:absolute;z-index:0;right:0;bottom:0;width:auto;max-width:none;height:100%}
}
${B}[data-hb-shape] > ${A}{--card-bg-color:var(--hb-chip-bg);--card-fg-color:var(--hb-chip-fg);--card-muted-fg-color:var(--hb-chip-fg);--card-icon-color:var(--hb-chip-fg);--card-border-color:transparent;background:var(--hb-chip-bg)!important;color:var(--hb-chip-fg)!important;box-shadow:none!important;border:0}
${B}[data-hb-shape] > ${A} *{color:inherit!important}
${B}[data-hb-shape] > ${A}:hover{background:var(--hb-chip-bg-hover)!important;color:var(--hb-chip-fg-hover)!important}
${B}[data-hb-shape] > ${A}:focus-visible{outline:2px solid var(--hb-chip-ring);outline-offset:3px}
${shape('pill')}{border-radius:999px!important}
${shape('square')}{border-radius:2px!important;transition:transform .2s,background-color .2s}
${shape('square')}:hover{transform:translateY(-1px)}
${B}[data-hb-halo] > ${A}{outline:2px solid var(--hb-chip-halo);outline-offset:3px;margin:5px}
${B}[data-hb-halo] > ${A}:focus-visible{outline-color:var(--hb-chip-ring)}
${shape('tag')}{position:relative;isolation:isolate;min-height:46px;padding-left:1.1rem;border-radius:0!important;background:none!important}
${shape('tag')} *{background:none!important}
${shape('tag')}:hover{background:none!important}
${shape('tag')}::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--hb-chip-bg);clip-path:polygon(1rem 0,100% 0,100% 100%,1rem 100%,0 50%);-webkit-mask:${TAG_HOLE};mask:${TAG_HOLE};transition:background-color 400ms}
${shape('tag')}:hover::before{background:var(--hb-chip-bg-hover)}
${shape('tag')} svg{transition:transform 450ms cubic-bezier(.22,1,.36,1)}
@media (prefers-reduced-motion:no-preference){${shape('tag')}:hover svg{transform:translateX(4px)}}
${shape('plate')}{--hb-plate-skew:-7deg;transform:skewX(var(--hb-plate-skew));border:2px solid var(--hb-chip-edge)!important;border-radius:12px!important;box-shadow:3px 4px 0 var(--hb-chip-edge)!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
${shape('plate')}:hover{transform:translate(-2px,-2px) skewX(var(--hb-plate-skew));box-shadow:5px 6px 0 var(--hb-chip-edge)!important}
${shape('plate')}:active{transform:translate(2px,3px) skewX(var(--hb-plate-skew));box-shadow:0 0 0 var(--hb-chip-edge)!important}
${shape('stitched')}{border-radius:2px!important;box-shadow:0 14px 28px -18px rgba(0,0,0,.7)!important;background:linear-gradient(var(--hb-chip-bg-hover),var(--hb-chip-bg-hover)) left center/0% 100% no-repeat,var(--hb-chip-bg)!important;outline:1px dashed color-mix(in srgb,var(--hb-chip-edge) 30%,transparent);outline-offset:-5px;transition:background-size 560ms cubic-bezier(.65,0,.35,1),outline-color 520ms ease,outline-offset 520ms ease,color 520ms ease}
${shape('stitched')}:hover,${shape('stitched')}:focus-visible{background-size:100% 100%!important;outline-color:color-mix(in srgb,var(--hb-chip-edge) 60%,transparent);outline-offset:-6px}
${shape('stitched')}:focus-visible{box-shadow:0 0 0 3px var(--hb-chip-fg-hover),0 0 0 5px var(--hb-chip-ring)!important}
@media (prefers-reduced-motion:reduce){${B}[data-hb-shape] > ${A}{transition:none!important}${shape('square')}:hover,${shape('plate')}:hover{transform:none}}
@media (min-width:900px){
${B}[data-hb-stamp]{display:flex;flex-direction:column;align-items:center;gap:26px}
}
${P('stamp')}{display:none}
@media (min-width:900px){
${P('stamp')}{display:block;max-width:15rem;padding:.8rem 1.1rem;border:2px solid var(--hb-stamp-color);border-radius:4px;outline:1px solid var(--hb-stamp-color);outline-offset:-6px;color:var(--hb-stamp-color);font-size:1.25rem;line-height:1.05;letter-spacing:.02em;text-transform:uppercase;rotate:-6deg;opacity:.94;text-align:center}
}
`.trim();
