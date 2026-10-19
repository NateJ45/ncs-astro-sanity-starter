// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio's splash and offline page, PORTS.md card 132 (src/lib/studio-splash.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveLook, type LookBase, type StudioLookInput } from './studio-look.ts';
import { connectorStroke, splashName, splashPath } from './studio-splash.ts';
import { contrastRatio } from './contrast.ts';

const base: LookBase = {
  paper: '#fbfbfa',
  dark: '#15171a',
  chrome: '#1e2a3a',
  accent: '#586577',
  accentOnDark: '#aab0b8',
};

// A look like a real church site's: art marker, pebbles, dashes, lettering made for a dark banner.
const church: StudioLookInput = {
  markColors: ['#2C5B3A', '#235E93', '#C4401F', '#3B83AA'],
  stone: 'pebble',
  connector: { kind: 'dashes', color: '#E8A93A' },
  lettering: { family: 'Site Stone', src: '/fonts/stone.woff2', colors: ['#FFFFFF', '#96C3EA'] },
  motion: 'lay',
};

describe('splashPath', () => {
  it('with no look (the starter): five round stones in the accent, joined by a line', () => {
    const p = splashPath(resolveLook(undefined, base));
    assert.equal(p.stones.length, 5);
    assert.equal(p.links.length, 4);
    assert.equal(p.connector, 'line');
    for (const s of p.stones) {
      assert.match(s.d, /^M0 /, 'round stones are drawn as two arcs');
      assert.ok(contrastRatio(s.light, base.paper) >= 3, `${s.light} on the paper`);
      assert.ok(contrastRatio(s.dark, base.dark) >= 3, `${s.dark} on the dark page`);
    }
  });

  it("in the site's look: its shape, its colours in order, its connector; stable per build", () => {
    const look = resolveLook(church, base);
    const a = splashPath(look);
    const b = splashPath(look);
    assert.deepEqual(a, b, 'seeded');
    assert.equal(a.connector, 'dashes');
    assert.equal(a.connectorLight, '#e8a93a');
    assert.equal(a.stones[0].light, look.light.stones[0].fill);
    assert.equal(a.stones[4].light, look.light.stones[0].fill, 'colours cycle');
    // Stones sit inside the view box and do not overlap their neighbours.
    for (let i = 0; i < a.stones.length; i++) {
      const s = a.stones[i];
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= a.width && s.y + s.h <= a.height);
      if (i) assert.ok(s.x > a.stones[i - 1].x + a.stones[i - 1].w);
    }
  });

  it('connector strokes for each kind', () => {
    assert.equal(connectorStroke('dashes').dash, '6 6');
    assert.equal(connectorStroke('dots').cap, 'round');
    assert.equal(connectorStroke('line').dash, null);
  });
});

describe('splashName', () => {
  it('no lettering: the whole name in the display font', () => {
    const n = splashName('Studio Starter', resolveLook(undefined, base), 'Georgia, serif');
    assert.equal(n.before, 'Studio Starter');
    assert.equal(n.lettered.length, 0);
    assert.equal(n.face, null);
  });

  it("lettering: the last word, in colours that read on each page (3:1), else the stones'", () => {
    const look = resolveLook(church, base);
    const n = splashName('First Church of Auburn', look, 'Georgia, serif');
    assert.equal(n.before, 'First Church of ');
    assert.equal(n.lettered.map((x) => x.char).join(''), 'Auburn');
    assert.match(n.face ?? '', /font-family:'Site Stone';src:url\('\/fonts\/stone\.woff2'\)/);
    assert.match(n.stack, /^'Site Stone', Georgia/);
    for (const x of n.lettered) {
      // White and pale blue fail on the light paper, so the stones' colours stand in.
      assert.ok(contrastRatio(x.light!, look.light.paper) >= 3, `${x.light} light`);
      assert.ok(contrastRatio(x.dark!, look.dark.paper) >= 3, `${x.dark} dark`);
    }
    assert.equal(n.lettered[0].dark, '#ffffff', 'the lettering keeps its own colours on dark');
  });
});

describe('the splash partial', () => {
  const root = join(import.meta.dirname, '..', '..');
  const partial = readFileSync(join(root, 'src/components/studio/StudioSplash.astro'), 'utf8');

  it('is still when the reader asks for less motion', () => {
    assert.match(partial, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/);
  });

  it('is shared by the boot page and the offline page', () => {
    for (const page of ['src/pages/studio/index.astro', 'src/pages/studio/offline.astro']) {
      const text = readFileSync(join(root, page), 'utf8');
      assert.match(text, /<StudioSplash mode="(loading|offline)"/, page);
    }
  });

  it('the offline button is a real, focusable button with a visible ring', () => {
    const offline = readFileSync(join(root, 'src/pages/studio/offline.astro'), 'utf8');
    assert.match(offline, /<button type="button" class="ncs-sp__button"/);
    assert.match(partial, /\.ncs-sp__button:focus-visible \{\s*outline: 3px solid/);
  });
});
