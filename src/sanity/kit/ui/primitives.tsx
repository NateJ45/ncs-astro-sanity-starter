// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit's design language: the shared primitives (PORTS.md card 128)
// =============================================================================
// Small React pieces every kit surface can use, all drawn in the site's own
// devices from brand.config.json `studio.look` (look.ts): its marker, its
// stone shape and colours, its connector, its motif strip, its lettering, its
// colour edge, and how things arrive. A site with no look block still gets a
// tidy branded version from its colours, fonts and radius alone.
//
//   KitScope       the wrapper: sets the look's CSS variables for the current
//                  scheme and loads the one stylesheet (css.ts). Everything
//                  below must sit inside one.
//   Marker         the section marker (Auburn: three gold steps)
//   SectionRule    marker + optional small-caps label + hairline (a heading's rule)
//   KitPanel       a titled panel: SectionRule with a real heading, then children
//   Stone          a numbered or plain stone in the look's shape and colours (a
//                  brick gets a printed rim and the look's flecks, card 180)
//   SeverityStone  a stone in a callout tone, with words ("Needs doing")
//   StepPath       numbered stones joined by the connector, down or across
//   KitNotice      a callout: note (sky), tip (gold), careful (brick), plain
//   UiChip         a small faithful copy of a real Studio button ("Publish")
//   InlineText     guide text with **bold**, `buttons` and _asides_
//   StoneTag       a badge on a stone-cut tag; StatusBadge for "who does this"
//   ArtTile        a meaning's icon (the site's art where it has some) on a stone
//   KitCard        a card that opens something: art, title, a line
//   PullQuote      a large display-font line with the marker
//   ColourEdge     the four-colour top edge (Auburn's This Sunday card)
//   Sill           the motif strip along a foot, or the colour edge without one
//   Lettering      words in the site's display lettering, colours cycling
//   PageBanner     the deep-colour banner: eyebrow, lettered title, lead, art
//   KitLoading     the marker's pieces laid in turn (replaces a spinner)
//
// No @sanity/ui hooks beyond the theme, and no Studio hooks at all, so every
// piece renders on a bare test page too (scripts/studio-harness/).
// =============================================================================

import {
  Fragment,
  useEffect,
  useId,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useRootTheme } from '@sanity/ui';
import {
  chipKind,
  inlineParts,
  stoneBox,
  stonePath,
  type MarkerArt,
  type SchemeTokens,
} from '../../../lib/studio-look';
import { fontFaceCss, letteringStack } from '../../../lib/studio-banner';
import type { BrandIconKey } from '../../../lib/studio-icons';
import { brandIcon } from '../../brandIcons';
import { UI_CSS } from './css';
import { LOOK, SURFACE_RADIUS } from './look';

export type Tone = 'note' | 'tip' | 'careful' | 'plain';

// -----------------------------------------------------------------------------
// Scope
// -----------------------------------------------------------------------------

function vars(t: SchemeTokens, fonts: { display: string; body: string }): CSSProperties {
  return {
    '--ui-paper': t.paper,
    '--ui-surface': t.surface,
    '--ui-ink': t.ink,
    '--ui-muted': t.muted,
    '--ui-rule': t.rule,
    '--ui-heading': t.heading,
    '--ui-marker': t.marker,
    '--ui-connector': t.connector,
    '--ui-focus': t.focus,
    '--ui-display': fonts.display,
    '--ui-display-weight': 400,
    '--ui-body': fonts.body,
    '--ui-radius': `${SURFACE_RADIUS}px`,
    '--ui-tag-radius':
      LOOK.stone === 'pebble'
        ? '14px 9px 13px 8px / 9px 13px 8px 12px'
        : LOOK.stone === 'square'
          ? '6px'
          : '999px',
    '--chip-bg': t.chip.bg,
    '--chip-fg': t.chip.fg,
    '--chip-border': t.chip.border,
    '--chip-tool-bg': t.chipTool.bg,
    '--chip-tool-fg': t.chipTool.fg,
    '--chip-pos-bg': t.chipPositive.bg,
    '--chip-pos-fg': t.chipPositive.fg,
    '--chip-crit-bg': t.chipCritical.bg,
    '--chip-crit-fg': t.chipCritical.fg,
    '--ui-banner-bg': LOOK.banner.bg,
    '--ui-banner-ink': LOOK.banner.ink,
    '--ui-banner-muted': LOOK.banner.muted,
    '--ui-banner-accent': LOOK.banner.accent,
  } as CSSProperties;
}

/** The current scheme's tokens (light or dark, as the Studio's Appearance is). */
export function useLookTokens(): SchemeTokens {
  const { scheme } = useRootTheme();
  return scheme === 'dark' ? LOOK.dark : LOOK.light;
}

function toneVars(t: SchemeTokens, tone: Tone): CSSProperties {
  const v = t.tones[tone];
  return { '--tone-bg': v.bg, '--tone-title': v.title, '--tone-mark': v.mark } as CSSProperties;
}

/**
 * Card 131: the stylesheet goes into <head> ONCE, however many scopes a screen
 * has (Home draws a dozen cards; each used to carry its own copy).
 */
function useKitStyles(css: string) {
  useInsertionEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'ncs-ui-css';
    const el =
      (document.getElementById(id) as HTMLStyleElement | null) ?? document.createElement('style');
    if (!el.id) {
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [css]);
}

/** The wrapper every primitive sits in. `as` defaults to a div. */
export function KitScope({
  children,
  className,
  style,
  inline,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** A span instead of a div, for a scope inside a line of text (card 134). */
  inline?: boolean;
}) {
  const root = useRootTheme();
  const font = root.theme.v2?.font;
  const fonts = {
    display: font?.heading.family ?? 'Georgia, serif',
    body: font?.text.family ?? 'system-ui, sans-serif',
  };
  const t = root.scheme === 'dark' ? LOOK.dark : LOOK.light;
  const face = LOOK.lettering ? fontFaceCss(LOOK.lettering.family, LOOK.lettering.src) : '';
  useKitStyles(UI_CSS + (face ?? ''));
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      className={['ncs-ui', className].filter(Boolean).join(' ')}
      style={{ ...vars(t, fonts), ...style }}
    >
      {children}
    </Tag>
  );
}

// -----------------------------------------------------------------------------
// Motion: in view, and allowed
// -----------------------------------------------------------------------------

/** Adds the animation hooks (.ncs-anim, then .is-in when seen) unless motion is reduced. */
function useArrive<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<'still' | 'waiting' | 'in'>('still');
  useEffect(() => {
    const el = ref.current;
    if (!el || LOOK.motion === 'none' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setState('waiting');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('in');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const className = state === 'still' ? '' : state === 'waiting' ? 'ncs-anim' : 'ncs-anim is-in';
  return { ref, className };
}

// -----------------------------------------------------------------------------
// Marker, rule, panel
// -----------------------------------------------------------------------------

/** The site's section marker. Decorative. `scale` 1 is the site's own size (Auburn 78 x 36). */
export function Marker({ scale = 1 }: { scale?: number }) {
  const m = LOOK.marker;
  if (typeof m === 'object') {
    const art = m as MarkerArt;
    return (
      <img
        className="ui-marker"
        src={art.src}
        alt=""
        aria-hidden
        draggable={false}
        width={Math.round(art.width * scale)}
        height={Math.round(art.height * scale)}
      />
    );
  }
  const fill = 'var(--ui-marker)';
  if (m === 'steps') {
    // Three steps rising to the right, the generic form of a stepping-stone marker.
    return (
      <svg
        className="ui-marker"
        viewBox="0 0 78 36"
        width={78 * scale}
        height={36 * scale}
        aria-hidden
      >
        <rect x="1" y="23" width="25" height="12" rx="4" fill={fill} transform="rotate(-4 13 29)" />
        <rect
          x="29"
          y="12"
          width="21"
          height="10"
          rx="4"
          fill={fill}
          transform="rotate(-4 40 17)"
        />
        <rect x="54" y="3" width="18" height="9" rx="3.5" fill={fill} transform="rotate(-4 63 7)" />
      </svg>
    );
  }
  if (m === 'rule') {
    return (
      <svg
        className="ui-marker"
        viewBox="0 0 40 12"
        width={40 * scale}
        height={12 * scale}
        aria-hidden
      >
        <rect y="2" width="40" height="2.5" fill={fill} />
        <rect y="7.5" width="40" height="2.5" fill={fill} />
      </svg>
    );
  }
  if (m === 'diamond') {
    return (
      <svg
        className="ui-marker"
        viewBox="0 0 16 16"
        width={16 * scale}
        height={16 * scale}
        aria-hidden
      >
        <path d="M8 1L15 8L8 15L1 8Z" fill={fill} />
      </svg>
    );
  }
  return (
    <svg
      className="ui-marker"
      viewBox="0 0 12 12"
      width={12 * scale}
      height={12 * scale}
      aria-hidden
    >
      <circle cx="6" cy="6" r="5" fill={fill} />
    </svg>
  );
}

/** The rule above a section: marker, an optional small-caps label, a hairline. */
export function SectionRule({ label, style }: { label?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="ui-rule" style={style} aria-hidden={label ? undefined : true}>
      <Marker />
      {label && <span className="ui-eyebrow">{label}</span>}
    </div>
  );
}

/** A titled panel: the rule, then a real heading, then the content. */
export function KitPanel({
  title,
  label,
  as: H = 'h2',
  children,
  id,
}: {
  title: ReactNode;
  label?: ReactNode;
  as?: 'h2' | 'h3';
  children?: ReactNode;
  id?: string;
}) {
  return (
    <section className="ui-panel" aria-labelledby={id}>
      <SectionRule label={label} />
      <H id={id} className={H === 'h2' ? 'ui-h2' : 'ui-h3'}>
        {title}
      </H>
      {children}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Stones
// -----------------------------------------------------------------------------

/** A stone: the look's shape, coloured by `index` through the mark colours (or `fill`). */
export function Stone({
  index = 0,
  n,
  size = 48,
  fill,
  edge,
  color,
  seed,
  label,
}: {
  index?: number;
  n?: ReactNode;
  size?: number;
  fill?: string;
  /** An outline, so a true brand hue can sit on a pale ground and still hold 3:1. */
  edge?: string;
  color?: string;
  seed?: number;
  label?: string;
}) {
  const t = useLookTokens();
  const s = t.stones[index % t.stones.length];
  const { w, h } = stoneBox(LOOK.stone, size);
  const d = useMemo(() => stonePath(LOOK.stone, seed ?? index * 5 + 3, w, h), [seed, index, w, h]);
  // useId can hold characters a url(#id) reference will not take, so keep the safe ones.
  const clip = `stone${useId().replace(/[^\w-]/g, '')}`;
  // Card 180: a filled stone (not an outlined, waiting one) carries the print: a brick's darker
  // rim, heavier along the bottom, and the look's flecks over the colour.
  const printed = !edge;
  const brick = LOOK.stone === 'brick' && printed;
  const flecks = printed ? LOOK.stoneFlecks : undefined;
  return (
    <span
      className="ui-stone"
      style={{ width: w, height: h, color: color ?? s.text }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path
          d={d}
          fill={fill ?? s.fill}
          stroke={edge}
          strokeWidth={edge ? Math.max(1.5, Math.min(2.25, size / 18)) : undefined}
          strokeLinejoin="round"
        />
        {(flecks || brick) && (
          <clipPath id={clip}>
            <path d={d} />
          </clipPath>
        )}
        {flecks && (
          <image
            href={flecks}
            width={w}
            height={h}
            preserveAspectRatio="none"
            clipPath={`url(#${clip})`}
          />
        )}
        {brick && (
          // Inside the brick, as the site's own printed bricks draw it: a 2px rim all round and a
          // 4px band along the bottom, both a shade of black over the colour.
          <g clipPath={`url(#${clip})`}>
            <path d={d} fill="none" stroke="rgb(0 0 0 / 0.2)" strokeWidth={4} />
            <rect y={h - 4} width={w} height={4} fill="rgb(0 0 0 / 0.16)" />
          </g>
        )}
      </svg>
      {n !== undefined && (
        <b style={{ fontSize: Math.round(size * (LOOK.stone === 'brick' ? 0.4 : 0.42)) }}>{n}</b>
      )}
    </span>
  );
}

const SEVERITY: Record<'needs' | 'worth' | 'good', { tone: Tone; words: string }> = {
  needs: { tone: 'careful', words: 'Needs doing' },
  worth: { tone: 'tip', words: 'Worth a look' },
  good: { tone: 'note', words: 'Good to know' },
};

/** A small stone in a callout tone, with its words beside it. */
export function SeverityStone({
  level,
  children,
}: {
  level: 'needs' | 'worth' | 'good';
  children?: ReactNode;
}) {
  const t = useLookTokens();
  const s = SEVERITY[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
      <Stone
        size={16}
        fill={t.tones[s.tone].fill}
        edge={t.tones[s.tone].mark}
        seed={level.length * 11}
      />
      <span>{children ?? s.words}</span>
    </span>
  );
}

/** Numbered steps: stones joined by the site's connector. The path arrives as it scrolls in. */
export function StepPath({
  items,
  across = false,
  start = 1,
}: {
  items: ReactNode[];
  across?: boolean;
  start?: number;
}) {
  const { ref, className } = useArrive<HTMLOListElement>();
  return (
    <ol
      ref={ref}
      start={start}
      className={[
        'ui-steps',
        across ? 'ui-steps--across' : '',
        `ui-motion--${LOOK.motion}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item, i) => (
        <li key={i} className="ui-step" style={{ '--i': i } as CSSProperties}>
          <Stone index={i} n={start + i} size={48} />
          {i < items.length - 1 && LOOK.connector !== 'none' && (
            <span aria-hidden className={`ui-step__link ui-link--${LOOK.connector}`} />
          )}
          <div className="ui-step__body">{item}</div>
        </li>
      ))}
    </ol>
  );
}

// -----------------------------------------------------------------------------
// Words
// -----------------------------------------------------------------------------

/** A small faithful copy of a real Studio button: green Publish, the navy tool tabs, the rest plain. */
export function UiChip({ name }: { name: string }) {
  const kind = chipKind(name);
  return <span className={`ui-chip ui-chip--${kind}`}>{name}</span>;
}

/** Guide text: **bold**, `a button` (drawn as the button), _an aside_. */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === 'bold' ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === 'button' ? (
          <UiChip key={i} name={p.text} />
        ) : p.kind === 'aside' ? (
          <em key={i}>{p.text}</em>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

/** A callout in one of the look's tones, its stone as the marker. */
export function KitNotice({
  tone = 'note',
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const t = useLookTokens();
  const seed = { note: 21, tip: 22, careful: 23, plain: 24 }[tone];
  return (
    <aside className="ui-notice" style={toneVars(t, tone)}>
      <Stone size={30} fill={t.tones[tone].fill} edge={t.tones[tone].mark} seed={seed} />
      <div className="ui-notice__body">
        {title && <p className="ui-notice__title">{title}</p>}
        <div>{children}</div>
      </div>
    </aside>
  );
}

/** A badge cut like a stone. `onDark` for the banner. */
export function StoneTag({
  tone = 'note',
  onDark = false,
  children,
}: {
  tone?: Tone;
  onDark?: boolean;
  children: ReactNode;
}) {
  const t = useLookTokens();
  return (
    <span
      className={['ui-tag', onDark ? 'ui-tag--on-dark' : ''].join(' ').trim()}
      style={toneVars(t, tone)}
    >
      <Stone
        size={13}
        fill={onDark ? LOOK.banner.accent : t.tones[tone].fill}
        edge={onDark ? undefined : t.tones[tone].mark}
        seed={tone.length}
      />
      {children}
    </span>
  );
}

/** Who does this job: the guide's `diy` as a stone tag. */
export function StatusBadge({
  level,
  helper,
  onDark,
}: {
  level?: 'self' | 'ask' | 'mixed';
  helper: string;
  onDark?: boolean;
}) {
  if (level === 'self')
    return (
      <StoneTag tone="note" onDark={onDark}>
        You can do this yourself
      </StoneTag>
    );
  if (level === 'ask')
    return (
      <StoneTag tone="careful" onDark={onDark}>
        Ask {helper} first
      </StoneTag>
    );
  if (level === 'mixed')
    return (
      <StoneTag tone="tip" onDark={onDark}>
        Mostly yourself, see below
      </StoneTag>
    );
  return null;
}

/** A large display-font line, led by the marker. */
export function PullQuote({ children, cite }: { children: ReactNode; cite?: ReactNode }) {
  return (
    <figure className="ui-quote">
      <Marker scale={0.7} />
      <blockquote className="ui-quote__text">{children}</blockquote>
      {cite && <figcaption className="ui-quote__cite">{cite}</figcaption>}
    </figure>
  );
}

// -----------------------------------------------------------------------------
// Art, edges, lettering
// -----------------------------------------------------------------------------

/** A meaning's icon on a stone: the site's own art where it has some. `ground` is the stone's colour. */
export function ArtTile({
  meaning,
  icon,
  size = 56,
  ground,
  seed = 7,
}: {
  meaning?: BrandIconKey;
  icon?: ComponentType;
  size?: number;
  ground?: string;
  seed?: number;
}) {
  const t = useLookTokens();
  const Icon = (icon ?? brandIcon(meaning ?? 'guide')) as ComponentType;
  const d = useMemo(() => stonePath(LOOK.stone, seed, size, size), [seed, size]);
  return (
    <span className="ui-art" style={{ width: size, height: size }} aria-hidden>
      <svg className="ui-art__ground" viewBox={`0 0 ${size} ${size}`}>
        <path d={d} fill={ground ?? t.tones.note.bg} />
      </svg>
      <span className="ui-art__icon" style={{ fontSize: Math.round(size * 0.62) }}>
        <Icon />
      </span>
    </span>
  );
}

/** The colour edge along a top: the look's edge colours in equal parts. */
export function ColourEdge({ height = 5 }: { height?: number }) {
  const c = LOOK.edgeColors;
  const stops = c.map((x, i) => `${x} ${(i / c.length) * 100}% ${((i + 1) / c.length) * 100}%`);
  return (
    <span
      aria-hidden
      className="ui-edge"
      style={{ height, background: `linear-gradient(90deg, ${stops.join(', ')})` }}
    />
  );
}

/** The site's motif strip along a foot (its phone version under 600px), or the colour edge. */
export function Sill() {
  if (!LOOK.motif) return <ColourEdge />;
  return (
    <picture>
      {LOOK.motifNarrow && <source media="(max-width: 599px)" srcSet={LOOK.motifNarrow} />}
      <img className="ui-sill" src={LOOK.motif} alt="" aria-hidden draggable={false} />
    </picture>
  );
}

/** Words in the site's lettering, colours cycling letter by letter. Plain text without lettering. */
export function Lettering({ text, colors }: { text: string; colors?: string[] }) {
  const l = LOOK.lettering;
  const cycle = colors ?? l?.colors ?? [];
  if (!l || !cycle.length) return <>{text}</>;
  let k = 0;
  return (
    <span
      aria-label={text}
      role="text"
      style={{ fontFamily: letteringStack(l.family, 'var(--ui-display)') }}
    >
      {[...text].map((c, i) =>
        /\s/.test(c) ? (
          ' '
        ) : (
          <span key={i} aria-hidden style={{ color: cycle[k++ % cycle.length] }}>
            {c}
          </span>
        ),
      )}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Banner, card, loading
// -----------------------------------------------------------------------------

/** The deep-colour banner a page opens with. */
export function PageBanner({
  eyebrow,
  title,
  lead,
  meaning,
  icon,
  foot,
  compact = false,
  headingId,
}: {
  eyebrow?: ReactNode;
  title: string;
  lead?: ReactNode;
  meaning?: BrandIconKey;
  icon?: ComponentType;
  foot?: ReactNode;
  compact?: boolean;
  headingId?: string;
}) {
  return (
    <section
      className={['ui-banner', compact ? 'ui-banner--compact' : ''].join(' ').trim()}
      aria-labelledby={headingId}
    >
      <div className="ui-banner__in">
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <p className="ui-banner__eyebrow ui-eyebrow">
              {!compact && <Marker scale={0.62} />}
              {eyebrow}
            </p>
          )}
          <h1 id={headingId} className="ui-banner__title">
            <Lettering text={title} />
          </h1>
          {lead && <p className="ui-banner__lead">{lead}</p>}
          {foot && <div className="ui-banner__foot">{foot}</div>}
        </div>
        {(meaning || icon) && (
          <span className="ui-banner__disc">
            <ArtTile
              meaning={meaning}
              icon={icon}
              size={compact ? 56 : 128}
              ground={LOOK.light.paper}
              seed={title.length}
            />
          </span>
        )}
      </div>
      {!compact && <Sill />}
    </section>
  );
}

/** A card that opens something. Renders a button, or a link when `href` is given. */
export function KitCard({
  title,
  lead,
  meaning,
  icon,
  href,
  onClick,
}: {
  title: ReactNode;
  lead?: ReactNode;
  meaning?: BrandIconKey;
  icon?: ComponentType;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const inner = (
    <>
      <ArtTile meaning={meaning} icon={icon} size={56} seed={String(title).length + 3} />
      <span>
        <span className="ui-card__title">{title}</span>
        {lead && <span className="ui-card__lead">{lead}</span>}
      </span>
    </>
  );
  return href ? (
    <a className="ui-card" href={href} onClick={onClick}>
      {inner}
    </a>
  ) : (
    <button type="button" className="ui-card" onClick={onClick}>
      {inner}
    </button>
  );
}

/** Waiting: the marker's pieces laid in turn. Still under reduced motion. */
export function KitLoading({ label = 'Loading' }: { label?: string }) {
  const { ref, className } = useArrive<HTMLSpanElement>();
  return (
    <span className="ui-loading" role="status" aria-label={label ? undefined : 'Loading'}>
      <span ref={ref} className={['ui-loading__stones', className].join(' ').trim()}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ '--i': i } as CSSProperties}>
            <Stone index={i} size={16} seed={i + 40} />
          </span>
        ))}
      </span>
      {label}
    </span>
  );
}
