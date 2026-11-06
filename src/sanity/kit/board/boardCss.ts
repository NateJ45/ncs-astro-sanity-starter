// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Report tool's own look (Studio kit, PORTS.md card 218)
// =============================================================================
// A printed ledger, not a dashboard: one sheet, hairline rules, the numbers in
// the display face, colour only where it says something (the change chip, the
// marker on a sparkline). Every colour is a --brd-* custom property that
// BoardScreen sets from the site's Studio look, so there is no hex here. The
// charts are the shared kit (ncs-charts.css), fed through --ncs-chart-*.
// Widths: one column to 560 px, two to 1100, then the overview's four-up.
// =============================================================================

export const BOARD_CSS = `
.ncs-brd { color: var(--brd-ink); font-family: var(--brd-body); font-size: 15px; line-height: 1.5; container-type: inline-size; min-width: 0; }
.ncs-brd *, .ncs-brd *::before, .ncs-brd *::after { box-sizing: border-box; }
.ncs-brd button, .ncs-brd select { font: inherit; color: inherit; }
.ncs-brd :focus-visible { outline: 2px solid var(--brd-focus); outline-offset: 2px; }
.ncs-brd [hidden] { display: none !important; }

/* ---------- The head: what period, against what ---------- */
.ncs-brd__head { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; padding-bottom: 22px; border-bottom: 3px double var(--brd-rule-strong); }
.ncs-brd__kicker { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--brd-marker-ink); }
.ncs-brd__title { margin: 2px 0 0; font-family: var(--brd-display); font-weight: var(--brd-display-weight); font-size: clamp(30px, 6cqi, 54px); line-height: 1.04; letter-spacing: -.01em; color: var(--brd-heading); text-wrap: balance; }
.ncs-brd__sub { margin: 8px 0 0; max-width: 62ch; color: var(--brd-muted); }
.ncs-brd__sub strong { color: var(--brd-ink); font-weight: 600; }

.ncs-brd__bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
.ncs-brd__kinds { display: inline-flex; border: 1px solid var(--brd-rule-strong); border-radius: var(--brd-radius); overflow: hidden; }
.ncs-brd__kinds button { min-height: 40px; padding: 0 16px; border: 0; border-left: 1px solid var(--brd-rule-strong); background: transparent; cursor: pointer; font-weight: 500; }
.ncs-brd__kinds button:first-child { border-left: 0; }
.ncs-brd__kinds button[aria-pressed="true"] { background: var(--brd-heading); color: var(--brd-paper); }
.ncs-brd__kinds button:focus-visible { outline-offset: -3px; }
.ncs-brd__pick { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.ncs-brd__pick select { min-height: 40px; max-width: 100%; padding: 0 34px 0 12px; border: 1px solid var(--brd-rule-strong); border-radius: var(--brd-radius); background: var(--brd-surface); appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--brd-ink) 50%), linear-gradient(135deg, var(--brd-ink) 50%, transparent 50%); background-position: calc(100% - 17px) 55%, calc(100% - 12px) 55%; background-size: 5px 5px; background-repeat: no-repeat; cursor: pointer; }
.ncs-brd__step { width: 40px; height: 40px; display: inline-grid; place-items: center; border: 1px solid var(--brd-rule-strong); border-radius: var(--brd-radius); background: transparent; cursor: pointer; }
.ncs-brd__step:disabled { opacity: .35; cursor: default; }
.ncs-brd__step svg { width: 14px; height: 14px; }
.ncs-brd__fresh { margin: 0 0 0 auto; font-size: 13px; color: var(--brd-muted); }

.ncs-brd__nav { display: flex; flex-wrap: wrap; gap: 2px 18px; }
.ncs-brd__nav button { min-height: 32px; padding: 0; border: 0; background: none; cursor: pointer; font-size: 14px; color: var(--brd-heading); text-decoration: underline; text-decoration-color: var(--brd-rule-strong); text-underline-offset: 3px; }
.ncs-brd__nav button:hover { text-decoration-color: currentColor; }

/* ---------- Notices ---------- */
.ncs-brd__notice { margin: 18px 0 0; padding: 12px 16px; border-left: 3px solid var(--brd-careful); background: var(--brd-careful-bg); color: var(--brd-ink); max-width: 80ch; }
.ncs-brd__notice p { margin: 0; }
.ncs-brd__notice p + p { margin-top: 4px; }

/* ---------- Tiles: columns of a ledger, divided by hairlines ---------- */
.ncs-brd__tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); margin: 0 0 0 -20px; padding: 0; list-style: none; border-bottom: 1px solid var(--brd-rule); overflow: hidden; clip-path: inset(0 0 0 20px); }
.ncs-brd__tile { display: grid; grid-template-rows: auto auto 1fr auto; gap: 6px; padding: 20px 16px 18px 20px; margin-bottom: -1px; border-bottom: 1px solid var(--brd-rule); box-shadow: -1px 0 0 var(--brd-rule); min-width: 0; }
.ncs-brd__tile-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.ncs-brd__label { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: .02em; color: var(--brd-ink); }
.ncs-brd__num { margin: 0; font-family: var(--brd-display); font-weight: var(--brd-display-weight); font-size: clamp(34px, 3.4cqi + 18px, 50px); line-height: 1; letter-spacing: -.015em; color: var(--brd-heading); font-variant-numeric: lining-nums tabular-nums; }
.ncs-brd__num.is-none { font-size: 22px; line-height: 1.25; padding: 10px 0 6px; color: var(--brd-muted); font-style: italic; }
.ncs-brd__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; align-self: start; }
.ncs-brd__chip { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 600; white-space: nowrap; background: var(--brd-flat-bg); color: var(--brd-flat-fg); }
.ncs-brd__chip.is-good { background: var(--brd-good-bg); color: var(--brd-good-fg); }
.ncs-brd__chip.is-bad { background: var(--brd-bad-bg); color: var(--brd-bad-fg); }
.ncs-brd__line { margin: 0; font-size: 13px; color: var(--brd-muted); }
.ncs-brd__spark { display: block; width: 100%; height: 34px; margin-top: 4px; overflow: visible; }
.ncs-brd__spark path { fill: none; stroke: var(--brd-marker); stroke-width: 1.75; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.ncs-brd__spark .is-dot { stroke-width: 5; }
.ncs-brd__spark .is-gap { stroke: var(--brd-muted); stroke-width: 1; opacity: .55; }
.ncs-brd__spark .is-base { stroke: var(--brd-rule); stroke-width: 1; }
.ncs-brd__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* The "i" button and what it opens */
.ncs-brd__i { flex: none; width: 24px; height: 24px; margin: -3px -4px 0 0; display: inline-grid; place-items: center; border: 1px solid var(--brd-rule-strong); border-radius: 50%; background: transparent; cursor: pointer; font-family: var(--brd-display); font-style: italic; font-size: 14px; line-height: 1; color: var(--brd-muted); position: relative; }
.ncs-brd__i::after { content: ""; position: absolute; inset: -10px; }
.ncs-brd__i[aria-expanded="true"] { background: var(--brd-heading); border-color: var(--brd-heading); color: var(--brd-paper); }
.ncs-brd__explain { margin: 0; padding: 10px 12px; font-size: 13.5px; background: var(--brd-note-bg); color: var(--brd-ink); border-radius: calc(var(--brd-radius) / 2); max-width: 70ch; }

/* ---------- Charts ---------- */
.ncs-brd__charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 0 32px; margin-top: 26px; --ncs-chart-plot-h: 220px; }
.ncs-brd__charts.is-key { grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); --ncs-chart-plot-h: 180px; }
@container (min-width: 760px) and (max-width: 1259px) { .ncs-brd__charts.is-key { grid-template-columns: 1fr 1fr; } }
.ncs-brd__fig, .ncs-brd__empty { margin: 0 0 24px; min-width: 0; }
.ncs-brd .ncs-chart { margin: 0 0 24px; padding: 14px 0 6px; background: transparent; border-top-color: var(--brd-rule-strong); }
.ncs-brd__empty { padding: 14px 0 18px; border-top: 1px solid var(--brd-rule-strong); }
.ncs-brd__empty h3 { margin: 0 0 12px; font-family: var(--brd-display); font-weight: var(--brd-display-weight); font-size: 18px; color: var(--brd-heading); }
.ncs-brd__empty p { margin: 0; padding: 26px 16px; text-align: center; color: var(--brd-muted); font-style: italic; background: repeating-linear-gradient(135deg, transparent 0 7px, var(--brd-hatch) 7px 8px); }

/* ---------- Parts ---------- */
.ncs-brd__overview { padding-top: 6px; }
.ncs-brd__part { margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--brd-rule-strong); }
.ncs-brd__part-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
.ncs-brd__part-head h2 { margin: 0; font-family: var(--brd-display); font-weight: var(--brd-display-weight); font-size: clamp(22px, 2cqi + 14px, 30px); line-height: 1.15; color: var(--brd-heading); }
.ncs-brd__part-head .ncs-brd__i { margin: 0; align-self: center; }
.ncs-brd__part > .ncs-brd__explain { margin: 8px 0 4px; }
.ncs-brd__more { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border: 1px solid var(--brd-rule-strong); border-radius: var(--brd-radius); background: transparent; cursor: pointer; font-weight: 500; }
.ncs-brd__more svg { width: 12px; height: 12px; transition: transform .15s ease; }
.ncs-brd__more[aria-expanded="true"] svg { transform: rotate(180deg); }
.ncs-brd__more:hover, .ncs-brd__step:hover:not(:disabled) { background: var(--brd-note-bg); }

/* ---------- States ---------- */
.ncs-brd__state { margin-top: 28px; padding: 28px 0; max-width: 62ch; }
.ncs-brd__state h2 { margin: 0 0 8px; font-family: var(--brd-display); font-weight: var(--brd-display-weight); font-size: 26px; color: var(--brd-heading); }
.ncs-brd__state p { margin: 0 0 10px; }
.ncs-brd__state ol { margin: 10px 0 0; padding-left: 22px; }
.ncs-brd__state li { margin-bottom: 6px; }
.ncs-brd__body.is-busy { opacity: .45; transition: opacity .15s ease .2s; }
.ncs-brd__skel { height: 120px; margin-top: 26px; border-bottom: 1px solid var(--brd-rule); background: repeating-linear-gradient(90deg, transparent 0 calc(20% - 1px), var(--brd-rule) calc(20% - 1px) 20%); opacity: .6; }

@media (prefers-reduced-motion: reduce) { .ncs-brd * { transition: none !important; } }
@container (max-width: 520px) {
  .ncs-brd__kinds { display: flex; width: 100%; }
  .ncs-brd__kinds button { flex: 1; padding: 0 8px; }
  .ncs-brd__pick { flex: 1 1 100%; }
  .ncs-brd__pick select { flex: 1; min-width: 0; }
  .ncs-brd__fresh { margin-left: 0; }
  .ncs-brd__tiles { grid-template-columns: 1fr 1fr; }
  .ncs-brd__tile { padding-right: 12px; }
}
@container (max-width: 340px) { .ncs-brd__tiles { grid-template-columns: 1fr; } }
`;
