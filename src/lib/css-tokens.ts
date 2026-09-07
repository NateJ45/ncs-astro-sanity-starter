// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Scope-aware extraction of CSS custom properties from globals.css
// =============================================================================
// The reading half of the contrast gates. `contrast.ts` does the WCAG maths;
// this decides WHICH declaration of a token the maths is handed. Getting that
// wrong is the worse of the two failures, because it is silent: a gate that
// measures the dark value and asserts it as a light pair still goes green.
//
// It existed twice before this file did. `surfaces.test.ts` had the good
// version (brace-counted, scope-aware, alias-following) and
// `theme-tokens.test.ts` had a single unscoped `matchAll` for `--color-*: #hex`
// across the whole stylesheet, which keeps whichever declaration comes LAST
// wherever it appears and cannot see a `var()` alias at all. That one was
// correct only by accident: every hex `--color-*` happened to sit in the one
// `@theme` block. WCP's own theme-token gate had already been bitten by the
// hex-only form and its header records the lesson: "a test that measures the
// wrong colour is worse than no test."
//
// Three rules this module holds to:
//
//  1. BRACE-COUNTED, not a lazy regex. `@theme inline` contains `@keyframes`
//     blocks, so `\{[^}]*\}` ends the block three rules early and drops
//     everything after it.
//  2. HEX AND ALIASES. A block that re-points a token with `var(--other)` is
//     changing it. Capturing only hex makes such a re-point invisible and
//     falls through to whatever the previous block said.
//  3. TOP-LEVEL BLOCKS ONLY. Every scope pattern anchors to the start of a
//     line with no indentation, so a `.dark { }` nested inside `@media print`
//     is not read as a dark theme token. The stylesheet is prettier-checked in
//     CI, and prettier puts top-level at-rules and selectors at column 0, so
//     this is an enforced property of the file rather than a hope. The gates
//     assert the token count they expect, so a stylesheet that ever breaks the
//     assumption fails loudly instead of silently reading nothing.
//  4. THE CALLER PICKS THE SCOPE. There is no single right answer to "the
//     light scope" in this stylesheet. `@theme` alone is the BRAND palette
//     that `apply-brand` rewrites; `@theme` + `@theme inline` + `:root` is
//     what a shadcn semantic token actually resolves to on the page, and the
//     two differ (`@theme inline` re-points `--color-accent` to `var(--accent)`
//     on purpose). A gate has to say which question it is asking, so the scope
//     patterns are exported separately rather than baked into one reader.
// =============================================================================

/**
 * The brand palette only: a bare `@theme { ... }`. Deliberately does NOT match
 * `@theme inline`, which is the shadcn semantic map rather than the palette.
 * This is the scope `npm run apply-brand` rewrites.
 */
export const BRAND_SCOPE = /(?:^|\n)@theme[ \t]*\{/g;

/**
 * Everything that paints the light page: both `@theme` forms and `:root`.
 * Use this when the question is "what colour does this token resolve to for a
 * reader on the light theme", not "what is in the brand palette".
 */
export const LIGHT_SCOPE = /(?:^|\n)(?:@theme[^{\n]*|:root[ \t]*)\{/g;

/**
 * The dark overrides. The `\{` is required right after the class so ordinary
 * style rules like `.dark .surface-warm { ... }` are not swept in as token
 * declarations, and the column-0 anchor keeps the `:root, .dark { }` reset
 * inside `@media print` out of the dark theme.
 */
export const DARK_SCOPE = /(?:^|\n)\.dark[ \t]*\{/g;

/** Matches `--name: #hex;` and `--name: var(--other);`, nothing else. */
const DECLARATION = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|var\(\s*--[\w-]+\s*\))\s*;/g;

/**
 * Pull the custom-property declarations out of every block whose header
 * matches, later blocks winning over earlier ones exactly as the cascade does.
 */
export function tokensIn(css: string, header: RegExp): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(header)) {
    let depth = 0;
    let i = css.indexOf('{', m.index);
    if (i === -1) continue;
    const open = i;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) break;
    }
    for (const d of css.slice(open, i).matchAll(DECLARATION)) out[d[1]] = d[2];
  }
  return out;
}

/**
 * Follow `var(--x)` aliases to a concrete value. `scope` is consulted first and
 * `fallback` second, which is how a dark block that overrides only some tokens
 * inherits the rest from light.
 */
export function resolveToken(
  value: string | undefined,
  scope: Record<string, string>,
  fallback: Record<string, string> = scope,
  seen = 0,
): string {
  if (!value) throw new Error('Token has no value');
  if (seen > 5) throw new Error(`Alias loop resolving "${value}"`);
  const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (!alias) return value;
  return resolveToken(scope[alias[1]] ?? fallback[alias[1]], scope, fallback, seen + 1);
}

/**
 * A `name -> resolved value` reader for one theme. Throws rather than returning
 * undefined, because a missing token has to fail the gate, not skip a pair.
 */
export function scopeReader(
  scope: Record<string, string>,
  fallback: Record<string, string> = scope,
): (name: string) => string {
  return (name: string) => {
    const raw = scope[name] ?? fallback[name];
    if (!raw) throw new Error(`globals.css never declares ${name} in this scope`);
    return resolveToken(raw, scope, fallback);
  };
}

/** `#FFF` and `#ffffff` are the same colour; compare on the expanded lowercase form. */
export function normalizeHex(hex: string): string {
  const h = hex.trim().replace(/^#/, '').toLowerCase();
  return `#${h.length === 3 ? h.replace(/./g, (c) => c + c) : h}`;
}
