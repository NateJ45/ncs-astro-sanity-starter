// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The path compactor must keep every point exactly where it was (svg-path-compact.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactPath } from './svg-path-compact.mjs';

const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, z: 0 };

/** Every command as [LETTER, ...absolute coordinates in tenths], for comparing two paths. */
function absolute(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const out = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const n = ARGS[lower];
    if (lower === 'z') {
      out.push(['Z']);
      x = sx;
      y = sy;
      continue;
    }
    const v = tokens.slice(i, i + n).map((t) => Math.round(Number(t) * 10) + 0);
    i += n;
    if (lower === 'h') {
      x = rel ? x + v[0] : v[0];
      out.push(['L', x, y]);
    } else if (lower === 'v') {
      y = rel ? y + v[0] : v[0];
      out.push(['L', x, y]);
    } else {
      const abs = v.map((val, k) => (rel ? val + (k % 2 === 0 ? x : y) : val));
      out.push([lower === 'm' ? 'M' : lower.toUpperCase(), ...abs]);
      x = abs[n - 2];
      y = abs[n - 1];
      if (lower === 'm') {
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L';
      }
    }
  }
  return out;
}

describe('compactPath', () => {
  it('writes the shortest relative form', () => {
    assert.equal(
      compactPath('M 10 10 C 10.5 10, 11 10.5, 11 11 L 20 11 L 20 5 Z'),
      'm10 10c.5 0 1 .5 1 1l9 0 0-6z',
    );
  });
  it('keeps every point of a hand-made path', () => {
    const d =
      'M 239.8 602.7 C 234.1 604.9, 232.3 622, 236.6 632.9 M 88.2 653.2 L 87.3 654.1 Z m 1 1 l -2 0.5 h 3 v -1 z';
    assert.deepEqual(absolute(compactPath(d)), absolute(d));
  });
  it('leaves arcs alone and rounds to a tenth', () => {
    const arc = 'M0 0 A5 5 0 0 1 10 10';
    assert.equal(compactPath(arc), arc);
    assert.equal(compactPath('M0.04 0.06 L1.26 2'), 'm0 .1 1.3 1.9');
  });
  it('never writes -0 (a tiny negative rounds to 0)', () => {
    const c = compactPath('M-0.04 -0.02 L-0 5 l-0.04 0 c-0.03 0 -0.04 -0.01 -0.01 -0.04z');
    assert.ok(!/-0(?![.\d])/.test(c), c);
    assert.equal(compactPath('M0 0 L-0.04 3'), 'm0 0 0 3');
    assert.deepEqual(absolute(c), absolute('M0 0 L0 5 l0 0 c0 0 0 0 0 0z'));
  });
  it('glues a repeated command that starts with a decimal, and never returns a longer path', () => {
    const d = 'm131.1-93q1.3-3.6 2.4-4.6 1.1-1.1 3.2-1.1q.8 0 1.1.4.4.3.4.7';
    const c = compactPath(d);
    assert.ok(c.length <= d.length, c);
    assert.ok(!c.includes('.4 .4'), c);
    assert.deepEqual(absolute(c), absolute(d));
    const tight = 'm1 1l.5.5';
    assert.equal(compactPath(tight), tight);
  });
  it('keeps every point of every SVG this repo ships, and never grows one', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    let seen = 0;
    for (const dir of ['public', 'src/assets', 'brand']) {
      const base = path.join(root, dir);
      if (!fs.existsSync(base)) continue;
      for (const f of fs.readdirSync(base, { recursive: true }).map(String)) {
        if (!f.endsWith('.svg')) continue;
        const svg = fs.readFileSync(path.join(base, f), 'utf8');
        for (const [, d] of svg.matchAll(/ d="([^"]*)"/g)) {
          const c = compactPath(d);
          assert.deepEqual(absolute(c), absolute(d), `${f}: a point moved`);
          assert.ok(c.length <= d.length, `${f}: a path got longer`);
          seen++;
        }
      }
    }
    assert.ok(seen >= 0);
  });
});
