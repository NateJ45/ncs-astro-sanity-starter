// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit's design language, carried onto every surface (PORTS.md card 131)
// =============================================================================
// Card 128 drew the primitives (primitives.tsx) and the Site Guide with them.
// These are the pieces the rest of the Studio is now built from, each one
// presentational (no Studio hooks, data in by props) so the kit harness can
// render it with fixtures and a screenshot can pin it:
//
//   ToolHead      a tool page's heading: the rule, the art on its stone, a
//                 display-font title and a lead (shared.tsx ToolHeading)
//   KitBox        a Home card / panel: a white card, the marker and a
//                 display-font title, an optional colour edge along the top
//   KitAction     a pill link or button in the site's heading colour
//   ResultCard    a finding: a white card with its severity along the left edge
//   SeverityGroup "Needs doing / Worth a look / Good to know" over a group
//   AllClear      "Nothing in the way": three laid stones and the motif sill
//   CheckPath     a checklist as a path: each stone is the checkbox and fills
//                 when done; the connector is laid between finished stones
//   LiveSteps     Saved, Building, On the website as three stones (and a
//                 compact copy for the navbar line)
//
// Everything sits inside a KitScope (primitives.tsx) for its variables and its
// stylesheet (css.ts). Motion is the look's verb and stops under reduced motion.
// =============================================================================

import {
  useEffect,
  useId,
  useRef,
  type ComponentType,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { stepsLabel, type StepState } from '../../../lib/studio-look';
import type { BrandIconKey } from '../../../lib/studio-icons';
import {
  ArtTile,
  ColourEdge,
  Marker,
  SectionRule,
  Sill,
  Stone,
  useLookTokens,
  type Tone,
} from './primitives';
import { LOOK } from './look';

// -----------------------------------------------------------------------------
// Severity words, shared by the Checkup, Home's Fix-it list and Before you publish
// -----------------------------------------------------------------------------

export type Level = 'needs' | 'worth' | 'good';

export const LEVEL_TONE: Record<Level, Tone> = { needs: 'careful', worth: 'tip', good: 'note' };
export const LEVEL_WORDS: Record<Level, string> = {
  needs: 'Needs doing',
  worth: 'Worth a look',
  good: 'Good to know',
};

/** The Checkup's severity words to a level ("For information" reads "Good to know"). */
export function levelOf(severity: string): Level {
  return severity === 'Needs doing' ? 'needs' : severity === 'Worth a look' ? 'worth' : 'good';
}

// -----------------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------------

/** The tick drawn on a laid stone. */
function Tick() {
  return (
    <svg viewBox="0 0 16 16" width="0.9em" height="0.9em" aria-hidden>
      <path
        d="M3.2 8.6l3 3 6.6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A stone in a step state: laid (its colour, a tick), waiting (an outline, its number). */
export function StateStone({
  state,
  index = 0,
  n,
  size = 40,
}: {
  state: StepState;
  index?: number;
  n?: ReactNode;
  size?: number;
}) {
  const t = useLookTokens();
  const seed = index * 5 + 3;
  if (state === 'done') return <Stone index={index} n={<Tick />} size={size} seed={seed} />;
  if (state === 'now' || state === 'slow' || state === 'failed') {
    const tone = state === 'now' ? 'note' : state === 'slow' ? 'tip' : 'careful';
    return (
      <span className={`ui-state ui-state--${state}`}>
        <Stone
          size={size}
          seed={seed}
          fill={t.tones[tone].bg}
          edge={t.tones[tone].edge}
          color={t.tones[tone].title}
          n={state === 'failed' ? '!' : n}
        />
      </span>
    );
  }
  return <Stone size={size} seed={seed} fill={t.surface} edge={t.muted} color={t.muted} n={n} />;
}

/** A pill link or button in the site's heading colour. `strong` fills it. */
export function KitAction({
  children,
  href,
  onClick,
  strong = false,
  quiet = false,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  strong?: boolean;
  /** A plain underlined link ("See the whole list"). */
  quiet?: boolean;
  disabled?: boolean;
}) {
  const cls = ['ui-action', strong ? 'ui-action--strong' : '', quiet ? 'ui-action--quiet' : '']
    .filter(Boolean)
    .join(' ');
  return href ? (
    <a className={cls} href={href} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Headings and frames
// -----------------------------------------------------------------------------

/** A tool page's heading. */
export function ToolHead({
  title,
  lead,
  label,
  meaning,
  icon,
}: {
  title: ReactNode;
  lead?: ReactNode;
  label?: ReactNode;
  meaning?: BrandIconKey;
  icon?: ComponentType;
}) {
  const t = useLookTokens();
  return (
    <header className="ui-toolhead">
      <SectionRule label={label} />
      <div className="ui-toolhead__row">
        {(meaning || icon) && (
          <ArtTile meaning={meaning} icon={icon} size={64} ground={t.tones.note.bg} seed={11} />
        )}
        <h1 className="ui-toolhead__title">{title}</h1>
      </div>
      {lead && <p className="ui-toolhead__lead">{lead}</p>}
    </header>
  );
}

/** A Home card or panel: the marker, a display-font title, an action, then the body. */
export function KitBox({
  title,
  action,
  meaning,
  edge = false,
  children,
  tone,
}: {
  title: ReactNode;
  action?: ReactNode;
  meaning?: BrandIconKey;
  /** The site's colour edge along the top (Auburn's This Sunday card). */
  edge?: boolean;
  /** A gentle callout ground instead of the white card (Messages' prayer requests use note). */
  tone?: Tone;
  children?: ReactNode;
}) {
  const id = useId();
  const t = useLookTokens();
  const style = tone
    ? ({ background: t.tones[tone].bg, borderColor: 'transparent' } as CSSProperties)
    : undefined;
  return (
    <section className="ui-box" aria-labelledby={id} style={style}>
      {edge && <ColourEdge />}
      <div className="ui-box__head">
        {meaning ? (
          <ArtTile meaning={meaning} size={34} seed={String(title).length} />
        ) : (
          <Marker scale={0.5} />
        )}
        <h2 id={id} className="ui-box__title">
          {title}
        </h2>
        {action && <span className="ui-box__action">{action}</span>}
      </div>
      <div className="ui-box__body">{children}</div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Findings (Checkup, Fix-it list, Before you publish, Help)
// -----------------------------------------------------------------------------

/** A group heading over findings of one level, with how many. */
export function SeverityGroup({
  level,
  count,
  children,
}: {
  level: Level;
  count?: number;
  children?: ReactNode;
}) {
  const t = useLookTokens();
  const tone = t.tones[LEVEL_TONE[level]];
  return (
    <section className="ui-group">
      <h2 className="ui-group__head">
        <Stone size={18} fill={tone.fill} edge={tone.mark} seed={level.length * 11} />
        <span>{LEVEL_WORDS[level]}</span>
        {count !== undefined && <span className="ui-group__count">{count}</span>}
      </h2>
      <div className="ui-group__list">{children}</div>
    </section>
  );
}

/** One finding: a white card, its severity along the left edge. */
export function ResultCard({
  level,
  title,
  detail,
  action,
  dense = false,
  showLevel = false,
}: {
  level: Level;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  /** Home's Fix-it rows: a tighter card with the action beside the words. */
  dense?: boolean;
  /** Say the level in words too (when the card is not under a SeverityGroup). */
  showLevel?: boolean;
}) {
  const t = useLookTokens();
  const tone = t.tones[LEVEL_TONE[level]];
  return (
    <article
      className={['ui-result', dense ? 'ui-result--dense' : ''].join(' ').trim()}
      style={{ '--edge': tone.edge, '--tone-title': tone.title } as CSSProperties}
    >
      <div className="ui-result__words">
        {showLevel && <p className="ui-result__level">{LEVEL_WORDS[level]}</p>}
        <h3 className="ui-result__title">{title}</h3>
        {detail && <p className="ui-result__detail">{detail}</p>}
      </div>
      {action && <div className="ui-result__action">{action}</div>}
    </article>
  );
}

/** Nothing to fix: three laid stones, a display-font line, the motif along the foot. */
export function AllClear({
  title = 'Nothing in the way',
  lead,
  compact = false,
}: {
  title?: ReactNode;
  lead?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={['ui-clear', compact ? 'ui-clear--compact' : ''].join(' ').trim()}>
      <div className="ui-clear__in">
        <span className="ui-clear__stones" aria-hidden>
          {[0, 1, 2].map((i) => (
            <StateStone key={i} state="done" index={i} size={compact ? 22 : 30} />
          ))}
        </span>
        <p className="ui-clear__title">{title}</p>
        {lead && <p className="ui-clear__lead">{lead}</p>}
      </div>
      {!compact && <Sill />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// The checklist as a path
// -----------------------------------------------------------------------------

export interface CheckItem {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  done: boolean;
  /** The editor ticks it (a checkbox); otherwise the kit decides and the stone only shows it. */
  tickable?: boolean;
  busy?: boolean;
  /** A note after the detail, e.g. "Ticked for you." */
  note?: ReactNode;
  action?: ReactNode;
}

/** A checklist laid as a path. Each stone is the checkbox and fills when done. */
export function CheckPath({
  items,
  onToggle,
  idPrefix = 'check',
}: {
  items: CheckItem[];
  onToggle?: (id: string, on: boolean) => void;
  idPrefix?: string;
}) {
  // Only a stone that has just been ticked plays the "laid" motion, never the
  // ones already done when the card opened.
  const before = useRef<Record<string, boolean> | null>(null);
  const fresh = new Set<string>();
  if (before.current)
    for (const it of items) if (it.done && before.current[it.id] === false) fresh.add(it.id);
  useEffect(() => {
    before.current = Object.fromEntries(items.map((it) => [it.id, it.done]));
  });
  return (
    <ol className={`ui-check ui-motion--${LOOK.motion}`}>
      {items.map((it, i) => {
        const inputId = `${idPrefix}-${it.id}`;
        const next = items[i + 1];
        const stone = (
          <StateStone state={it.done ? 'done' : 'todo'} index={i} n={i + 1} size={40} />
        );
        return (
          <li
            key={it.id}
            className={[
              'ui-check__item',
              it.done ? 'is-done' : '',
              fresh.has(it.id) ? 'is-fresh' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {it.tickable ? (
              <label className="ui-check__stone" htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  className="ui-sr"
                  checked={it.done}
                  disabled={it.busy}
                  onChange={(e) => onToggle?.(it.id, e.currentTarget.checked)}
                />
                {stone}
              </label>
            ) : (
              <span className="ui-check__stone" role="img" aria-label={it.done ? 'Done' : 'To do'}>
                {stone}
              </span>
            )}
            {next && LOOK.connector !== 'none' && (
              <span
                aria-hidden
                className={[
                  'ui-step__link',
                  `ui-link--${LOOK.connector}`,
                  it.done && next.done ? 'is-laid' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )}
            <div className="ui-check__body">
              <p className="ui-check__title">
                {it.tickable ? <label htmlFor={inputId}>{it.title}</label> : it.title}
              </p>
              {(it.detail || it.note) && (
                <p className="ui-check__detail">
                  {it.detail}
                  {it.note ? <> {it.note}</> : null}
                </p>
              )}
              {!it.done && it.action && <div className="ui-check__action">{it.action}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// -----------------------------------------------------------------------------
// Is it live: three stones
// -----------------------------------------------------------------------------

/** Saved, Building, On the website. `compact` draws the navbar's small copy, words left to the line. */
export function LiveSteps({
  states,
  words,
  compact = false,
}: {
  states: readonly StepState[];
  words: readonly string[];
  compact?: boolean;
}) {
  const label = stepsLabel(words, states);
  return (
    <ol
      className={['ui-live', compact ? 'ui-live--compact' : ''].join(' ').trim()}
      aria-label={compact ? undefined : label}
      aria-hidden={compact ? true : undefined}
    >
      {words.map((w, i) => {
        const s = states[i] ?? 'todo';
        const laid = s === 'done' && (states[i + 1] === 'done' || states[i + 1] === 'now');
        return (
          <li key={w} className={`ui-live__step is-${s}`}>
            <span className="ui-live__mark">
              <StateStone
                state={s}
                index={i}
                n={compact ? undefined : i + 1}
                size={compact ? 12 : 34}
              />
              {i < words.length - 1 && (
                <span
                  aria-hidden
                  className={['ui-live__link', laid ? 'is-laid' : ''].join(' ').trim()}
                />
              )}
            </span>
            {!compact && <span className="ui-live__word">{w}</span>}
          </li>
        );
      })}
    </ol>
  );
}
