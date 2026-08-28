// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-stega — reading (and putting back) the invisible marks in preview text
// (2026-08-28)
// =============================================================================
// Every display string the preview client returns carries a STEGA RUN: a few
// hundred invisible characters appended by @vercel/stega, holding a JSON blob
// `{origin: "sanity.io", href: "<studio edit intent url>"}`. That href is what
// makes click-to-edit work — the overlay decodes it to learn which document and
// which field a piece of text came from.
//
// The instant-text path (src/components/preview/overlay/useInstantText.ts) needs
// the same information in the opposite direction: given a field that changed in
// the draft, WHICH text node on this page is showing it. Decoding the runs once
// and indexing by (document id, path) answers that.
//
// WHY THIS IS HAND-ROLLED RATHER THAN IMPORTED. The decoder lives in
// `@vercel/stega` and the href parser in `@sanity/visual-editing-csm`. Neither
// is reachable: @vercel/stega is not a dependency of this project (it arrives
// only as a transitive of @sanity/client and @sanity/visual-editing), and
// visual-editing-csm is installed NESTED under @sanity/visual-editing, so
// `import '@sanity/visual-editing-csm'` does not resolve from src/. The one
// stega utility this project can import — `stegaClean` from
// '@sanity/client/stega' — throws the run away, which is exactly the half we
// need to keep. Taking on a dependency to read forty lines of format is the
// worse trade, so: forty lines, here, pure, and tested against runs captured
// from the real pipeline (src/lib/preview-stega.test.ts).
//
// THE FORMAT, from @vercel/stega 1.1.0:
//   - A run is 4+ consecutive characters from a fixed invisible alphabet.
//   - The modern encoding uses four of them — U+200B, U+200C, U+200D, U+FEFF —
//     as base-4 digits: a 4-character prefix of U+200B, then four characters per
//     UTF-8 byte of the JSON, most significant pair first.
//   - The wider alphabet in RUN_SOURCE below also covers the LEGACY hex
//     encoding, which this decoder does not read. It is in the pattern anyway so
//     that splitting removes a legacy run cleanly instead of leaving part of it
//     behind in the visible text.
// =============================================================================

/** The four characters the modern encoding uses as base-4 digits. */
const DIGIT_CODES = [0x200b, 0x200c, 0x200d, 0xfeff];
const DIGITS = DIGIT_CODES.map((code) => String.fromCodePoint(code));
const DIGIT_VALUE = new Map(DIGITS.map((char, value) => [char, value]));
const PREFIX = DIGITS[0].repeat(4);
/** Separator between several payloads combined onto one string. */
const NUL = String.fromCharCode(0);

/**
 * Every character either encoding can emit, four or more in a row. Mirrors
 * `VERCEL_STEGA_REGEX` so that splitting is exact.
 */
const RUN_SOURCE =
  '[\\u200b\\u200c\\u200d\\u2060\\u2061\\u2062\\u2063\\ufeff\\u{1d173}-\\u{1d17a}]{4,}';
const RUN_FIRST = new RegExp(RUN_SOURCE, 'u');
const RUN_ALL = new RegExp(RUN_SOURCE, 'gu');

/** A string separated into what a reader sees and what the encoder appended. */
export interface StegaSplit {
  /** The visible text, with every stega run removed. */
  cleaned: string;
  /** The first stega run found, or '' when the string carries none. */
  encoded: string;
}

/**
 * Separate visible text from its invisible payload. The counterpart of
 * `reattachStega`: for any string carrying a single run — which is how the
 * preview client emits them — splitting and reattaching is a round trip.
 */
export function splitStega(text: string): StegaSplit {
  const match = RUN_FIRST.exec(text);
  if (!match) return { cleaned: text, encoded: '' };
  return { cleaned: text.replace(RUN_ALL, ''), encoded: match[0] };
}

/**
 * Put an encoded run back on the end of a replacement string.
 *
 * This is the whole reason the instant-text path does not degrade click-to-edit:
 * a text node whose visible characters are swapped keeps the exact payload it
 * arrived with, so the overlay still resolves it to the same field.
 */
export function reattachStega(text: string, encoded: string): string {
  return encoded ? text + encoded : text;
}

/** Decode a run's bytes back into the JSON value the encoder put in. */
function decodeRun(run: string): unknown {
  const chars = Array.from(run);
  // Find the four-digit prefix that starts the modern payload. A legacy run has
  // no such prefix and falls out here as "nothing we can read".
  let start = -1;
  for (let i = 0; i + 4 <= chars.length; i += 1) {
    if (chars.slice(i, i + 4).join('') === PREFIX && (chars.length - i) % 4 === 0) {
      start = i + 4;
      break;
    }
  }
  if (start < 0) return undefined;

  const body = chars.slice(start);
  if (body.length === 0 || body.length % 4 !== 0) return undefined;
  const bytes = new Uint8Array(body.length / 4);
  for (let i = 0; i < bytes.length; i += 1) {
    let byte = 0;
    for (let pair = 0; pair < 4; pair += 1) {
      const value = DIGIT_VALUE.get(body[i * 4 + pair]);
      if (value === undefined) return undefined;
      byte = (byte << 2) | value;
    }
    bytes[i] = byte;
  }
  try {
    // Several payloads on one string are NUL-separated; the first one wins,
    // matching `vercelStegaDecode`.
    const text = new TextDecoder().decode(bytes);
    const end = text.indexOf(NUL);
    return JSON.parse(end === -1 ? text : text.slice(0, end));
  } catch {
    return undefined;
  }
}

/** Where a piece of preview text came from. */
export interface StegaSource {
  /** The published document id. */
  id: string;
  /** The document type. */
  type: string;
  /** The studio path string, e.g. `flexibleSections[_key=="a1b2"].heading`. */
  path: string;
}

/**
 * Read the source of a string the preview client produced, or null when it
 * carries no stega, carries something this decoder does not read (a legacy run),
 * or carries a payload that is not a Sanity edit intent.
 *
 * The href is a studio intent URL whose SEARCH PARAMS repeat id/type/path in
 * un-escaped form — see `createEditUrl` in @sanity/client. Reading the params
 * rather than the intent segments is what the Studio's own decoder does too, and
 * it avoids re-implementing the segment grammar.
 */
export function stegaSource(text: string): StegaSource | null {
  const { encoded } = splitStega(text);
  if (!encoded) return null;
  const payload = decodeRun(encoded);
  if (typeof payload !== 'object' || payload === null) return null;
  const href = (payload as { href?: unknown }).href;
  if (typeof href !== 'string' || href === '') return null;

  let params: URLSearchParams;
  try {
    // The href is root-relative (`/studio/intent/edit/...`). The base is never
    // read; it only makes the URL parseable.
    params = new URL(href, 'https://sanity.invalid').searchParams;
  } catch {
    return null;
  }
  const id = params.get('id');
  const type = params.get('type');
  const path = params.get('path');
  if (!id || !type || !path) return null;
  return { id, type, path };
}

/** The index key for one field of one document. */
export function sourceKey(id: string, path: string): string {
  return `${id} ${path}`;
}
