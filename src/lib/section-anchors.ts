// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Named anchors for page-builder sections (PORTS.md card 158)
// =============================================================================
// Every section heading gets an id. It used to be a number (`about-3`), which
// changes the moment an editor adds a band above it, so nobody could link to a
// section. Now a section with a heading takes a name made from that heading:
// "Our story" on /about/ is /about/#our-story. A section with no heading (a
// quote, a spacer, a stats row) keeps its numbered id.
//
// The name follows the heading, so retitling a section changes its anchor.
// When a link must survive a retitle, the site can pin a name to the block's
// `_key` (which the Studio never changes) through `overrides`.
//
// Rules for the names:
//   - lowercase words joined by hyphens, through slugify() (accents dropped),
//     cut to 48 characters at a word break
//   - the zero-width characters the preview's stega encoding adds are dropped
//     first, so the draft preview gets the same ids as the live page
//   - unique on the page: a repeat gets "-2", "-3"; the ids the page chrome
//     already uses (RESERVED_IDS) and the numbered ids of unnamed sections are
//     never taken
//   - a name that would start with a digit is prefixed "section-" so it is
//     also a valid CSS selector
//
// Pure, so it is unit-tested (section-anchors.test.ts). Wired in
// SectionRenderer.astro.
// =============================================================================
import { slugify } from './slugify.ts';

/** Ids the page chrome uses, never given to a section. */
export const RESERVED_IDS: readonly string[] = ['main', 'top', 'content', 'header', 'footer'];

const MAX_LENGTH = 48;
// Zero-width and invisible characters (the stega encoding the preview adds).
const INVISIBLE = /[​-‏⁠-⁤﻿]/g;

/** "Our story, so far" -> "our-story-so-far". Empty when the text has no letters or digits. */
export function anchorSlug(text: string | null | undefined): string {
  if (typeof text !== 'string') return '';
  let slug = slugify(text.replace(INVISIBLE, ''));
  if (slug.length > MAX_LENGTH) {
    const cut = slug.slice(0, MAX_LENGTH + 1);
    const lastBreak = cut.lastIndexOf('-');
    slug = (lastBreak > 0 ? cut.slice(0, lastBreak) : cut.slice(0, MAX_LENGTH)).replace(/-+$/, '');
  }
  if (/^[0-9]/.test(slug)) slug = `section-${slug}`;
  return slug;
}

/** The heading text of a page-builder block: its `heading`, else its `headline`, if a string. */
export function sectionHeadingText(block: unknown): string | undefined {
  if (!block || typeof block !== 'object') return undefined;
  const b = block as { heading?: unknown; headline?: unknown };
  if (typeof b.heading === 'string' && b.heading.trim()) return b.heading;
  if (typeof b.headline === 'string' && b.headline.trim()) return b.headline;
  return undefined;
}

export interface AnchorInput {
  /** The block's `_key`, looked up in `overrides`. */
  key?: string;
  /** The section's heading text. */
  heading?: string | null;
  /** The numbered id the section has without a name. */
  fallback: string;
}

export interface AnchorOptions {
  /** A fixed name for a block, by `_key`. Wins over the heading. */
  overrides?: Readonly<Record<string, string>>;
  /** Extra ids already on the page. RESERVED_IDS are always included. */
  reserved?: Iterable<string>;
}

/** One id per input, in order: a unique name from the heading, else the fallback. */
export function sectionAnchors(inputs: readonly AnchorInput[], opts: AnchorOptions = {}): string[] {
  const candidates = inputs.map((input) =>
    anchorSlug((input.key && opts.overrides?.[input.key]) || input.heading),
  );
  const taken = new Set<string>([...RESERVED_IDS, ...(opts.reserved ?? [])]);
  // The numbered ids stay where they are, so a name never takes one of them.
  inputs.forEach((input, i) => {
    if (!candidates[i]) taken.add(input.fallback);
  });
  return inputs.map((input, i) => {
    const base = candidates[i];
    if (!base) return input.fallback;
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    taken.add(id);
    return id;
  });
}
