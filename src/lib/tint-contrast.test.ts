import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AA_BODY_TEXT, contrastRatio, flatten, hexToRgb, rgbToHex } from './contrast.ts';
import { DARK_SCOPE, LIGHT_SCOPE, scopeReader, tokensIn } from './css-tokens.ts';

// =============================================================================
// Variant-matrix contrast gate for TINTED chips and badges
// (PORTS.md card 62, from the West Chester Preschool Family Hub, 2026-09-07)
// =============================================================================
// WHY THIS EXISTS ALONGSIDE theme-tokens.test.ts AND surfaces.test.ts. Those
// measure declared token pairs on BARE surfaces. A chip or badge is a soft tint
// (`bg-primary/15`) flattened over a surface, and flattening lifts the
// composite several tonal steps: a muted token with a comfortable margin on the
// bare surface can land under 4.5:1 on the tinted one. "Neutral text on a tint
// is safe" is false for the MUTED neutral.
//
// An axe sweep cannot stand in for this. When a tint varies by DATA (a chip per
// event type, a badge per status), axe only ever audits the variants the feed
// happened to render, so the unreachable variant is the one that ships broken.
// This is hermetic: it composites every variant from the real token values, in
// both themes, in milliseconds, with no browser and no data.
//
// HOW TO USE IT IN A FORK. TINTS lists the (token, alpha) pairs the site
// paints behind a chip or badge. When you add a tinted variant, add a row. The
// source scan at the bottom is the tripwire for the case where someone forgets:
// any class string that pairs `text-muted-foreground` with a `bg-<token>/NN`
// tint is measured too, wherever it lives under src/.
//
// RULE THE TEST HOLDS: on a tint, "neutral" means the full-strength
// `--foreground`. `--muted-foreground` is not a safe neutral there. Colour
// belongs in the tint and in an aria-hidden icon (3:1 bar), not in the label.
//
// If a variant fails, fix the PAIR (use the full-strength neutral for the
// label). Do not lower a threshold.
// =============================================================================

const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');
const light = tokensIn(css, LIGHT_SCOPE);
const dark = tokensIn(css, DARK_SCOPE);

const themes = [
  ['light', scopeReader(light)],
  ['dark', scopeReader(dark, light)],
] as const;

/** Tint tokens a chip or badge is likely to use, with the alphas that matter. */
const TINT_TOKENS = ['--primary', '--secondary', '--accent', '--muted'] as const;
const TINT_ALPHAS = [0.1, 0.15, 0.2, 0.3] as const;

/** Surfaces a chip or badge sits on: the page, a card, the muted band. */
const SURFACES = ['--background', '--card', '--muted'] as const;

/** Flatten `tint` at `alpha` over `surface`, as the browser composites it. */
function composite(tint: string, alpha: number, surface: string): string {
  return rgbToHex(flatten(hexToRgb(tint), alpha, hexToRgb(surface)));
}

describe('tinted chip/badge variant matrix', () => {
  // HARD GATE: the full-strength neutral clears AA on every tint, surface and
  // theme. This is the label colour the doctrine prescribes on a tint, so a
  // palette (or an apply-brand run) that breaks it fails here.
  for (const [theme, v] of themes) {
    for (const tint of TINT_TOKENS) {
      for (const alpha of TINT_ALPHAS) {
        for (const surface of SURFACES) {
          it(`--foreground on ${tint}/${alpha * 100} over ${surface} (${theme})`, () => {
            const bg = composite(v(tint), alpha, v(surface));
            const ratio = contrastRatio(v('--foreground'), bg);
            assert.ok(
              ratio >= AA_BODY_TEXT,
              `--foreground on ${tint} at ${alpha * 100}% over ${surface} (${theme}) is ${ratio}:1`,
            );
          });
        }
      }
    }
  }

  // THE LESSON, MEASURED. --muted-foreground is NOT a safe neutral on a tint:
  // it is never better than the full-strength neutral, and on this palette it
  // drops under 4.5:1 on several of the variants above (see the diagnostics
  // printed by this test, and PORTS.md card 62 for the list at the time it was
  // written). It is deliberately not a hard gate across the whole matrix,
  // because a fork's palette moves the numbers; it IS a hard gate for every
  // tint the source really pairs it with (the scan below).
  it('--muted-foreground is never the stronger label, and the under-AA variants are reported', (t) => {
    const under: string[] = [];
    for (const [theme, v] of themes) {
      for (const tint of TINT_TOKENS) {
        for (const alpha of TINT_ALPHAS) {
          for (const surface of SURFACES) {
            const bg = composite(v(tint), alpha, v(surface));
            const muted = contrastRatio(v('--muted-foreground'), bg);
            const strong = contrastRatio(v('--foreground'), bg);
            assert.ok(
              muted <= strong,
              `muted beat foreground on ${tint}/${alpha * 100} (${theme})`,
            );
            if (muted < AA_BODY_TEXT) {
              under.push(`${theme} ${tint}/${alpha * 100} over ${surface}: ${muted}:1`);
            }
          }
        }
      }
    }
    t.diagnostic(`muted-foreground under AA on ${under.length} variants: ${under.join('; ')}`);
  });
});

describe('the source scan: muted text on a tint, wherever it lives', () => {
  // Pull every quoted string under src/ that carries BOTH a tint utility and
  // text-muted-foreground, then measure each (tint, alpha) it names against the
  // three surfaces. Tokens the reader cannot resolve to hex (the oklch ones,
  // `destructive` and the alpha `input`) are listed, not silently skipped.
  const SRC = new URL('..', import.meta.url);
  const files = walk(SRC).filter((f) => /\.(astro|tsx|ts)$/.test(f) && !/\.test\.ts$/.test(f));

  const found: { file: string; token: string; alpha: number }[] = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(
      /(["'`])((?:(?!\1)[^\n])*?text-muted-foreground(?:(?!\1)[^\n])*?)\1/g,
    )) {
      for (const t of m[2].matchAll(/(?<![\w-])bg-([a-z-]+)\/(\d{1,3})(?![\w])/g)) {
        found.push({ file: f, token: `--${t[1]}`, alpha: Number(t[2]) / 100 });
      }
    }
  }

  it('finds the muted-on-tint pairs (or none) and measures every one it can resolve', (t) => {
    t.diagnostic(
      `scan found ${found.length} muted-on-tint pairs: ${found.map((f) => `${f.token}/${f.alpha * 100}`).join(', ')}`,
    );
    for (const { file, token, alpha } of found) {
      for (const [theme, v] of themes) {
        let tintHex: string;
        try {
          tintHex = v(token);
        } catch {
          continue; // not declared as a hex token in this scope
        }
        if (!/^#[0-9a-f]{3,8}$/i.test(tintHex)) continue; // oklch etc.: not resolvable here
        // The reader only sees hex and var() declarations, so a token the dark
        // block redeclares in oklch (or with alpha, like --input) would silently
        // fall back to its LIGHT hex. Skip it rather than measure a wrong colour.
        if (theme === 'dark' && darkRedeclaresNonHex(token)) continue;
        for (const surface of SURFACES) {
          const bg = composite(tintHex, alpha, v(surface));
          const ratio = contrastRatio(v('--muted-foreground'), bg);
          assert.ok(
            ratio >= AA_BODY_TEXT,
            `${file}: text-muted-foreground on ${token}/${alpha * 100} over ${surface} (${theme}) is ${ratio}:1`,
          );
        }
      }
    }
  });
});

/** True when the `.dark` block declares `token` in a form the reader cannot resolve. */
function darkRedeclaresNonHex(token: string): boolean {
  const start = css.search(/\n\.dark[ \t]*\{/);
  if (start === -1) return false;
  const block = css.slice(start, css.indexOf('\n}', start));
  const m = block.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return m !== null && !/^(#[0-9a-f]{3,8}|var\()/i.test(m[1].trim());
}

function walk(dir: URL): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) out.push(...walk(child));
    else out.push(fileURLToPath(child));
  }
  return out;
}
