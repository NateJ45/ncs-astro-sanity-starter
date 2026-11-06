// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Report screen (Studio kit, PORTS.md card 218)
// =============================================================================
// A site's numbers by Month, Quarter or Year against the same period a year
// before. Plain React with no Sanity hooks, so the same screen is drawn by the
// Studio tool (BoardTool.tsx: the real route and the Studio's theme) and by the
// bench page (BoardBench.tsx: made-up numbers), which is what the tests open.
//
//   config   the site's own parts, words and measures (src/config/board.ts)
//   load     (p, k) -> the route's answer, or 'signed-out'
//   tokens   colours and type from the site's Studio look (boardTokens())
//
// The arithmetic is src/lib/studio-board.ts. The charts are the shared kit
// (ncs-charts.js and .css, the same bytes the WordPress themes carry): each is
// a <figure> the kit draws into, with its own type switch and a "More" menu
// (Enlarge, Table, Save picture, Copy numbers). There is no chart library.
// =============================================================================

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  boardPeriod,
  boardView,
  formatCount,
  NOT_TRACKED,
  periodOptions,
  switchKind,
  todayIn,
  ymLabel,
  type BoardAnswer,
  type BoardConfig,
  type ChartSpec,
  type ChartView,
  type PeriodKind,
  type TileView,
} from '../../../lib/studio-board';
import type { SchemeTokens } from '../../../lib/studio-look';
import { BOARD_CSS } from './boardCss';
import chartsCss from './ncs-charts.css?raw';
import './ncs-charts.js';

declare global {
  interface Window {
    ncsCharts?: {
      render: (fig: HTMLElement, spec: ChartSpec) => void;
      defaults: { locale?: string; currency?: string };
    };
  }
}

export type BoardLoad = (p: PeriodKind, k: string) => Promise<BoardAnswer | 'signed-out'>;

export interface BoardTokens {
  scheme: SchemeTokens;
  dark: boolean;
  fonts: { display: string; body: string };
  radius: number;
}

/** The site's Studio look as the screen's --brd-* and the chart kit's --ncs-chart-* properties. */
export function boardTokens({ scheme: t, dark, fonts, radius }: BoardTokens): CSSProperties {
  const mix = (a: string, b: string, pc: number) => `color-mix(in srgb, ${a} ${pc}%, ${b})`;
  return {
    '--brd-paper': t.paper,
    '--brd-surface': t.surface,
    '--brd-ink': t.ink,
    '--brd-muted': t.muted,
    '--brd-rule': t.rule,
    '--brd-rule-strong': mix(t.ink, t.paper, 38),
    '--brd-heading': t.heading,
    '--brd-marker': t.marker,
    // The marker colour as small text: pulled toward the ink until it reads.
    '--brd-marker-ink': mix(t.marker, t.ink, 55),
    '--brd-focus': t.focus,
    '--brd-display': fonts.display,
    '--brd-display-weight': 400,
    '--brd-body': fonts.body,
    '--brd-radius': `${Math.min(radius, 10)}px`,
    '--brd-good-bg': t.chipPositive.bg,
    '--brd-good-fg': t.chipPositive.fg,
    '--brd-bad-bg': t.chipCritical.bg,
    '--brd-bad-fg': t.chipCritical.fg,
    '--brd-flat-bg': mix(t.ink, t.paper, 10),
    '--brd-flat-fg': t.ink,
    '--brd-careful': t.tones.careful.mark,
    '--brd-careful-bg': t.tones.careful.bg,
    '--brd-note-bg': mix(t.ink, t.paper, 6),
    '--brd-hatch': mix(t.ink, t.paper, 14),
    // The chart kit's names (ncs-charts.js header). "navy" is its ink colour
    // for titles and the first tone's partner; "ox" is this year's colour.
    '--ncs-chart-navy': t.heading,
    '--ncs-chart-ox': t.marker,
    '--ncs-chart-then': mix(t.ink, t.paper, dark ? 50 : 42),
    '--ncs-chart-muted': t.muted,
    '--ncs-chart-ok': t.chipPositive.fg,
    '--ncs-chart-warn': t.tones.careful.mark,
    '--ncs-chart-ink': t.ink,
    '--ncs-chart-text': t.ink,
    '--ncs-chart-paper': t.paper,
    '--ncs-chart-bone': t.paper,
    '--ncs-chart-cream': mix(t.ink, t.paper, 6),
    '--ncs-chart-line': t.rule,
    '--ncs-chart-line-strong': mix(t.ink, t.paper, 38),
    '--ncs-chart-on-dark': t.paper,
    '--ncs-chart-shadow': 'rgb(0 0 0 / 0.22)',
    '--ncs-chart-sans': fonts.body,
    '--ncs-chart-serif': fonts.display,
  } as CSSProperties;
}

// -----------------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------------

const Chevron = ({ dir }: { dir: 'left' | 'right' | 'down' }) => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path
      d={dir === 'left' ? 'M8 1 3 6l5 5' : dir === 'right' ? 'M4 1l5 5-5 5' : 'M1 4l5 5 5-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** The "i" button and the explanation it opens, for a tile or a part. */
function useExplain(about: string) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = (
    <button
      type="button"
      className="ncs-brd__i"
      aria-expanded={open}
      aria-controls={id}
      aria-label={`${open ? 'Hide' : 'Show'} how ${about} is counted`}
      onClick={() => setOpen((o) => !o)}
    >
      i
    </button>
  );
  return { open, id, button };
}

/** Twelve months as a line. A month not tracked yet is a hatched band, never a point at zero. */
function Sparkline({ tile }: { tile: TileView }) {
  const pts = tile.spark;
  const vals = pts.map((p) => p.value).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const W = 120;
  const H = 34;
  const max = Math.max(...vals, 1);
  const step = W / Math.max(pts.length - 1, 1);
  const y = (v: number) => H - 3 - (v / max) * (H - 8);
  let d = '';
  let pen = false;
  pts.forEach((p, i) => {
    if (p.value === null) pen = false;
    else {
      d += `${pen ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(p.value).toFixed(1)}`;
      pen = true;
    }
  });
  const gapEnd = pts.findIndex((p) => p.value !== null);
  const last = pts.length - 1;
  const lastVal = pts[last].value;
  const hatch: string[] = [];
  for (let x = 2; gapEnd > 0 && x < gapEnd * step - 2; x += 5) hatch.push(`M${x} ${H - 1}l6 -10`);
  return (
    <svg
      className="ncs-brd__spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${tile.label}, ${ymLabel(pts[0].ym)} to ${ymLabel(pts[last].ym)}: ${pts
        .map((p) => (p.value === null ? 'not tracked' : formatCount(p.value)))
        .join(', ')}`}
    >
      <path className="is-base" d={`M0 ${H - 1}H${W}`} />
      {hatch.length > 0 && <path className="is-gap" d={hatch.join('')} />}
      <path d={d} />
      {lastVal !== null && <path className="is-dot" d={`M${W} ${y(lastVal).toFixed(1)}h0.01`} />}
    </svg>
  );
}

function Tile({ tile, spark }: { tile: TileView; spark: boolean }) {
  const ex = useExplain(tile.label);
  return (
    <li className="ncs-brd__tile" data-measure={tile.measure}>
      <div className="ncs-brd__tile-top">
        <h3 className="ncs-brd__label">{tile.label}</h3>
        {tile.explain && ex.button}
      </div>
      {tile.value === null ? (
        <p className="ncs-brd__num is-none">{NOT_TRACKED}</p>
      ) : (
        <p className="ncs-brd__num">{formatCount(tile.value)}</p>
      )}
      <div className="ncs-brd__meta">
        {tile.delta && (
          <span className={`ncs-brd__chip is-${tile.delta.tone}`}>{tile.delta.chip}</span>
        )}
        <p className="ncs-brd__line">{tile.delta ? `on ${tile.delta.against}` : tile.line}</p>
      </div>
      {tile.explain && (
        <p className="ncs-brd__explain" id={ex.id} hidden={!ex.open}>
          {tile.explain}
        </p>
      )}
      {spark && <Sparkline tile={tile} />}
    </li>
  );
}

function Chart({ chart }: { chart: ChartView }) {
  const ref = useRef<HTMLElement>(null);
  const spec = chart.spec;
  const json = spec ? JSON.stringify(spec) : '';
  useEffect(() => {
    if (ref.current && json) window.ncsCharts?.render(ref.current, JSON.parse(json) as ChartSpec);
  }, [json]);
  if (!spec) {
    return (
      <div className="ncs-brd__empty" data-board-chart={chart.id}>
        <h3>{chart.title}</h3>
        <p>{chart.empty}</p>
      </div>
    );
  }
  return <figure ref={ref} className="ncs-brd__fig" data-compact="" data-board-chart={chart.id} />;
}

function remembered(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function Part({
  part,
  storeKey,
}: {
  part: ReturnType<typeof boardView>['parts'][number];
  storeKey: string;
}) {
  const ex = useExplain(part.title);
  const key = `${storeKey}${part.id}`;
  const [more, setMore] = useState(() => remembered(key));
  const moreId = useId();
  const headId = useId();
  return (
    <section className="ncs-brd__part" aria-labelledby={headId} data-part={part.id}>
      <div className="ncs-brd__part-head">
        <h2 id={headId}>{part.title}</h2>
        {part.explain && ex.button}
      </div>
      {part.explain && (
        <p className="ncs-brd__explain" id={ex.id} hidden={!ex.open}>
          {part.explain}
        </p>
      )}
      {part.tiles.length > 0 && (
        <ul className="ncs-brd__tiles">
          {part.tiles.map((t) => (
            <Tile key={t.measure} tile={t} spark={false} />
          ))}
        </ul>
      )}
      {part.charts.length > 0 && (
        <div className="ncs-brd__charts">
          {part.charts.map((c) => (
            <Chart key={c.id} chart={c} />
          ))}
        </div>
      )}
      {part.more.length > 0 && (
        <>
          <button
            type="button"
            className="ncs-brd__more"
            aria-expanded={more}
            aria-controls={moreId}
            onClick={() => {
              const next = !more;
              setMore(next);
              try {
                window.localStorage.setItem(key, next ? '1' : '0');
              } catch {
                // Private browsing: it simply is not remembered.
              }
            }}
          >
            {more ? 'Show less' : `Show more: ${part.title}`}
            <Chevron dir="down" />
          </button>
          <div className="ncs-brd__charts" id={moreId} hidden={!more}>
            {more && part.more.map((c) => <Chart key={c.id} chart={c} />)}
          </div>
        </>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// The screen
// -----------------------------------------------------------------------------

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' | 'failed' | 'connect' }
  | { kind: 'not-set-up'; reason: string }
  | { kind: 'ok'; answer: Extract<BoardAnswer, { report: unknown }> };

const KINDS: { p: PeriodKind; label: string; pick: string }[] = [
  { p: 'm', label: 'Month', pick: 'Which month' },
  { p: 'q', label: 'Quarter', pick: 'Which quarter' },
  { p: 'y', label: 'Year', pick: 'Which year' },
];

export function BoardScreen({
  config,
  load,
  tokens,
  helperName,
  initial,
}: {
  config: BoardConfig;
  load: BoardLoad;
  tokens: BoardTokens;
  /** Who to ask when it is not connected. */
  helperName: string;
  initial?: { p?: string; k?: string; today?: string };
}) {
  const [today, setToday] = useState(() => initial?.today ?? todayIn(config.timeZone));
  const [sel, setSel] = useState(() => {
    const per = boardPeriod(config, initial?.p, initial?.k, today);
    return { p: per.p, k: per.k };
  });
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    load(sel.p, sel.k)
      .then((a): State => {
        if (a === 'signed-out') return { kind: 'signed-out' };
        if (!a.configured) return { kind: 'not-set-up', reason: a.reason };
        if ('connect' in a) return { kind: 'connect' };
        if ('error' in a) return { kind: 'failed' };
        return { kind: 'ok', answer: a };
      })
      .catch((): State => ({ kind: 'failed' }))
      .then((s) => {
        if (cancelled) return;
        if (s.kind === 'ok') setToday(s.answer.today);
        setState(s);
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, sel, attempt]);

  if (typeof window !== 'undefined' && window.ncsCharts) {
    window.ncsCharts.defaults.locale = 'en-US';
  }

  const per = useMemo(() => boardPeriod(config, sel.p, sel.k, today), [config, sel, today]);
  const options = useMemo(() => periodOptions(config, sel.p, today), [config, sel.p, today]);
  const at = options.findIndex((o) => o.k === per.k);
  const view = useMemo(
    () =>
      state.kind === 'ok' && state.answer.p === per.p && state.answer.k === per.k
        ? boardView(config, per, state.answer.report, today)
        : null,
    [config, per, state, today],
  );
  const go = (p: PeriodKind, k: string) => setSel({ p, k });
  const pick = KINDS.find((x) => x.p === sel.p)!;
  const fetched =
    state.kind === 'ok' && state.answer.at
      ? new Date(state.answer.at).toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';

  return (
    <div className="ncs-brd" data-ncs-board="" style={boardTokens(tokens)}>
      <style>{chartsCss + BOARD_CSS}</style>
      <header className="ncs-brd__head">
        <div>
          <p className="ncs-brd__kicker">{config.siteName} report</p>
          <h1 className="ncs-brd__title" data-board-title="">
            {per.title}
          </h1>
          <p className="ncs-brd__sub" data-board-sub="">
            {per.running ? (
              <>
                <strong>{per.through.replace(/^so far/, 'So far')}.</strong> Each number is set
                against {per.vs}.
              </>
            ) : (
              <>Each number is set against {per.vs}.</>
            )}
          </p>
        </div>
        <div className="ncs-brd__bar">
          <div className="ncs-brd__kinds" role="group" aria-label="Report by">
            {KINDS.map((x) => (
              <button
                key={x.p}
                type="button"
                aria-pressed={sel.p === x.p}
                onClick={() => go(x.p, switchKind(per, x.p))}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div className="ncs-brd__pick">
            <button
              type="button"
              className="ncs-brd__step"
              aria-label="Earlier"
              disabled={at < 0 || at >= options.length - 1}
              onClick={() => go(sel.p, options[at + 1].k)}
            >
              <Chevron dir="left" />
            </button>
            <select
              aria-label={pick.pick}
              value={per.k}
              onChange={(e) => go(sel.p, e.target.value)}
            >
              {options.map((o) => (
                <option key={o.k} value={o.k}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ncs-brd__step"
              aria-label="Later"
              disabled={at <= 0}
              onClick={() => go(sel.p, options[at - 1].k)}
            >
              <Chevron dir="right" />
            </button>
          </div>
          {fetched && <p className="ncs-brd__fresh">From Google, as of {fetched}</p>}
        </div>
        {config.parts.length > 1 && (
          <nav className="ncs-brd__nav" aria-label="Parts of the report">
            {config.parts.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() =>
                  document
                    .querySelector(`[data-part="${part.id}"]`)
                    ?.scrollIntoView({ behavior: 'instant', block: 'start' })
                }
              >
                {part.nav || part.title}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div aria-live="polite" className="ncs-brd__sr">
        {busy ? 'Loading the report.' : view ? `Showing ${per.title}.` : ''}
      </div>

      {state.kind === 'loading' && <div className="ncs-brd__skel" aria-hidden="true" />}

      {state.kind === 'not-set-up' && (
        <div className="ncs-brd__state" data-board-state="not-set-up">
          <h2>The report is not connected yet</h2>
          <p>
            This page shows how many people visit the website and what they do there. It reads those
            numbers from Google Analytics, and this website is not connected to it yet, so there is
            nothing to show. Nothing is wrong with the website itself.
          </p>
          <p>What it needs, which {helperName} can do:</p>
          <ol>
            <li>Google Analytics counting visits on the website.</li>
            <li>
              The website linked to the studio's reporting service, so the Studio can read them.
            </li>
          </ol>
        </div>
      )}
      {state.kind === 'connect' && (
        <div className="ncs-brd__state" data-board-state="connect">
          <h2>Google is not connected</h2>
          <p>
            Ask {helperName} to finish connecting Google. Nothing is wrong with the website itself.
          </p>
        </div>
      )}
      {state.kind === 'signed-out' && (
        <div className="ncs-brd__state" data-board-state="signed-out">
          <h2>Please sign in again</h2>
          <p>Your sign-in has run out. Reload the page, sign in, and the report will be here.</p>
        </div>
      )}
      {state.kind === 'failed' && (
        <div className="ncs-brd__state" data-board-state="failed">
          <h2>The report could not load just now</h2>
          <p>Google did not answer. This usually clears up within a few minutes.</p>
          <button type="button" className="ncs-brd__more" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {state.kind === 'ok' && (
        <div className={`ncs-brd__body${busy || !view ? 'is-busy' : ''}`} aria-busy={busy}>
          {view && (
            <>
              {view.notices.length > 0 && (
                <div className="ncs-brd__notice" role="note" data-board-notice="">
                  {view.notices.map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              )}
              <section className="ncs-brd__overview" aria-label="Overview">
                <h2 className="ncs-brd__sr">Overview</h2>
                <ul className="ncs-brd__tiles">
                  {view.overview.tiles.map((t) => (
                    <Tile key={t.measure} tile={t} spark />
                  ))}
                </ul>
                <div className="ncs-brd__charts is-key">
                  {view.overview.charts.map((c) => (
                    <Chart key={c.id} chart={c} />
                  ))}
                </div>
              </section>
              {view.parts.map((p) => (
                <Part key={p.id} part={p} storeKey="ncs_board_more_" />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
