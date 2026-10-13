// Starter-only test (not PORTABLE): checks scripts/lib/column-alignment.mjs, the
// judgement half of scripts/measure-columns.mjs (PORTS.md card 90).
//
// Part 1 feeds the pure analyser measured geometry and needs no browser. Part 2
// serves a small fixture page, runs the real script against it in headless
// Chromium and reads the --json report. Part 2 SKIPS when Chromium is not
// installed, so `npm run test:scripts` still passes on a machine or CI job
// without a browser; the Playwright jobs and any dev machine run it for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { analyse, mode } from './column-alignment.mjs';

const TOKENS = { text: 1.1, media: 0.9 };

// A page at 1280: content column 24..1256, gutter 48, text 651, picture 533.
const band = (label, orientation, over = {}) => ({
  label,
  headingLeft: orientation === 'media-right' ? 24 : 24 + 533 + 48,
  headingCentred: false,
  split:
    orientation === 'media-right'
      ? {
          kind: 'band',
          leftLeft: 24,
          leftWidth: 651,
          rightLeft: 723,
          rightWidth: 533,
          orientation,
          ...over,
        }
      : {
          kind: 'band',
          leftLeft: 24,
          leftWidth: 533,
          rightLeft: 605,
          rightWidth: 651,
          orientation,
          ...over,
        },
});
const plain = (label, left = 24, centred = false) => ({
  label,
  headingLeft: left,
  headingCentred: centred,
  split: null,
});

test('mode picks the most common rounded value, smaller x on a tie', () => {
  assert.equal(mode([24, 24.2, 723]), 24);
  assert.equal(mode([723, 24]), 24);
  assert.equal(mode([]), null);
});

test('a page with one edge and one seam per orientation passes', () => {
  const r = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [
      plain('Plain'),
      band('A', 'media-right'),
      band('B', 'media-left'),
      band('C', 'media-right'),
      plain('Centred', 300, true),
    ],
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.edge, 24);
  assert.equal(r.seams['media-right'].seam, 723);
  assert.equal(r.seams['media-left'].seam, 605);
  assert.deepEqual(r.centred, ['Centred']);
});

test('a heading off the column edge is reported', () => {
  const r = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [plain('One'), plain('Two'), plain('Indented', 88)],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.offEdge.map((o) => [o.label, o.left, o.edge]),
    [['Indented', 88, 24]],
  );
});

test('a seam that is not where the other bands put it is reported', () => {
  const r = analyse({
    path: '/',
    width: 1280,
    tokens: null,
    sections: [
      band('A', 'media-right'),
      band('B', 'media-right'),
      band('Wide', 'media-right', { rightLeft: 752, rightWidth: 504, leftWidth: 680 }),
    ],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.seamOffenders.map((o) => [o.label, o.seam, o.expected]),
    [['Wide', 752, 723]],
  );
  assert.equal(r.seams['media-right'].spread, 29);
});

test('seams are compared within an orientation, not across', () => {
  const r = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [band('Right', 'media-right'), band('Left', 'media-left')],
  });
  assert.equal(r.ok, true);
});

test('equal halves fail the ratio check when the tokens say 1.1 : 0.9', () => {
  const r = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [band('Halves', 'media-right', { leftWidth: 592, rightWidth: 592, rightLeft: 723 })],
  });
  assert.equal(r.ratioOffenders.length, 1);
  assert.equal(r.ratioOffenders[0].label, 'Halves');
  // With no tokens on the site the ratio is simply not checked.
  const none = analyse({
    path: '/',
    width: 1280,
    tokens: null,
    sections: [band('Halves', 'media-right', { leftWidth: 592, rightWidth: 592 })],
  });
  assert.equal(none.ratioOffenders.length, 0);
});

test('the hero shares the seam but is not held to the ratio (its picture bleeds)', () => {
  const hero = {
    label: 'Hero',
    headingLeft: 24,
    headingCentred: false,
    split: {
      kind: 'hero',
      leftLeft: 24,
      leftWidth: 651,
      rightLeft: 723,
      rightWidth: 557,
      orientation: 'media-right',
    },
  };
  const ok = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [hero, band('A', 'media-right')],
  });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  const off = analyse({
    path: '/',
    width: 1280,
    tokens: TOKENS,
    sections: [
      { ...hero, split: { ...hero.split, rightLeft: 640 } },
      band('A', 'media-right'),
      band('B', 'media-right'),
    ],
  });
  assert.deepEqual(
    off.seamOffenders.map((o) => o.label),
    ['Hero'],
  );
});

test('a stacked page (no splits) is judged on its edge alone', () => {
  const r = analyse({
    path: '/',
    width: 390,
    tokens: TOKENS,
    sections: [plain('A', 16), plain('B', 16), plain('C', 16)],
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.seams, {});
});

// ---------------------------------------------------------------------------
// Part 2: the real script, in a real browser.
// ---------------------------------------------------------------------------
const script = fileURLToPath(new URL('../measure-columns.mjs', import.meta.url));
const hasChromium = fs.existsSync(chromium.executablePath());

// The same split the starter ships in globals.css, reduced to what the script reads.
const CSS = `
:root{--split-text:1.1fr;--split-media:0.9fr;--split-gutter:3rem;--container-content:82.5rem;--spacing-m:1.5rem}
body{margin:0;font:16px/1.4 sans-serif}
.wrap{margin:0 auto;max-width:var(--container-content);padding:2rem var(--spacing-m)}
.split{display:grid;gap:var(--split-gutter)}
@media (width >= 64rem){
 .split{grid-template-columns:minmax(0,var(--split-text)) minmax(0,var(--split-media))}
 .split--media-first{grid-template-columns:minmax(0,var(--split-media)) minmax(0,var(--split-text))}
 .halves{grid-template-columns:1fr 1fr}
}
.pic{height:120px;background:#789}
h2{margin:0 0 .5rem}
.centre{text-align:center}
`;
const page = (body) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body><main>${body}</main></body></html>`;

const GOOD = page(`
<section><div class="wrap"><h2>Plain</h2><p>Words.</p></div></section>
<section><div class="wrap split"><div><h2>Right</h2><p>Words.</p></div><div class="pic"></div></div></section>
<section><div class="wrap split split--media-first"><div class="pic"></div><div><h2>Left</h2><p>Words.</p></div></div></section>
<section><div class="wrap"><h2 class="centre">Centred on purpose</h2></div></section>`);

const BAD = page(`
<section><div class="wrap split"><div><h2>Right one</h2><p>Words.</p></div><div class="pic"></div></div></section>
<section><div class="wrap split"><div><h2>Right</h2><p>Words.</p></div><div class="pic"></div></div></section>
<section><div class="wrap split halves"><div><h2>Halves</h2><p>Words.</p></div><div class="pic"></div></div></section>
<section><div class="wrap" style="padding-left:6rem"><h2>Indented</h2></div></section>`);

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('content-type', 'text/html');
      res.end(req.url?.startsWith('/bad') ? BAD : GOOD);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Async on purpose: the fixture server lives in this process, so a blocking
// spawnSync would stop it answering the browser.
function measure(url, pagePath, width) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cols-')), 'r.json');
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [script, url, '--paths', pagePath, '--width', String(width), '--json', out],
      { encoding: 'utf8', timeout: 90_000 },
      (err, stdout) => {
        if (!fs.existsSync(out)) return reject(err ?? new Error('no report written'));
        resolve({
          report: JSON.parse(fs.readFileSync(out, 'utf8'))[0],
          stdout,
          code: err?.code ?? 0,
        });
      },
    );
  });
}

test(
  'script: an aligned page reports one edge and two seams and exits 0',
  { skip: !hasChromium && 'Chromium is not installed' },
  async () => {
    const server = await serve();
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const { report, code } = await measure(url, '/good', 1280);
      assert.equal(code, 0);
      assert.equal(report.ok, true, JSON.stringify(report));
      assert.equal(report.edge, 24);
      // 1232 content less a 48 gutter, split 1.1 : 0.9.
      assert.equal(report.seams['media-right'].seam, 723);
      assert.equal(report.seams['media-left'].seam, 24 + 533 + 48);
      assert.equal(report.centred.length, 1);
    } finally {
      server.close();
    }
  },
);

test(
  'script: equal halves and an indented heading fail, naming each',
  { skip: !hasChromium && 'Chromium is not installed' },
  async () => {
    const server = await serve();
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const { report, code, stdout } = await measure(url, '/bad', 1280);
      assert.equal(code, 1);
      assert.equal(report.ok, false);
      assert.deepEqual(
        report.ratioOffenders.map((o) => o.label),
        ['Halves'],
      );
      assert.deepEqual(
        report.seamOffenders.map((o) => o.label),
        ['Halves'],
      );
      assert.deepEqual(
        report.offEdge.map((o) => o.label),
        ['Indented'],
      );
      assert.match(stdout, /OFF EDGE/);
      assert.match(stdout, /OFF SEAM/);
      assert.match(stdout, /OFF RATIO/);
    } finally {
      server.close();
    }
  },
);

test(
  'script: below lg the bands stack, so there is no seam and the edge rule still runs',
  { skip: !hasChromium && 'Chromium is not installed' },
  async () => {
    const server = await serve();
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const { report, code } = await measure(url, '/good', 390);
      assert.equal(code, 0);
      assert.deepEqual(report.seams, {});
      assert.equal(report.edge, 24);
    } finally {
      server.close();
    }
  },
);
