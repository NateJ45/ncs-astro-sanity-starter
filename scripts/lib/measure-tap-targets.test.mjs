// Starter-only test (not PORTABLE): checks the closed-<details> rule of
// scripts/measure-tap-targets.mjs (PORTS.md card 83, docs/PENDING.md item 13).
//
// It serves a small fixture page, runs the real script against it in headless
// Chromium and reads the --json report. It SKIPS when Chromium is not installed,
// so `npm run test:scripts` still passes on a machine or CI job without a
// browser; the Playwright jobs and any dev machine run it for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const script = fileURLToPath(new URL('../measure-tap-targets.mjs', import.meta.url));
const hasChromium = fs.existsSync(chromium.executablePath());

// Every link is 16px tall with a 44px invisible ::after (card 82), rows 50px
// apart so open rows never overlap. A closed details' content still has a box in
// Chrome, which is what used to produce under-44px and stolen-tap noise.
const FIXTURE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;font:14px/1.2 sans-serif}
a.s{display:block;height:16px;position:relative;margin:0 0 34px}
a.s::after{content:"";position:absolute;left:0;top:50%;width:200px;height:44px;transform:translateY(-50%)}
.photo{height:260px;background:#789}
summary{display:block;height:20px;font-size:12px}
.good{display:block;height:48px}
</style></head><body>
<div class="photo"></div>
<details><summary class="good">A closed, summary ok</summary>
<a class="s" href="#a1">A closed one</a><a class="s" href="#a2">A closed two</a><a class="s" href="#a3">A closed three</a></details>
<div class="photo"></div>
<details open><summary class="good">B open</summary>
<a class="s" href="#b1">B open one</a><a class="s" href="#b2">B open two</a></details>
<div class="photo"></div>
<details open><summary class="good">C outer open</summary>
<details><summary>C inner closed tiny summary</summary><a class="s" href="#c1">C inner closed link</a></details>
<a class="s" href="#c2">C outer open link</a></details>
<details><summary class="good">D outer closed</summary>
<details open><summary>D inner open summary</summary><a class="s" href="#d1">D open in closed link</a></details></details>
<details><summary>E closed tiny summary</summary><a class="s" href="#e1">E closed link</a></details>
<div style="height:600px;background:#ddd"></div>
</body></html>`;

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.setHeader('content-type', 'text/html');
      res.end(FIXTURE);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Async on purpose: the fixture server lives in this process, so a blocking
// spawnSync would stop it answering the browser.
function scan(url, extra = []) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tap-')), 'r.json');
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [script, url, '--paths', '/', '--json', out, ...extra],
      { encoding: 'utf8', timeout: 90_000 },
      (err, stdout) => {
        // The script exits 1 whenever anything is under 44px; only a missing report is a real failure.
        if (!fs.existsSync(out)) return reject(err ?? new Error('no report written'));
        const list = JSON.parse(fs.readFileSync(out, 'utf8'))['/'];
        resolve({ list, texts: list.map((t) => t.text), stdout });
      },
    );
  });
}

test(
  'closed <details> content is skipped, summaries and open content are measured',
  { skip: !hasChromium && 'Chromium is not installed' },
  async () => {
    const server = await serve();
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const { list, texts, stdout } = await scan(url);
      // Skipped: everything inside a closed details, nested or not.
      for (const gone of [
        'A closed one',
        'A closed two',
        'A closed three',
        'C inner closed link',
        'D open in closed link',
        'D inner open summary',
        'E closed link',
      ]) {
        assert.ok(!texts.includes(gone), `${gone} should be skipped`);
      }
      // Measured: open content, and the summary of a closed details.
      for (const kept of [
        'B open one',
        'B open two',
        'C outer open link',
        'C inner closed tiny summary',
        'E closed tiny summary',
      ]) {
        assert.ok(texts.includes(kept), `${kept} should be measured`);
      }
      // The two undersized summaries are the only failures; no stolen taps.
      assert.deepEqual(
        list.filter((t) => !t.pass).map((t) => t.text),
        ['C inner closed tiny summary', 'E closed tiny summary'],
      );
      assert.equal(list.filter((t) => t.stolen).length, 0);
      assert.match(stdout, /2 under 44px/);
      assert.match(stdout, /0 stolen-tap warnings/);
    } finally {
      server.close();
    }
  },
);

test(
  '--include-closed-details counts closed content again',
  { skip: !hasChromium && 'Chromium is not installed' },
  async () => {
    const server = await serve();
    try {
      const url = `http://127.0.0.1:${server.address().port}`;
      const { texts } = await scan(url, ['--include-closed-details']);
      for (const back of ['A closed one', 'C inner closed link', 'E closed link']) {
        assert.ok(texts.includes(back), `${back} should be counted with the flag`);
      }
    } finally {
      server.close();
    }
  },
);
