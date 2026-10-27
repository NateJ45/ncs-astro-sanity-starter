// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The flow layer (PORTS.md card 192, from FBC Auburn's flow layer, 2026-10-24)
// =============================================================================
// Opt-in through brand.config.json `layout.motion` ('flow' or 'fade'); the default ('reveal')
// never loads this file (BaseLayout renders FlowMotion.astro only when it is on). Every section
// comes in as it reaches the reader: headings rise line by line out of a mask, the words and
// pictures under them fade up in turn, and photographs settle from a slight zoom and drift inside
// their frames. Rebuilt without a library: one IntersectionObserver, CSS keyframes and scroll
// timelines. Styles: src/styles/flow.css. Map: docs/agent/animation.md, "The flow layer".
//
// Two levels, set on <html data-flow> by this script:
//   full: motion 'flow' AND the page's <main> is or holds [data-flow-full] (Home and the 404 in
//         the starter, through BaseLayout's `flow="full"` prop). Line-by-line headings, photo
//         zoom and drift, 600ms fade-ups.
//   calm: every other page under 'flow', and every page under 'fade'. One short fade (200ms,
//         8px); nothing is split, zoomed or drifted.
//
// Nothing is tagged by hand. The script picks the units itself (UP_UNITS, LINE_UNITS), so a
// section an editor adds in the Studio moves like the rest. Opt a subtree out with
// data-flow="off"; opt something in with data-flow-item, data-flow="lines" or data-flow="side".
//
// The rules (CLAUDE.md rule 5 and docs/agent/animation.md):
//   - Motion follows the scroll and never takes it over: no scroll library, no scroll listener.
//   - Transforms and opacity only, through the individual `translate` / `scale` properties, so
//     nothing fights a component's own `transform` (a hover lift, a pressed button). CLS stays 0.
//   - Every hidden starting state is the first frame of a PAUSED CSS animation keyed on a class
//     this script adds. JS off, a script that fails, reduced motion (no html.motion): nothing is
//     ever hidden. A test that sets `animation: none` sees the page at rest.
//   - The first screen shows as it is, at every width: it is never held for fonts or a stagger,
//     so LCP does not move. Only what is below the fold rises as it arrives.
//   - Nothing moves after a unit lands: its classes come off; a split heading keeps its line spans
//     (they change nothing in the layout) until the width changes.
//   - Fonts are waited for at most 600ms; a heading whose font is not in by then fades up whole.
//   - Keyboard focus lands its unit at once, so a focused link is never at opacity 0.
//
// HOOKS for a site's own motif (Auburn lays brick titles and slides a footer verse here):
//   - CSS: a unit gets `.flow-go` when it starts and `--flow-delay` for its place in the stagger,
//     so any paused animation inside a unit can start with it
//     (`html.motion .flow-go .my-piece { animation-play-state: running }`).
//   - data-flow-ms="1400" on a unit: how long its own pieces take, so it is not landed early.
//   - addFlowExtension(fn): fn({ mode, main, html }) runs after the units are armed on every page
//     load and may return a cleanup. Import it from this module in a site script.

import { splitWords } from '../lib/flow-split';

export type FlowMode = 'full' | 'calm';
export interface FlowContext {
  mode: FlowMode;
  main: HTMLElement;
  html: HTMLElement;
}
export type FlowExtension = (ctx: FlowContext) => void | (() => void);

const extensions: FlowExtension[] = [];
/** Register a site's own piece of motion (see HOOKS above). Call it once, at module load. */
export function addFlowExtension(ext: FlowExtension): void {
  extensions.push(ext);
}

const UP_UNITS = [
  'h3',
  'h4',
  'p',
  'li',
  'dl',
  'blockquote',
  'figure',
  'form',
  'iframe',
  'table',
  'picture',
  'img',
  'video',
  '.press-tactile',
  '[data-flow-item]',
].join(',');

// Headings that rise line by line. Pull quotes too: they read as headings.
const LINE_UNITS = 'h1, h2, blockquote > p, [data-flow="lines"]';

// Things that already move in their own way, and everything inside them.
const SKIP =
  '[data-flow="off"], .sr-only, .hero-entry-stagger, .hero-slideshow, .img-curtain, .shot__example';

type Kind = 'lines' | 'up' | 'photo' | 'side';
const KINDS: Kind[] = ['lines', 'up', 'photo', 'side'];
const MAX_STAGGER = 8;

/** A duration token from the one scale (globals.css), in ms; the fallback when unset. */
function readMs(cs: CSSStyleDeclaration, name: string, fallback: number): number {
  const raw = cs.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : n;
}

let teardown: (() => void) | null = null;

export function initFlow() {
  teardown?.();
  const html = document.documentElement;
  if (!html.classList.contains('motion')) return;
  const setting = html.dataset.motion;
  if (setting !== 'flow' && setting !== 'fade') return;
  const main = document.getElementById('main');
  if (!main) return;

  const disposers: (() => void)[] = [];
  const preview = location.pathname.startsWith('/preview');
  const full =
    setting === 'flow' &&
    (main.matches('[data-flow-full]') || !!main.querySelector('[data-flow-full]'));
  const mode: FlowMode = full ? 'full' : 'calm';
  html.dataset.flow = mode;

  // Timings from the one scale (globals.css, "Motion"), read once.
  const cs = getComputedStyle(html);
  const T = full
    ? {
        stagger: readMs(cs, '--motion-stagger', 60),
        up: readMs(cs, '--motion-rise', 600),
        photo: readMs(cs, '--motion-photo', 900),
        side: readMs(cs, '--motion-side', 800),
        lines: readMs(cs, '--motion-line', 800),
        lineStagger: readMs(cs, '--motion-line-stagger', 80),
      }
    : {
        stagger: readMs(cs, '--motion-stagger-calm', 40),
        up: readMs(cs, '--motion-fade', 200),
        photo: 0,
        side: 0,
        lines: 0,
        lineStagger: 0,
      };

  // ---- 1. Pick the units -----------------------------------------------------------------
  // An element is a unit only if no ancestor already is, so a card fades as one piece and the
  // words inside it do not fade again. Everything on the first screen is left as it is (and so
  // are its children): a page's main content never looks missing on arrival, and LCP is not held.
  const units: { el: HTMLElement; kind: Kind; par?: boolean }[] = [];
  const taken = new Set<Element>();
  const isInsideTaken = (el: Element) => {
    for (let p = el.parentElement; p && p !== main; p = p.parentElement) {
      if (taken.has(p)) return true;
    }
    return false;
  };
  const fold = innerHeight;
  const candidates = main.querySelectorAll<HTMLElement>(`${LINE_UNITS}, ${UP_UNITS}`);
  for (const el of candidates) {
    if (el.closest(SKIP) || isInsideTaken(el) || el.dataset.flowOn) continue;
    // Hidden things (a closed accordion's answer, an empty slot) have nothing to show.
    if (!el.getClientRects().length) continue;
    if (el.getBoundingClientRect().top < fold) {
      taken.add(el);
      continue;
    }
    let kind: Kind = 'up';
    if (full) {
      if (el.matches(LINE_UNITS)) kind = 'lines';
      else if (el.matches('img, picture') && clipsChild(el)) kind = 'photo';
    }
    // A big photo in a cropping frame also drifts inside it with the scroll (flow.css), unless it
    // is a link's picture, whose hover zoom owns its transform.
    const par = kind === 'photo' && el.parentElement!.offsetHeight >= 200 && !el.closest('a');
    units.push({ el, kind, par });
    taken.add(el);
  }
  // [data-flow="side"]: one piece that slides in from the side (a card beside a hero, say).
  if (full) {
    for (const side of main.querySelectorAll<HTMLElement>('[data-flow="side"]')) {
      if (side.dataset.flowOn || side.getBoundingClientRect().top < fold) continue;
      const kept = units.filter((u) => !side.contains(u.el));
      units.length = 0;
      units.push(...kept, { el: side, kind: 'side' });
    }
  }

  // ---- 2. Arm them: each holds its first frame until it reaches the reader ----------------
  for (const { el, kind, par } of units) {
    el.dataset.flowOn = kind;
    el.classList.add('flow', `flow--${kind}`);
    if (par) el.classList.add('flow-par');
  }
  html.classList.add('flow-armed');

  // Landing only takes the classes off. A split heading keeps its line spans (they change nothing
  // in the layout) so the DOM never shifts under a reader a second after it has settled.
  const land = (el: HTMLElement) => {
    el.classList.remove('flow', 'flow-go', ...KINDS.map((k) => `flow--${k}`));
    el.style.removeProperty('--flow-delay');
  };

  const go = (el: HTMLElement, delayMs: number) => {
    el.style.setProperty('--flow-delay', `${delayMs}ms`);
    el.classList.add('flow-go');
    // Take the classes off once the last piece has landed. A timer, not animationend, so a tab in
    // the background (where animations may not run) still finishes.
    const lines = el.querySelectorAll('.flow-line__in').length;
    const kind = el.dataset.flowOn as Kind;
    const own = el.dataset.flowMs
      ? Number(el.dataset.flowMs)
      : lines
        ? (lines - 1) * T.lineStagger + T.lines
        : kind === 'photo'
          ? T.photo
          : kind === 'side'
            ? T.side
            : T.up;
    const t = window.setTimeout(() => land(el), delayMs + own + 80);
    disposers.push(() => window.clearTimeout(t));
  };

  // Lines need the real fonts to know where a heading breaks. Wait for them, but never more than
  // 600ms (a cold load on a slow phone must not sit blank): headings whose fonts are not in by
  // then fade up whole instead, since splitting on a fallback font would rewrap after the swap.
  const lineUnits = units.filter((u) => u.kind === 'lines').map((u) => u.el);
  const ready = lineUnits.length
    ? Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise((r) => window.setTimeout(r, 600)),
      ])
    : Promise.resolve();

  const io = new IntersectionObserver(
    (entries) => {
      const arriving = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      arriving.forEach((el, i) => {
        io.unobserve(el);
        go(el, Math.min(i, MAX_STAGGER) * T.stagger);
      });
    },
    // A unit starts once its top is about 12% of the screen above the bottom edge.
    { rootMargin: '0px 0px -12% 0px' },
  );
  disposers.push(() => io.disconnect());

  // Keyboard focus lands its unit at once: a link reached by Tab must never sit at opacity 0
  // waiting for the observer (flow.css shows it under :focus-within; this makes it stay).
  const onFocusIn = (e: FocusEvent) => {
    for (let p = e.target as Element | null; p && p !== document.body; p = p.parentElement) {
      if (!(p instanceof HTMLElement)) continue;
      if (p.dataset.flowOn && p.classList.contains('flow')) {
        io.unobserve(p);
        land(p);
      }
      if (p.hasAttribute('data-reveal')) p.classList.add('is-visible');
    }
  };
  document.addEventListener('focusin', onFocusIn);
  disposers.push(() => document.removeEventListener('focusin', onFocusIn));

  ready.then(() => {
    if (teardown !== stop) return; // a newer page took over while the fonts loaded
    const fontsIn = !document.fonts || document.fonts.status === 'loaded';
    const split = preview || !fontsIn ? new Set<HTMLElement>() : splitAll(lineUnits);
    for (const el of lineUnits) {
      if (!split.has(el)) {
        // Live preview keeps its text nodes whole (click-to-edit reads them); a heading that
        // will not split cleanly, or whose font is still loading, fades up instead.
        el.classList.replace('flow--lines', 'flow--up');
        el.dataset.flowOn = 'up';
      }
    }
    for (const { el } of units) io.observe(el);
  });

  // A new width rewraps headings, so the line spans come out: put each heading's own nodes back,
  // and split again the ones still waiting to rise. Height-only resizes (a phone's address bar, a
  // full-page screenshot) change no line breaks and are ignored.
  let lastWidth = innerWidth;
  let resizeTimer = 0;
  const onResize = () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const again: HTMLElement[] = [];
      for (const [el, restore] of [...lineRestorers]) {
        restore();
        lineRestorers.delete(el);
        if (el.classList.contains('flow--lines') && !el.classList.contains('flow-go'))
          again.push(el);
      }
      const split = splitAll(again);
      for (const el of again) if (!split.has(el)) el.classList.replace('flow--lines', 'flow--up');
    }, 150);
  };
  addEventListener('resize', onResize, { passive: true });
  disposers.push(() => {
    removeEventListener('resize', onResize);
    window.clearTimeout(resizeTimer);
  });

  // ---- 3. A site's own motif (HOOKS above) --------------------------------------------------
  for (const ext of extensions) {
    try {
      const undo = ext({ mode, main, html });
      if (typeof undo === 'function') disposers.push(undo);
    } catch (err) {
      console.error('[flow] extension failed', err);
    }
  }

  const stop = () => {
    disposers.forEach((d) => d());
    for (const { el } of units) {
      land(el);
      el.classList.remove('flow-par');
      delete el.dataset.flowOn;
      lineRestorers.get(el)?.();
      lineRestorers.delete(el);
    }
    delete html.dataset.flow;
    teardown = null;
  };
  teardown = stop;
}

/** True when the element's parent crops it, so a zoom stays inside its frame. */
function clipsChild(el: HTMLElement) {
  const p = el.parentElement;
  if (!p) return false;
  const cs = getComputedStyle(p);
  return cs.overflow !== 'visible' || cs.overflowX !== 'visible';
}

// ---- Line splitting ----------------------------------------------------------------------
// Words become spans and are grouped by where they sit; each line goes in a mask
// (.flow-line) and rises inside it (.flow-line__in). Inline children (a link, an <em>) stay
// whole. The original child nodes are kept and put back when the width changes or the page is
// left.
const lineRestorers = new Map<HTMLElement, () => void>();

// Batched so the browser lays the page out a few times for all of a page's headings, not for
// each one (Lighthouse's "forced reflow"): every read of one phase happens before any write of
// the next. Returns the headings that split cleanly.
function splitAll(els: HTMLElement[]): Set<HTMLElement> {
  const done = new Set<HTMLElement>();
  // Phase 1, read: the heights before anything changes.
  const work = els
    .filter((el) => {
      if (lineRestorers.has(el)) done.add(el);
      return !lineRestorers.has(el);
    })
    .map((el) => ({
      el,
      original: [...el.childNodes],
      before: el.getBoundingClientRect().height,
      pieces: [] as Node[],
      lines: [] as Node[][],
    }));
  // Phase 2, write: words become spans.
  for (const w of work) {
    for (const node of w.original) {
      if (node.nodeType === Node.TEXT_NODE) {
        for (const part of splitWords(node.textContent ?? '')) {
          if (part.space) w.pieces.push(document.createTextNode(part.text));
          else {
            const span = document.createElement('span');
            span.className = 'flow-word';
            span.textContent = part.text;
            w.pieces.push(span);
          }
        }
      } else w.pieces.push(node);
    }
    w.el.replaceChildren(...w.pieces);
  }
  // Phase 3, read: group the pieces into lines. A piece starts a new line when it begins below the
  // bottom of the line so far (overlap, not equal tops: inline pieces can differ in height).
  const split = work.filter((w) => {
    let lineBottom = Number.NEGATIVE_INFINITY;
    // Text before the first word (a leading space) waits for the first line, so nothing is lost.
    const leading: Node[] = [];
    for (const piece of w.pieces) {
      if (piece.nodeType !== Node.ELEMENT_NODE) {
        if (w.lines.length) w.lines[w.lines.length - 1].push(piece);
        else leading.push(piece);
        continue;
      }
      const rects = (piece as Element).getClientRects();
      // A link or phrase that itself breaks across two lines: leave this heading alone.
      if (rects.length > 1) return false;
      const r = rects[0];
      if (!w.lines.length || (r && r.top >= lineBottom - 2)) {
        w.lines.push([]);
        lineBottom = Number.NEGATIVE_INFINITY;
      }
      if (leading.length) w.lines[0].push(...leading.splice(0));
      w.lines[w.lines.length - 1].push(piece);
      if (r) lineBottom = Math.max(lineBottom, r.bottom);
    }
    return w.lines.length > 0;
  });
  // Phase 4, write: the masks go in; headings that would not split get their own nodes back.
  for (const w of work) {
    if (!split.includes(w)) {
      w.el.replaceChildren(...w.original);
      continue;
    }
    w.el.replaceChildren(
      ...w.lines.map((nodes, i) => {
        const mask = document.createElement('span');
        mask.className = 'flow-line';
        const inner = document.createElement('span');
        inner.className = 'flow-line__in';
        inner.style.setProperty('--flow-i', String(i));
        inner.append(...nodes);
        mask.append(inner);
        return mask;
      }),
    );
  }
  // Phase 5, read: the split must not move anything. A heading that came out a different height
  // is put back and fades up instead.
  const moved = split.filter((w) => Math.abs(w.el.getBoundingClientRect().height - w.before) > 1);
  for (const w of split) {
    if (moved.includes(w)) {
      w.el.replaceChildren(...w.original);
      continue;
    }
    lineRestorers.set(w.el, () => w.el.replaceChildren(...w.original));
    done.add(w.el);
  }
  return done;
}

// ---- Printing ------------------------------------------------------------------------------
// Print never scrolls, so units below the first screen would stay on their hidden first frame.
// Drop html.motion for the print (every hidden state is scoped to it) and put it back afterwards,
// unless the visitor's settings changed meanwhile. src/styles/print.css is the CSS half.
let printedWithMotion = false;
addEventListener('beforeprint', () => {
  const html = document.documentElement;
  printedWithMotion = html.classList.contains('motion');
  html.classList.remove('motion');
});
addEventListener('afterprint', () => {
  if (printedWithMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('motion');
  }
  printedWithMotion = false;
});
