// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// inline-rich-write — the WRITE half of the rich twins (2026-08-28)
// =============================================================================
// src/lib/inline-rich.ts reads a rich twin: portable text restricted to one
// paragraph with exactly two marks, bold and italic. This is its mirror, and it
// exists for the in-canvas text popover — the little card that opens over a
// subhead in the Presentation preview so an editor can type the line where the
// line lives instead of hunting for its box in the form.
//
// The popover's rich field is a `contenteditable` div, not a portable-text
// editor. @portabletext/editor is a Studio-weight dependency and this code ships
// in the site's preview island, so the browser's own editing surface does the
// typing and these two functions do the translation:
//
//   blocks  -> HTML   inlineRichToHtml()   seeds the box with what is stored
//   HTML    -> blocks htmlToInlineRich()   turns what was typed back into data
//
// THE HTML SIDE IS UNTRUSTED. A contenteditable hands back whatever the browser
// felt like emitting, plus whatever the editor pasted in from a Word document:
// nested spans, inline styles, tables, stray script tags. So the parser here is
// an ALLOW-LIST, not a sanitiser. It understands bold, italic and line breaks;
// every other tag contributes nothing but its text. No tag name can reach the
// stored document, because the output is built from scratch out of plain strings
// and two booleans.
//
// ONE PARAGRAPH BY DEFAULT, LINES WHERE A REPO RENDERS THEM (2026-08-28, folded
// back from the WCP repo). This template's inline-rich.ts joins multiple blocks
// with a space when it renders, because these fields are one sentence of support
// text inside one <p>; so a line break typed in the popover becomes a space
// rather than a second block that would only be flattened again. WCP's twin
// renders `<br />` BETWEEN blocks, so a volunteer who typed two lines in the
// form has two blocks, and collapsing them here would delete a line break the
// moment anybody opened the in-canvas card.
//
// Both are right for their own renderer, so the behaviour is a SEAM rather than
// a fork: `RichWriteOptions.multiline` is off by default (one block, a break is
// a space) and a repo whose reader renders breaks turns it on at its call sites.
// A hard break travels through the run list as RUN_BREAK and `runsToInlineRich`
// starts a new block at each one.
// =============================================================================

import type { InlineRichBlock, InlineRun } from './inline-rich.ts';
import { RUN_BREAK, inlineRichRuns } from './inline-rich.ts';

/** How a repo wants line breaks handled. See the header. */
export interface RichWriteOptions {
  /**
   * Keep hard line breaks as separate blocks. Default false: a break becomes a
   * space and the value is always ONE block, which is what a reader that joins
   * blocks with a space wants.
   */
  multiline?: boolean;
}

// -----------------------------------------------------------------------------
// HTML -> runs
// -----------------------------------------------------------------------------

/** Tags that turn bold on for their contents. */
const STRONG_TAGS = new Set(['b', 'strong']);
/** Tags that turn italic on for their contents. */
const EM_TAGS = new Set(['i', 'em']);
/** Tags whose boundaries are a break in the text. */
const BREAK_TAGS = new Set(['br', 'div', 'p', 'li', 'tr', 'blockquote', 'h1', 'h2', 'h3', 'h4']);
/** Tags whose CONTENTS are not text at all and must be dropped whole. */
const DROP_CONTENT_TAGS = new Set(['script', 'style', 'head', 'title']);

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode the handful of entities a contenteditable actually produces. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return whole;
      // 160 is a non-breaking space; it is a space as far as stored text goes.
      return code === 160 ? ' ' : String.fromCodePoint(code);
    }
    const named = ENTITIES[body.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/** A `<span style="...">` can still carry emphasis when a browser felt fancy. */
function styleMarks(attrs: string): { strong: boolean; em: boolean } {
  const style = attrs.match(/style\s*=\s*("([^"]*)"|'([^']*)')/i);
  const value = (style?.[2] ?? style?.[3] ?? '').toLowerCase();
  return {
    strong: /font-weight\s*:\s*(bold|[6-9]\d\d)/.test(value),
    em: /font-style\s*:\s*italic/.test(value),
  };
}

/**
 * Flatten an HTML fragment to the runs the twin stores. Unknown tags keep their
 * text and lose themselves; script tags and friends lose both.
 */
export function htmlToRuns(html?: string | null, options: RichWriteOptions = {}): InlineRun[] {
  if (typeof html !== 'string' || html === '') return [];

  const raw: InlineRun[] = [];
  // One entry per open element that changes the marks, innermost last.
  const stack: Array<{ tag: string; strong: boolean; em: boolean }> = [];
  let dropUntil: string | null = null;
  let strong = 0;
  let em = 0;
  let i = 0;

  const pushText = (text: string) => {
    // Whitespace is squeezed HERE, not only in normalizeRuns, so that source
    // formatting between two tags can never arrive as a run whose whole text is
    // a newline - which normalizeRuns would then read as a deliberate break.
    const squeezed = text.replace(/\s+/g, ' ');
    if (squeezed === '') return;
    raw.push({ text: squeezed, strong: strong > 0, em: em > 0 });
  };

  while (i < html.length) {
    const open = html.indexOf('<', i);
    if (open < 0) {
      if (!dropUntil) pushText(decodeEntities(html.slice(i)));
      break;
    }
    if (open > i && !dropUntil) pushText(decodeEntities(html.slice(i, open)));

    const close = html.indexOf('>', open);
    if (close < 0) {
      // A lone '<' with no '>' is literal text, not a tag.
      if (!dropUntil) pushText(decodeEntities(html.slice(open)));
      break;
    }

    const inner = html.slice(open + 1, close);
    const closing = inner.startsWith('/');
    const body = closing ? inner.slice(1) : inner;
    const tag = (body.trim().match(/^[A-Za-z][A-Za-z0-9]*/)?.[0] ?? '').toLowerCase();
    const attrs = tag ? body.slice(body.indexOf(tag) + tag.length) : '';
    i = close + 1;

    if (dropUntil) {
      if (closing && tag === dropUntil) dropUntil = null;
      continue;
    }
    if (!tag) continue;
    if (!closing && DROP_CONTENT_TAGS.has(tag)) {
      dropUntil = tag;
      continue;
    }
    if (BREAK_TAGS.has(tag)) {
      // A break carries NO marks: it is a boundary, not text. Collapsed to a
      // space it must inherit them instead, or `<b>a<br>b</b>` would store three
      // spans where one says the same thing.
      if (options.multiline) raw.push({ text: RUN_BREAK, strong: false, em: false });
      else pushText(' ');
      if (tag === 'br') continue;
    }

    if (closing) {
      // Unwind to the matching open tag. An unbalanced close is ignored.
      for (let s = stack.length - 1; s >= 0; s -= 1) {
        if (stack[s].tag !== tag) continue;
        for (let k = stack.length - 1; k >= s; k -= 1) {
          if (stack[k].strong) strong -= 1;
          if (stack[k].em) em -= 1;
        }
        stack.length = s;
        break;
      }
      continue;
    }
    if (attrs.trimEnd().endsWith('/')) continue; // self-closing, nothing to open

    const marks =
      tag === 'span' ? styleMarks(attrs) : { strong: STRONG_TAGS.has(tag), em: EM_TAGS.has(tag) };
    stack.push({ tag, ...marks });
    if (marks.strong) strong += 1;
    if (marks.em) em += 1;
  }

  return normalizeRuns(raw);
}

/**
 * Collapse runs into what should actually be stored: whitespace squeezed to
 * single spaces, neighbours with identical marks merged, each LINE trimmed at
 * both ends, and blank lines dropped.
 *
 * RUN_BREAK is a boundary, never text. Two runs on opposite sides of one never
 * merge, so `bold\nitalic` keeps its two lines and its two marks. A value with
 * no break in it is one line, which is the single-paragraph behaviour this
 * function has always had.
 */
export function normalizeRuns(runs: InlineRun[]): InlineRun[] {
  // 1. Squeeze whitespace. Only a run whose WHOLE text is RUN_BREAK is a break;
  //    a newline inside a run is ordinary whitespace and becomes a space.
  const flat: InlineRun[] = [];
  for (const run of runs) {
    if (run.text === RUN_BREAK) {
      flat.push({ text: RUN_BREAK, strong: false, em: false });
      continue;
    }
    const text = run.text.replace(/\s+/g, ' ');
    if (text !== '') flat.push({ ...run, text });
  }

  // 2. Group into lines, merging same-mark neighbours inside each line.
  const lines: InlineRun[][] = [[]];
  for (const run of flat) {
    if (run.text === RUN_BREAK) {
      lines.push([]);
      continue;
    }
    let text = run.text;
    const line = lines[lines.length - 1];
    const last = line[line.length - 1];
    if (last && last.strong === run.strong && last.em === run.em) {
      // Two spaces meeting across a tag boundary are still one space.
      last.text = (last.text + text).replace(/ {2,}/g, ' ');
      continue;
    }
    // THE SAME RULE ACROSS A MARK BOUNDARY (2026-08-28, found porting this to
    // ncs-church-starter). `<b>a </b><i> b</i>` cannot merge its two runs, so
    // the collapse above never sees the pair and TWO spaces get stored. Drop it
    // from the SECOND run rather than the first: a leading space inside an
    // emphasised span renders as a wide bold or an over-long underline.
    if (last?.text.endsWith(' ') && text.startsWith(' ')) text = text.slice(1);
    if (text === '') continue;
    if (!last && text === ' ') continue;
    line.push({ ...run, text });
  }

  // 3. Trim each line at both ends, then drop the lines that hold nothing.
  const trimmed = lines
    .map((line) => {
      if (line.length) {
        line[0].text = line[0].text.replace(/^ +/, '');
        line[line.length - 1].text = line[line.length - 1].text.replace(/ +$/, '');
      }
      return line.filter((run) => run.text !== '');
    })
    .filter((line) => line.length > 0);

  // 4. Re-join the surviving lines with a single break between them.
  const out: InlineRun[] = [];
  trimmed.forEach((line, i) => {
    if (i > 0) out.push({ text: RUN_BREAK, strong: false, em: false });
    out.push(...line);
  });
  return out;
}

/**
 * Plain text as runs. The other half of a paste: a clipboard with no `text/html`
 * flavour still has to reach the same normalizer, and in a repo that keeps line
 * breaks the newlines in it are breaks rather than spaces.
 */
export function textToRuns(text?: string | null, options: RichWriteOptions = {}): InlineRun[] {
  if (typeof text !== 'string' || text === '') return [];
  if (!options.multiline) return normalizeRuns([{ text, strong: false, em: false }]);
  const runs: InlineRun[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (i > 0) runs.push({ text: RUN_BREAK, strong: false, em: false });
    if (line !== '') runs.push({ text: line, strong: false, em: false });
  });
  return normalizeRuns(runs);
}

// -----------------------------------------------------------------------------
// runs -> portable text
// -----------------------------------------------------------------------------

/** A fresh array `_key`. Injectable so the tests can read the output. */
export type KeyFactory = () => string;

const randomKey: KeyFactory = () => Math.random().toString(36).slice(2, 12);

/**
 * Build the portable text value the twin stores: ONE BLOCK PER LINE, which is
 * one block for any value that carries no RUN_BREAK.
 *
 * Returns `[]` when there is nothing to store — which is what an editor who
 * cleared the box meant, and what makes the plain string underneath render
 * again.
 */
export function runsToInlineRich(
  runs: InlineRun[],
  nextKey: KeyFactory = randomKey,
): InlineRichBlock[] {
  const lines: InlineRun[][] = [[]];
  for (const run of runs) {
    if (run.text === RUN_BREAK) lines.push([]);
    else if (run.text !== '') lines[lines.length - 1].push(run);
  }

  return lines
    .filter((line) => line.some((run) => run.text.trim() !== ''))
    .map(
      (line) =>
        ({
          _type: 'block',
          _key: nextKey(),
          style: 'normal',
          markDefs: [],
          children: line.map((run) => ({
            _type: 'span',
            _key: nextKey(),
            text: run.text,
            marks: [...(run.strong ? ['strong'] : []), ...(run.em ? ['em'] : [])],
          })),
        }) as InlineRichBlock,
    );
}

/** The whole write direction: what the contenteditable holds -> what is stored. */
export function htmlToInlineRich(
  html?: string | null,
  nextKey: KeyFactory = randomKey,
  options: RichWriteOptions = {},
): InlineRichBlock[] {
  return runsToInlineRich(htmlToRuns(html, options), nextKey);
}

// -----------------------------------------------------------------------------
// portable text -> HTML
// -----------------------------------------------------------------------------

/** Escape the three characters that would otherwise be read as markup. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Runs as the markup the contenteditable should be seeded with. */
export function runsToHtml(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      if (run.text === RUN_BREAK) return '<br>';
      let html = escapeHtml(run.text);
      if (run.em) html = `<em>${html}</em>`;
      if (run.strong) html = `<strong>${html}</strong>`;
      return html;
    })
    .join('');
}

/**
 * The whole read direction, reusing inline-rich.ts's flattener so the popover
 * and the rendered page can never disagree about what a twin says.
 */
export function inlineRichToHtml(value?: unknown): string {
  return runsToHtml(inlineRichRuns(value));
}
