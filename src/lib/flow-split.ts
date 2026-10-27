// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The flow layer's word splitter (src/scripts/flow.ts; PORTS.md card 192, from FBC Auburn), kept
// pure so a unit test can pin it.
//
// A heading's text is cut into words and the runs of whitespace between them; the words become
// spans and the whitespace stays as text, so the heading wraps exactly as it did before.
//
// Auburn's audit (2026-10-25, DEV-H2): this lived inline in flow.ts as `split(/(s+)/)`, the
// backslashes lost to a Git Bash heredoc, so headings were cut on the letter "s" ("About u",
// "tory in our mark"). Write files with backslashes through an editor, never a heredoc;
// flow-split.test.ts keeps it that way.

/** One piece of a text node: a word (`space: false`) or a run of whitespace (`space: true`). */
export interface FlowPiece {
  text: string;
  space: boolean;
}

const WHITESPACE_RUN = /(\s+)/;
const ONLY_WHITESPACE = /^\s+$/;

/** Cuts text into words and whitespace runs, in order, dropping nothing but empty strings. */
export function splitWords(text: string): FlowPiece[] {
  const out: FlowPiece[] = [];
  for (const part of text.split(WHITESPACE_RUN)) {
    if (!part) continue;
    out.push({ text: part, space: ONLY_WHITESPACE.test(part) });
  }
  return out;
}
