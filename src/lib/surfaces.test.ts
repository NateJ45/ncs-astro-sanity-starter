import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AA_BODY_TEXT, AA_LARGE_TEXT, contrastRatio } from './contrast.ts';
import { HEADING_ACCENT, SECTION_SURFACES, surfaceClass } from './surfaces.ts';
import { CONTENT_TYPES } from './sectionCadence.ts';

// =============================================================================
// The contrast gate for the section surfaces (PORTS.md card 26, 2026-08-28)
// =============================================================================
// Every surface this template paints is a PAIR: a background plus the
// foreground treatment designed for it. This walks every pair in
// src/lib/surfaces.ts, resolves its tokens against the REAL declarations in
// src/styles/globals.css, and measures. Body text, headings and links must
// clear AA 4.5:1; the accent word inside a heading is display-size text and
// must clear 3:1.
//
// WHY THIS EXISTS ALONGSIDE theme-tokens.test.ts. That gate reads the light
// `@theme` block only, and says so: the shadcn :root / .dark overrides were out
// of scope because some are authored in oklch. But the surfaces the site
// actually paints a <section> with are exactly those overrides, and they are
// plain hex. This resolves them, in BOTH themes, as the pairs a reader sees.
// The two gates overlap on nothing.
//
// It also pins the literal hexes in surfaces.ts to the resolved token values,
// so `npm run apply-brand` cannot swap the palette and leave this file
// describing colours the site no longer uses.
//
// If a candidate pair fails here, fix the PAIR. Do not lower a threshold.
// =============================================================================

const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');

/** Brace-counted extraction of `--name: #hex | var(--other)` from matching blocks. */
function tokensMatching(header: RegExp): Record<string, string> {
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
    const decl = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|var\(\s*--[\w-]+\s*\))\s*;/g;
    for (const d of css.slice(open, i).matchAll(decl)) out[d[1]] = d[2];
  }
  return out;
}

// `@theme`, `@theme inline` and `:root` are all the light scope. `.dark` is the
// dark scope, and the header pattern deliberately requires `{` right after the
// class so the `.dark .surface-warm` style rules further down are not swept in.
const light = tokensMatching(/(?:^|\n)\s*(?:@theme[^{]*|:root)\s*\{/g);
const dark = tokensMatching(/(?:^|\n)\s*\.dark\s*\{/g);

function resolve(value: string | undefined, scope: Record<string, string>, seen = 0): string {
  if (!value) throw new Error('Token has no value');
  if (seen > 5) throw new Error(`Alias loop resolving "${value}"`);
  const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (!alias) return value;
  return resolve(scope[alias[1]] ?? light[alias[1]], scope, seen + 1);
}

const themes = [
  ['light', (n: string) => resolve(light[n], light)],
  ['dark', (n: string) => resolve(dark[n] ?? light[n], dark)],
] as const;

/** #FFF and #ffffff are the same colour; compare on the expanded lowercase form. */
function norm(hex: string): string {
  const h = hex.trim().replace(/^#/, '').toLowerCase();
  return `#${h.length === 3 ? h.replace(/./g, (c) => c + c) : h}`;
}

describe('surface pairs resolve', () => {
  it('every surface names tokens that exist in globals.css', () => {
    for (const s of SECTION_SURFACES) {
      for (const [role, token] of Object.entries(s.tokens)) {
        assert.ok(
          light[token],
          `${s.value}.${role} names ${token}, which @theme/:root never declares`,
        );
      }
    }
  });

  it('the literal hexes still match the tokens they stand for', () => {
    for (const s of SECTION_SURFACES) {
      assert.equal(
        norm(s.dot),
        norm(themes[0][1](s.tokens.bg)),
        `surface "${s.value}" dot is stale against ${s.tokens.bg} (light)`,
      );
      assert.equal(
        norm(s.dotDark),
        norm(themes[1][1](s.tokens.bg)),
        `surface "${s.value}" dotDark is stale against ${s.tokens.bg} (dark)`,
      );
      assert.equal(
        norm(s.dotInk),
        norm(themes[0][1](s.tokens.text)),
        `surface "${s.value}" dotInk is stale against ${s.tokens.text} (light)`,
      );
    }
  });

  it('a theme-static band really is the same colour in both themes', () => {
    for (const s of SECTION_SURFACES.filter((x) => x.themeStatic)) {
      assert.equal(
        norm(themes[0][1](s.tokens.bg)),
        norm(themes[1][1](s.tokens.bg)),
        `surface "${s.value}" claims themeStatic but ${s.tokens.bg} flips with the theme`,
      );
    }
  });

  it('the two surfaces the cadence assigns are exactly the two it can assign', () => {
    // sectionCadence.ts hands every CONTENT block one of 'background' | 'muted'.
    // If that vocabulary ever grows, this registry has to grow with it or a
    // section will render a surface nothing has measured.
    assert.ok(CONTENT_TYPES.size > 0, 'the cadence has no content types at all');
    assert.deepEqual(
      SECTION_SURFACES.filter((s) => s.inCadence).map((s) => s.value),
      ['background', 'muted'],
    );
  });

  it('an unknown surface name falls back to Paper', () => {
    assert.equal(surfaceClass(undefined), 'bg-background');
    assert.equal(surfaceClass(null), 'bg-background');
    assert.equal(surfaceClass('not-a-surface'), 'bg-background');
    assert.equal(surfaceClass('muted'), 'bg-muted');
  });
});

describe('surface pairs clear WCAG AA', () => {
  for (const s of SECTION_SURFACES) {
    for (const [theme, v] of themes) {
      const bg = () => v(s.tokens.bg);

      it(`"${s.value}" body text clears AA in ${theme}`, () => {
        const ratio = contrastRatio(v(s.tokens.text), bg());
        assert.ok(ratio >= AA_BODY_TEXT, `${s.tokens.text} on ${s.tokens.bg} is ${ratio}:1`);
      });

      it(`"${s.value}" headings clear AA in ${theme}`, () => {
        const ratio = contrastRatio(v(s.tokens.heading), bg());
        assert.ok(ratio >= AA_BODY_TEXT, `${s.tokens.heading} on ${s.tokens.bg} is ${ratio}:1`);
      });

      it(`"${s.value}" links clear AA in ${theme}`, () => {
        const ratio = contrastRatio(v(s.tokens.link), bg());
        assert.ok(ratio >= AA_BODY_TEXT, `${s.tokens.link} on ${s.tokens.bg} is ${ratio}:1`);
      });
    }
  }
});

describe('the heading accent word', () => {
  it('its literals still match the token it reads', () => {
    assert.equal(norm(HEADING_ACCENT.light), norm(themes[0][1](HEADING_ACCENT.token)));
    assert.equal(norm(HEADING_ACCENT.dark), norm(themes[1][1](HEADING_ACCENT.token)));
  });

  // Display-size text, SC 1.4.3 large, 3:1. Measured on every surface it can
  // land on, which is every surface a section paints.
  for (const s of SECTION_SURFACES) {
    if (s.themeStatic) {
      it(`reads on the fixed "${s.value}" band`, () => {
        const ratio = contrastRatio(HEADING_ACCENT.onDarkBand, themes[0][1](s.tokens.bg));
        assert.ok(
          ratio >= AA_LARGE_TEXT,
          `${HEADING_ACCENT.onDarkBand} on ${s.tokens.bg} is ${ratio}:1`,
        );
      });
      continue;
    }
    for (const [theme, v] of themes) {
      it(`reads on "${s.value}" in ${theme}`, () => {
        const ratio = contrastRatio(v(HEADING_ACCENT.token), v(s.tokens.bg));
        assert.ok(
          ratio >= AA_LARGE_TEXT,
          `${HEADING_ACCENT.token} on ${s.tokens.bg} is ${ratio}:1`,
        );
      });
    }
  }

  it('globals.css really pins the accent on the ink band', () => {
    // The rule is what makes the measurement above true on the live page. A
    // silent delete would leave the theme-aware token flipping with the
    // READER's page theme instead of with the band it is sitting on.
    assert.match(css, /\.bg-accent-dark\s*\{[^}]*--section-accent:\s*#8A96A6/);
    assert.match(css, /\.heading-accent\s*\{[^}]*var\(--section-accent,\s*var\(--primary\)\)/);
  });
});
