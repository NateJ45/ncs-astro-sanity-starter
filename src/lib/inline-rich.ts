// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Inline rich text - the "rich twin" of a plain string field (2026-08-28)
// =============================================================================
// Long body fields have had bold and italic for as long as they have been
// portable text. The gap was the SHORT ones: a subhead, a lede, an intro. Those
// are plain strings, and an editor who wanted one word emphasised could not have
// it.
//
// The fix is a twin, not a migration. Each curated string field keeps its name,
// its type and its stored value, and gains a sibling `<name>Rich` field holding
// portable text restricted to one paragraph style with exactly two marks, bold
// and italic. No links, no lists, no headings, no other decorators. The renderer
// prefers the twin when it holds text and otherwise renders the string exactly
// as it always did, which is why a dataset with no twins renders byte-identical
// HTML.
//
// This module is the shared reader: one emptiness test and one flattener, so no
// block component has to invent its own.
// =============================================================================

/** The shape the restricted portable-text array actually arrives in. */
export interface InlineRichSpan {
  _type?: string;
  text?: string;
  marks?: string[];
}
export interface InlineRichBlock {
  _type?: string;
  children?: InlineRichSpan[];
}

/**
 * One run of text and the two marks it may carry.
 *
 * A run whose text is exactly RUN_BREAK is a HARD BREAK, not text. This
 * template's reader never produces one (see `inlineRichRuns` below, which joins
 * blocks with a space), but the write half is shared with repos whose twin
 * renders `<br />` between blocks, so the vocabulary lives here.
 */
export interface InlineRun {
  text: string;
  strong: boolean;
  em: boolean;
}

/**
 * The hard-break run. Compare with `run.text === RUN_BREAK`.
 *
 * It is a boundary, never text: two runs on opposite sides of one never merge,
 * and `runsToInlineRich` starts a new block at each. Only a run whose WHOLE text
 * is this string counts - a newline INSIDE a run is ordinary whitespace and
 * squeezes to a space like any other, which is what keeps a pretty-printed paste
 * from turning its source formatting into line breaks.
 */
export const RUN_BREAK = '\n';

/**
 * True when the twin holds at least one non-blank character.
 *
 * The Studio leaves an empty portable-text field as `undefined`, but a field an
 * editor typed into and then cleared can survive as one block with one empty
 * span. Both have to read as "empty", or clearing the twin would blank the
 * section instead of falling back to the string underneath it.
 */
export function hasInlineRich(value?: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((b: InlineRichBlock) =>
    (b?.children ?? []).some((c) => typeof c?.text === 'string' && c.text.trim() !== ''),
  );
}

/**
 * Flatten the twin to a list of runs, in order.
 *
 * Marks other than `strong` and `em` cannot occur (the schema allows no others)
 * and are ignored if they somehow do, so a stray annotation degrades to plain
 * text rather than throwing inside a page render. Separate blocks are joined
 * with a single space: the field is one sentence of support text living inside
 * one <p>, and a second paragraph there would be a layout surprise.
 */
export function inlineRichRuns(value?: unknown): InlineRun[] {
  if (!Array.isArray(value)) return [];
  const runs: InlineRun[] = [];
  value.forEach((block: InlineRichBlock, i: number) => {
    if (i > 0 && runs.length) runs.push({ text: ' ', strong: false, em: false });
    for (const child of block?.children ?? []) {
      if (typeof child?.text !== 'string' || child.text === '') continue;
      const marks = child.marks ?? [];
      runs.push({
        text: child.text,
        strong: marks.includes('strong'),
        em: marks.includes('em'),
      });
    }
  });
  return runs;
}
