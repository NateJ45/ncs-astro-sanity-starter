// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 135: Home's banner style slot (src/lib/studio-banner-style.ts).
//
// This is the gate that keeps the documented hooks real. A site styles the banner
// by `kitConfig.homeBanner.style` and by the `data-hb-part` names, `data-hb-*`
// attributes and `--hb-*` variables listed in HOME_BANNER_*; if the kit drops or
// renames one, this fails here instead of a site's look silently disappearing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cleanFont,
  cleanLength,
  eyebrowText,
  HOME_BANNER_ATTRS,
  HOME_BANNER_PARTS,
  HOME_BANNER_STYLE_CSS,
  HOME_BANNER_VARS,
  resolveBannerStyle,
  type HomeBannerStyle,
} from './studio-banner-style.ts';
import { BANNER_LOOKS } from '../sanity/kit/harness/bannerLooks.ts';

const GROUND = '#1b4a75';
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const banner = read('../sanity/kit/HomeBanner.tsx');
const docs = read('../../docs/agent/studio-kit.md');

/** Every key the slot has, set to a value that passes, so every hook is emitted. */
const MAXIMAL: HomeBannerStyle = {
  background: { color: '#14233a', texture: '/textures/tile.svg', rule: '#e8a93a' },
  eyebrow: {
    text: 'Today, {date}',
    font: "'Inter Variable', sans-serif",
    size: '13px',
    weight: 600,
    tracking: '0.14em',
    case: 'upper',
    color: '#ffffff',
    mark: { kind: 'rule', color: '#e8a93a' },
  },
  greeting: { font: 'Georgia, serif', italic: true, weight: 400 },
  title: {
    font: 'Georgia, serif',
    weight: 400,
    size: 'clamp(2.6rem, 2.2rem + 2.6vw, 4.6rem)',
    leading: 0.92,
    tracking: '0.01em',
    case: 'upper',
    color: '#ffffff',
    echo: { color: '#a83c26', offset: '0.05em' },
    lastLetterOutline: '#fed89b',
  },
  chip: {
    shape: 'square',
    bg: '#a83c26',
    fg: '#ffebbb',
    hoverBg: '#8f3323',
    hoverFg: '#ffffff',
    edge: '#000000',
    ring: '#fed89b',
    halo: '#e8a93a',
    font: 'Georgia, serif',
    size: '1rem',
    weight: 700,
    tracking: '0.08em',
    case: 'upper',
  },
  motif: { place: 'behind-right' },
  stamp: { text: 'A claim', color: '#fed89b', font: 'Georgia, serif' },
};

describe('no style, no change', () => {
  it('emits nothing at all', () => {
    for (const s of [undefined, {}, { eyebrow: {} }]) {
      const r = resolveBannerStyle(s as HomeBannerStyle | undefined, GROUND);
      assert.equal(r.css, '');
      assert.deepEqual(r.root, {});
      assert.deepEqual(r.eyebrow, {});
      assert.deepEqual(r.chip, {});
      assert.equal(r.stamp, null);
    }
  });
});

describe('the documented hooks exist', () => {
  it('every data-hb-part name is in HomeBanner.tsx', () => {
    for (const part of HOME_BANNER_PARTS) {
      assert.ok(
        banner.includes(`data-hb-part="${part}"`) || banner.includes(`'${part}'`),
        `HomeBanner.tsx no longer carries data-hb-part="${part}"`,
      );
    }
  });
  it('HomeBanner.tsx carries no data-hb-part name that is not documented', () => {
    const used = [...banner.matchAll(/data-hb-part="([a-z-]+)"/g)].map((m) => m[1]);
    for (const u of used) assert.ok((HOME_BANNER_PARTS as readonly string[]).includes(u), u);
  });
  it('every documented attribute and variable is produced by a full style', () => {
    const r = resolveBannerStyle(MAXIMAL, GROUND);
    const made = new Set([
      ...Object.keys(r.root),
      ...Object.keys(r.eyebrow),
      ...Object.keys(r.chip),
    ]);
    for (const a of HOME_BANNER_ATTRS) assert.ok(made.has(a), `${a} is not produced`);
    for (const v of HOME_BANNER_VARS) assert.ok(r.css.includes(`${v}:`), `${v} is not defined`);
  });
  it('the static CSS reads every attribute and part it documents', () => {
    for (const a of HOME_BANNER_ATTRS) {
      assert.ok(HOME_BANNER_STYLE_CSS.includes(`[${a}`), `${a} is never selected`);
    }
    for (const part of ['body', 'motif', 'eyebrow', 'chip', 'stamp'] as const) {
      assert.ok(HOME_BANNER_STYLE_CSS.includes(`data-hb-part="${part}"`), part);
    }
  });
  it('the docs list every part, attribute and variable', () => {
    for (const part of HOME_BANNER_PARTS) assert.ok(docs.includes(`\`${part}\``), part);
    for (const a of HOME_BANNER_ATTRS) assert.ok(docs.includes(`\`${a}\``), a);
    for (const v of HOME_BANNER_VARS) assert.ok(docs.includes(`\`${v}\``), v);
  });
  it('every var the static CSS reads is a documented one (plus the plate skew)', () => {
    const used = new Set(
      [...HOME_BANNER_STYLE_CSS.matchAll(/var\((--hb-[a-z-]+)\)/g)].map((m) => m[1]),
    );
    for (const v of used) {
      assert.ok(
        (HOME_BANNER_VARS as readonly string[]).includes(v) || v === '--hb-plate-skew',
        `${v} is read but not documented`,
      );
    }
  });
});

describe('a full style resolves cleanly', () => {
  it('has no ignored value', () => {
    assert.deepEqual(resolveBannerStyle(MAXIMAL, GROUND).notes, []);
  });
  it('writes the eyebrow words with the date filled in', () => {
    const r = resolveBannerStyle(MAXIMAL, GROUND);
    assert.equal(eyebrowText(r.eyebrowTemplate, 'Monday 19 October'), 'Today, Monday 19 October');
    assert.equal(eyebrowText(undefined, 'Monday 19 October'), 'Monday 19 October');
  });
});

describe('the five sites are covered', () => {
  for (const [key, look] of Object.entries(BANNER_LOOKS)) {
    it(`${key}: the slot says what its CSS did, with nothing ignored`, () => {
      const r = resolveBannerStyle(look.style, look.ground);
      assert.deepEqual(r.notes, []);
      assert.ok(r.css.length > 0);
    });
  }
  it('each chip shape is used by at least one site', () => {
    const shapes = new Set(Object.values(BANNER_LOOKS).map((l) => l.style.chip?.shape));
    for (const s of ['pill', 'square', 'tag', 'plate', 'stitched']) {
      assert.ok(shapes.has(s as never), s);
    }
  });
});

describe('guards', () => {
  it('drops text colours that do not read on the banner', () => {
    const r = resolveBannerStyle(
      { eyebrow: { color: '#2c5b3a' }, title: { color: '#2c5b3a' } },
      GROUND,
    );
    assert.equal(r.notes.length, 2);
    assert.ok(!r.css.includes('#2c5b3a'));
  });
  it('leaves the chip as Sanity draws it when fg on bg is under 4.5:1', () => {
    const r = resolveBannerStyle({ chip: { shape: 'pill', bg: '#ffffff', fg: '#dddddd' } }, GROUND);
    assert.deepEqual(r.chip, {});
    assert.equal(r.notes.length, 1);
  });
  it('a shape needs both colours', () => {
    const r = resolveBannerStyle({ chip: { shape: 'tag', bg: '#ffffff' } }, GROUND);
    assert.deepEqual(r.chip, {});
  });
  it('ignores a background white text cannot read on', () => {
    const r = resolveBannerStyle({ background: { color: '#ffffff' } }, GROUND);
    assert.ok(!('data-hb-bg' in r.root));
    assert.equal(r.notes.length, 1);
  });
  it('a hover text colour that fails keeps the resting one', () => {
    const r = resolveBannerStyle(
      {
        chip: {
          shape: 'pill',
          bg: '#a83c26',
          fg: '#ffebbb',
          hoverBg: '#ffffff',
          hoverFg: '#fafafa',
        },
      },
      GROUND,
    );
    assert.ok(r.css.includes('--hb-chip-fg-hover:#ffebbb'));
  });
  it('nothing in a value can close the rule or break out of the stylesheet', () => {
    const evil = 'x;}</style><script>alert(1)</script>{';
    assert.equal(cleanFont(evil), null);
    assert.equal(cleanLength(evil), null);
    assert.equal(cleanLength('url(javascript:alert(1))'), null);
    assert.equal(cleanLength('calc(1px'), null);
    const r = resolveBannerStyle(
      {
        eyebrow: { font: evil, size: evil, tracking: evil, text: '<b>hi</b>' },
        background: { texture: '/a/../b.svg' },
        stamp: { text: '<script>', color: '#ffffff' },
      },
      GROUND,
    );
    assert.ok(!r.css.includes('<'));
    assert.ok(!r.css.includes('alert'));
    assert.ok(!('data-hb-texture' in r.root));
  });
  it('accepts the lengths sites use', () => {
    for (const v of ['13px', '0.75rem', '0.14em', 'clamp(2.6rem, 2.2rem + 2.6vw, 4.6rem)']) {
      assert.equal(cleanLength(v), v);
    }
  });
});
