// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Site Guide's captures: what every site's shot registry must hold (card 130)
// =============================================================================
// src/sanity/guides/shots.ts is site-owned data, so this test checks the SHAPE of
// whatever a site puts in it, not which keys it has: a file that exists, a real
// alt text, marks inside the picture, a picture light enough to load on a phone.
// It also pins resolveShot(): a key finds its entry, an unknown key falls back to
// the wireframe, and a block written in place is drawn as written.
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDE_SHOTS } from '../sanity/guides/shots.ts';
import { guides } from '../sanity/guides/content.ts';
import { PLACEHOLDER_SHOT, resolveShot, shotMarks, shotSrc } from './studio-look.ts';

const PUBLIC = new URL('../../public', import.meta.url);
/** A capture is a picture people open on a phone; past this it is too heavy. */
const MAX_BYTES = 200 * 1024;

describe('Site Guide captures', () => {
  it('every registered shot is a real, light picture with alt text and marks inside it', () => {
    for (const [key, shot] of Object.entries(GUIDE_SHOTS)) {
      assert.match(key, /^[a-z0-9]+(-[a-z0-9]+)*$/, `key "${key}" is lower-case words and dashes`);
      assert.ok(shotSrc(shot.src), `${key}: src must be a public path or an https address`);
      assert.ok(
        shot.alt && shot.alt.trim().length >= 25,
        `${key}: alt text says what the picture shows`,
      );
      assert.ok(
        shot.width > 0 && shot.height > 0,
        `${key}: width and height are the capture's own`,
      );
      if (shot.src.startsWith('/')) {
        const file = new URL(`.${shot.src}`, PUBLIC.href + '/');
        assert.ok(fs.existsSync(file), `${key}: ${shot.src} is not in public/`);
        assert.ok(fs.statSync(file).size <= MAX_BYTES, `${key}: ${shot.src} is over 200 KB`);
      }
      for (const m of shot.marks ?? []) {
        const clean = shotMarks([m])[0];
        for (const k of ['x', 'y', 'w', 'h', 'toX', 'toY'] as const) {
          const raw = (m as Record<string, unknown>)[k];
          if (raw === undefined) continue;
          assert.ok(
            typeof raw === 'number' && raw >= 0 && raw <= 100,
            `${key}: mark ${k} is a percent from 0 to 100`,
          );
        }
        if (m.kind === 'ring') {
          assert.ok(
            m.x + m.w <= 100.01 && m.y + m.h <= 100.01,
            `${key}: a ring runs off the picture`,
          );
        }
        assert.ok(clean, `${key}: a mark has an unknown kind`);
      }
      const labelled = (shot.marks ?? []).filter((m) => m.label);
      for (const m of labelled)
        assert.doesNotMatch(m.label ?? '', /\u2014/, `${key}: no em-dashes`);
    }
  });

  it('every shot block in the guides names a key or carries its own picture and alt', () => {
    for (const g of guides) {
      for (const b of g.body as { kind: string; key?: string; src?: string; alt?: string }[]) {
        if (b.kind !== 'shot') continue;
        const ok = (b.key && b.key.length > 0) || (b.src && b.alt);
        assert.ok(ok, `${g.slug}: a shot block needs a key, or src and alt`);
      }
    }
  });

  it('resolveShot finds a key, falls back to the wireframe, and keeps a block written in place', () => {
    const reg = {
      a: {
        ...PLACEHOLDER_SHOT,
        src: '/guide-shots/a.webp',
        alt: 'Picture A, with a real description.',
      },
    };
    assert.equal(resolveShot({ key: 'a' }, reg)?.src, '/guide-shots/a.webp');
    assert.equal(resolveShot({ key: 'a', caption: 'Mine' }, reg)?.caption, 'Mine');
    const missing = resolveShot({ key: 'nope' }, reg);
    assert.equal(missing?.src, PLACEHOLDER_SHOT.src);
    assert.ok(missing?.alt);
    assert.equal(resolveShot({ key: 'constructor' }, reg)?.src, PLACEHOLDER_SHOT.src);
    assert.equal(resolveShot({}, reg), null);
    const own = { src: '/x.png', alt: 'Own picture', width: 10, height: 10 };
    assert.deepEqual(resolveShot(own, reg), own);
  });
});
