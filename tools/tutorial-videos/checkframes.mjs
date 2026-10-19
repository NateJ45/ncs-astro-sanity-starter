// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Check a recorded clip: one frame per caption, tiled (PORTS.md card 137)
// =============================================================================
// After record.mjs, this opens the clip's webm in Playwright's Chromium, seeks
// to a moment after each caption starts (1.5 s by default, never past its end),
// takes the frame, and tiles them three across with the caption under each
// into tools/tutorial-videos/chk/<slug>-cues.jpg. Look at it before committing:
// every caption should match what is on screen, no avatar or name showing.
// No ffmpeg needed. Run: node tools/tutorial-videos/checkframes.mjs <slug> [delay]
// =============================================================================

import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ROOT } from '../studio-media/session.mjs';

const slug = process.argv[2];
const delay = Number(process.argv[3] ?? 1.5);
if (!slug) {
  console.error(
    'Usage: node tools/tutorial-videos/checkframes.mjs <slug> [seconds after each caption]',
  );
  process.exit(64);
}
const dir = join(ROOT, 'tools', 'tutorial-videos');
const { video, cues } = JSON.parse(readFileSync(join(dir, 'work', `${slug}-cues.json`), 'utf8'));
let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  ({ chromium } = await import('playwright'));
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.setContent(
  `<body style="margin:0;background:#000"><video id="v" src="${pathToFileURL(video).href}" muted style="width:640px;height:400px;object-fit:contain"></video></body>`,
);
await page.waitForFunction(() => document.querySelector('video').readyState >= 1, null, {
  timeout: 15_000,
});
const frames = [];
for (const c of cues) {
  const t = Math.max(0, Math.min(c.st + delay, c.en - 0.1));
  await page.evaluate(
    (at) =>
      new Promise((done) => {
        const v = document.querySelector('video');
        v.addEventListener('seeked', () => done(), { once: true });
        v.currentTime = at;
      }),
    t,
  );
  frames.push({ png: await page.screenshot(), text: c.text });
}
await browser.close();

const esc = (s) =>
  s.replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]);
const W = 640;
const H = 400 + 56;
const cols = 3;
const rows = Math.ceil(frames.length / cols) || 1;
const tiles = await Promise.all(
  frames.map(async (f, i) => {
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="56"><rect width="100%" height="100%" fill="#fff"/><text x="10" y="34" font-family="sans-serif" font-size="18" fill="#111">${i + 1}. ${esc(f.text.slice(0, 64))}</text></svg>`,
    );
    return [
      { input: f.png, left: (i % cols) * W, top: Math.floor(i / cols) * H },
      { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * H + 400 },
    ];
  }),
);
mkdirSync(join(dir, 'chk'), { recursive: true });
const outFile = join(dir, 'chk', `${slug}-cues.jpg`);
await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#222' } })
  .composite(tiles.flat())
  .jpeg({ quality: 80 })
  .toFile(outFile);
console.log(outFile);
