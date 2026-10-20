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
//                 compact copy for the navbar line); finished stones use the
//                 calm colours (look.calm), never the careful one
//   Card 132:     DateBlock (a date chalked on a stone), ArtRow / ArtRows
//                 (Home's list rows), Figure (a display-font number),
//                 MarkBars (bars in the calm colours), StepTrail (named steps
//                 across: Post a photo, the tour); TileCard takes an href
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
import { LIVE_STEP_WORDS, stepsLabel, type StepState } from '../../../lib/studio-look';
import type { BrandIconKey } from '../../../lib/studio-icons';
import {
  ArtTile,
  ColourEdge,
  Marker,
  SectionRule,
  Sill,
  KitScope,
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

/**
 * A stone in a step state: laid (its mark colour, a tick), waiting (the same
 * hand-laid outline drawn in that colour, its number), being laid, slow, failed.
 * `calm` (card 132) lays a finished stone only in the colours that read as
 * "good" (look.calm), so a done "On the website" is never the warning brick.
 */
export function StateStone({
  state,
  index = 0,
  n,
  size = 40,
  calm = false,
}: {
  state: StepState;
  index?: number;
  n?: ReactNode;
  size?: number;
  calm?: boolean;
}) {
  const t = useLookTokens();
  const seed = index * 5 + 3;
  const colour = calm ? t.calm[index % t.calm.length] : index;
  if (state === 'done') return <Stone index={colour} n={<Tick />} size={size} seed={seed} />;
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
  // Waiting: the stone's own shape, outlined in the colour it will be laid in.
  const s = t.stones[colour % t.stones.length];
  return (
    <span className="ui-state ui-state--todo">
      <Stone size={size} seed={seed} fill={t.surface} edge={s.fill} color={t.muted} n={n} />
    </span>
  );
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

/**
 * Card 147: how many findings at each level, at a glance: a stone, a number
 * and the level in words. A level with none is left out.
 */
export function LevelSummary({ counts }: { counts: Partial<Record<Level, number>> }) {
  const t = useLookTokens();
  const levels = (['needs', 'worth', 'good'] as Level[]).filter((l) => (counts[l] ?? 0) > 0);
  if (!levels.length) return null;
  return (
    <ul className="ui-levels" aria-label="How many of each">
      {levels.map((l) => {
        const tone = t.tones[LEVEL_TONE[l]];
        return (
          <li key={l} className="ui-levels__item">
            <Stone size={22} fill={tone.fill} edge={tone.mark} seed={l.length * 11} />
            <b>{counts[l]}</b>
            <span>{LEVEL_WORDS[l]}</span>
          </li>
        );
      })}
    </ul>
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
            <StateStone key={i} state="done" index={i} calm size={compact ? 22 : 30} />
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
      style={
        compact
          ? undefined
          : ({ gridTemplateColumns: `repeat(${words.length}, minmax(0, 1fr))` } as CSSProperties)
      }
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
                calm
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

// -----------------------------------------------------------------------------
// Quick update: the job tiles and the done screen
// -----------------------------------------------------------------------------

/** A big job tile: the colour edge along the top, the art on its stone, a display-font title. */
export function TileCard({
  title,
  lead,
  meaning,
  icon,
  onClick,
  href,
  dataQuick,
}: {
  title: ReactNode;
  lead?: ReactNode;
  meaning?: BrandIconKey;
  icon?: ComponentType;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /** Card 132: a real link (Ctrl or Cmd opens a new tab), with onClick for the Studio's router. */
  href?: string;
  /** Kept for tests and hooks that find a tile by its job ("post-photo"). */
  dataQuick?: string;
}) {
  const t = useLookTokens();
  const body = (
    <>
      <ColourEdge />
      <span className="ui-tile__in">
        <ArtTile
          meaning={meaning}
          icon={meaning ? undefined : icon}
          size={52}
          ground={t.tones.note.bg}
          seed={String(title).length + 5}
        />
        <span style={{ minWidth: 0 }}>
          <span className="ui-tile__title">{title}</span>
          {lead && <span className="ui-tile__lead">{lead}</span>}
        </span>
      </span>
    </>
  );
  return href ? (
    <a className="ui-tile" href={href} onClick={onClick} data-quick={dataQuick}>
      {body}
    </a>
  ) : (
    <button type="button" className="ui-tile" onClick={onClick} data-quick={dataQuick}>
      {body}
    </button>
  );
}

/** Done: the path laid so far (Saved, then Building), a display-font line, what to do next. */
export function DoneCard({
  title,
  lead,
  states,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  /** The three stones; a published job is on its way, a draft is only saved. */
  states: readonly StepState[];
  /** The buttons. */
  children?: ReactNode;
}) {
  return (
    <div className="ui-clear ui-done" role="status">
      <div className="ui-clear__in">
        <LiveSteps states={states} words={['Saved', 'Building', 'On the website']} />
        <p className="ui-clear__title" style={{ marginTop: 10 }}>
          {title}
        </p>
        {lead && <p className="ui-clear__lead">{lead}</p>}
        {children && <div className="ui-done__actions">{children}</div>}
      </div>
      <Sill />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty lists
// -----------------------------------------------------------------------------

/** A list with nothing in it yet: the type's art large, a display-font title, one button, the sill. */
export function EmptyState({
  title,
  lead,
  meaning,
  icon,
  action,
}: {
  title: ReactNode;
  lead?: ReactNode;
  meaning?: BrandIconKey;
  icon?: ComponentType;
  action?: ReactNode;
}) {
  const t = useLookTokens();
  return (
    <section className="ui-clear ui-empty">
      <div className="ui-clear__in">
        {(meaning || icon) && (
          <ArtTile
            meaning={meaning}
            icon={meaning ? undefined : icon}
            size={104}
            ground={t.tones.note.bg}
            seed={9}
          />
        )}
        <h2 className="ui-clear__title">{title}</h2>
        {lead && <p className="ui-clear__lead">{lead}</p>}
        {action && <div className="ui-done__actions">{action}</div>}
      </div>
      <Sill />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Card 132: Home's rows, dates and numbers, and the trail across
// -----------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A date on a stone: the month in small caps over the day in the display font,
 * on a laid stone in a mark colour (cycling by `index`), like a date chalked
 * on a stepping stone. `date` is an ISO date or date-time. Decorative:
 * the row's own words carry the full date for a screen reader.
 */
export function DateBlock({ date, index = 0 }: { date: string; index?: number }) {
  const t = useLookTokens();
  const d = new Date(date.length <= 10 ? `${date}T12:00:00` : date);
  if (Number.isNaN(d.getTime())) return null;
  const s = t.stones[index % t.stones.length];
  // A laid stone in the mark colour, the date chalked on it (the stone's own AA text colour).
  return (
    <span className="ui-date" aria-hidden style={{ color: s.text }}>
      <Stone size={58} index={index} seed={index * 7 + 2} />
      <span className="ui-date__words">
        <span className="ui-date__month">{MONTHS[d.getMonth()]}</span>
        <span className="ui-date__day">{d.getDate()}</span>
      </span>
    </span>
  );
}

/**
 * A row in a Home list: the meaning's art on a small stone (or `lead`, a
 * DateBlock on Coming up), a title, a muted line, a tag, an optional action.
 * The words and art are one link when `href` or `onClick` is given.
 */
export function ArtRow({
  meaning,
  icon,
  lead,
  title,
  meta,
  tag,
  href,
  onClick,
  action,
  seed = 3,
}: {
  meaning?: BrandIconKey;
  icon?: ComponentType;
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  tag?: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  action?: ReactNode;
  seed?: number;
}) {
  const t = useLookTokens();
  const inner = (
    <>
      {lead ?? (
        <ArtTile meaning={meaning} icon={icon} size={44} ground={t.tones.note.bg} seed={seed} />
      )}
      <span className="ui-row__words">
        <span className="ui-row__title">{title}</span>
        {meta && <span className="ui-row__meta">{meta}</span>}
        {tag && <span className="ui-row__tag">{tag}</span>}
      </span>
    </>
  );
  return (
    <li className={['ui-row', action ? 'ui-row--action' : ''].join(' ').trim()}>
      {href ? (
        <a className="ui-row__hit" href={href} onClick={onClick}>
          {inner}
        </a>
      ) : onClick ? (
        <button type="button" className="ui-row__hit" onClick={onClick}>
          {inner}
        </button>
      ) : (
        <span className="ui-row__hit ui-row__hit--still">{inner}</span>
      )}
      {action && <span className="ui-row__action">{action}</span>}
    </li>
  );
}

/** The list ArtRows sit in. */
export function ArtRows({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className="ui-rows" aria-label={label}>
      {children}
    </ul>
  );
}

/** A headline number in the display font, its words beneath (Visitors, subscribers). */
export function Figure({
  value,
  label,
  sub,
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <p className="ui-figure">
      <span className="ui-figure__value">{value}</span>
      <span className="ui-figure__label">{label}</span>
      {sub && <span className="ui-figure__sub">{sub}</span>}
    </p>
  );
}

/**
 * Bars in the calm mark colours in turn, each with its number in words beside
 * it, so the colour never carries the meaning alone.
 */
export function MarkBars({
  rows,
  label,
}: {
  rows: { label: ReactNode; value: number; text?: ReactNode }[];
  label?: string;
}) {
  const t = useLookTokens();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="ui-bars" aria-label={label}>
      {rows.map((r, i) => {
        const s = t.stones[t.calm[i % t.calm.length] % t.stones.length];
        return (
          <li key={i} className="ui-bars__row">
            <span className="ui-bars__label">{r.label}</span>
            <span className="ui-bars__track" aria-hidden>
              <span
                className="ui-bars__bar"
                style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, background: s.fill }}
              />
            </span>
            <span className="ui-bars__value">{r.text ?? r.value}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Named steps across (Post a photo, the tour): the stones laid so far, the one
 * you are on ringed, the rest waiting as outlines. It reads as words too.
 */
export function StepTrail({ words, current }: { words: readonly string[]; current: number }) {
  const states: StepState[] = words.map((_, i) =>
    i < current ? 'done' : i === current ? 'now' : 'todo',
  );
  return (
    <div className="ui-trail">
      <LiveSteps states={states} words={words} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Card 140: toasts in the site's voice
// -----------------------------------------------------------------------------

/**
 * The body of a success toast (a React node for `toast.push({ description })`):
 * the plain sentence, and, for a publish, the three steps as small stones so the
 * editor sees where the update is. Sanity owns the toast frame and title; this
 * is all that can be drawn inside it.
 */
export function KitToastBody({
  children,
  steps,
}: {
  children: ReactNode;
  steps?: readonly StepState[];
}) {
  return (
    <KitScope className="ui-toast">
      <span className="ui-toast__text">{children}</span>
      {steps && (
        <span className="ui-toast__steps">
          <LiveSteps states={steps} words={LIVE_STEP_WORDS} compact />
          <span className="ui-sr">{stepsLabel(LIVE_STEP_WORDS, steps)}</span>
        </span>
      )}
    </KitScope>
  );
}

// -----------------------------------------------------------------------------
// Card 141: a switch that is drawn, not a native checkbox
// -----------------------------------------------------------------------------

/**
 * An on/off switch for a yes-or-no question. It is a button with role="switch"
 * and a track and thumb drawn in the look's colours, so it shows in every
 * browser whatever the Studio's own form resets do to a native checkbox (the
 * Quick update "Sold" box was invisible in real Chrome). The state is also
 * said in words ("Yes" / "No"), never colour alone.
 */
export function KitSwitch({
  id,
  checked,
  onChange,
  label,
  describedBy,
  labelledBy,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  describedBy?: string;
  /** The id of the question's heading, so the name reads "Sold, This one has sold". */
  labelledBy?: string;
}) {
  return (
    <KitScope>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}-label` : undefined}
        className={['ui-switch', checked ? 'is-on' : ''].join(' ').trim()}
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__track" aria-hidden>
          <span className="ui-switch__thumb" />
        </span>
        <span className="ui-switch__label" id={`${id}-label`}>
          {label}
        </span>
        <span className="ui-switch__state">{checked ? 'Yes' : 'No'}</span>
      </button>
    </KitScope>
  );
}
