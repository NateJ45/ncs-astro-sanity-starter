// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Capture the Site Guide's screenshots (PORTS.md cards 130 and 137)
// =============================================================================
// Runs the LOCAL Studio (the kit harness by default; see
// tools/studio-media/session.mjs), visits each screen listed in
// tools/guide-shots/shots.json, plays its steps, covers the account avatar and
// the editor's name, crops, writes a WebP into public/guide-shots/, and prints
// the picture's size plus ready-made marks (a ring and a stone, in percent) for
// every control named in `measure`, so the entry in src/sanity/guides/shots.ts
// can be written without measuring by hand.
//
// Run (one at a time; wrap it in the machine build lock when others build):
//   node tools/guide-shots/capture.mjs [key ...] [--serve] [--config tools/guide-shots/shots.json]
//
// Config (site-owned, tools/guide-shots/shots.json):
//   { "base"?: "http://localhost:4321/kit-harness/studio",
//     "viewport"?: { "width": 1280, "height": 800 },
//     "cover"?: { "selectors": ["..."], "names": ["A Name"] },
//     "shots": [ { "key": "publish-button", "path": "/structure/page",
//                  "steps"?: [ { "do": "click", "target": "text:About" } ],
//                  "waitFor"?: "[data-testid=\"action-publish\"]",
//                  "clip"?: "css selector" | { "x", "y", "width", "height" },
//                  "pad"?: 16, "quality"?: 80,
//                  "measure"?: { "Publish puts it on the website.": "[data-testid=\"action-publish\"]" } } ] }
// Steps are the video scripts' steps (scripts/lib/studio-media.mjs STEP_KINDS).
// =============================================================================

import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { marksFor, shotConfigProblems } from '../../scripts/lib/studio-media.mjs';
import {
  DEFAULT_BASE,
  ROOT,
  devServer,
  locate,
  openStudio,
  playStep,
  runLock,
} from '../studio-media/session.mjs';

const args = process.argv.slice(2);
const ci = args.indexOf('--config');
const configPath = resolve(ROOT, ci >= 0 ? args[ci + 1] : 'tools/guide-shots/shots.json');
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--config');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const problems = shotConfigProblems(config);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(65);
}
const base = config.base ?? DEFAULT_BASE;
const outDir = join(ROOT, 'public', 'guide-shots');
mkdirSync(outDir, { recursive: true });

await runLock(async () => {
  const server = await devServer(base, { serve: args.includes('--serve') });
  const { browser, page, go } = await openStudio({
    base,
    viewport: config.viewport ?? { width: 1280, height: 800 },
    cover: config.cover,
  });
  try {
    for (const shot of config.shots) {
      if (only.length && !only.includes(shot.key)) continue;
      try {
        await go(shot.path);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(shot.settle ?? 2000);
        for (const step of shot.steps ?? []) await playStep(page, go, { ms: 400, ...step });
        if (shot.waitFor) await locate(page, shot.waitFor).waitFor({ timeout: 20_000 });
        await page.waitForTimeout(600);

        // The crop: a selector's box grown by `pad`, a fixed box, or the whole screen.
        const vp = page.viewportSize();
        let crop = { x: 0, y: 0, width: vp.width, height: vp.height };
        if (typeof shot.clip === 'string') {
          const b = await locate(page, shot.clip).boundingBox();
          if (!b) throw new Error(`clip ${shot.clip} is not on screen`);
          const pad = shot.pad ?? 16;
          const x = Math.max(0, Math.floor(b.x - pad));
          const y = Math.max(0, Math.floor(b.y - pad));
          crop = {
            x,
            y,
            width: Math.min(vp.width - x, Math.ceil(b.width + pad * 2)),
            height: Math.min(vp.height - y, Math.ceil(b.height + pad * 2)),
          };
        } else if (shot.clip) crop = shot.clip;

        const marks = [];
        for (const [label, sel] of Object.entries(shot.measure ?? {})) {
          const b = await locate(page, sel).boundingBox();
          if (!b) {
            console.warn(`  ${shot.key}: "${sel}" is not on screen; no mark for it.`);
            continue;
          }
          const m = marksFor(b, crop, label);
          marks.push(m.ring, m.stone);
        }

        const png = await page.screenshot({ clip: crop });
        const file = join(outDir, `${shot.key}.webp`);
        await sharp(png)
          .webp({ quality: shot.quality ?? 80 })
          .toFile(file);
        const kb = Math.round(statSync(file).size / 1024);
        console.log(
          `\n${shot.key}: ${crop.width} x ${crop.height}, ${kb} KB${kb > 150 ? ' (over 150 KB: crop tighter or lower the quality)' : ''}`,
        );
        console.log(
          `  '${shot.key}': ${JSON.stringify(
            {
              src: `/guide-shots/${shot.key}.webp`,
              alt: 'SAY WHAT THE PICTURE SHOWS',
              width: crop.width,
              height: crop.height,
              marks,
            },
            null,
            2,
          ).replace(/\n/g, '\n  ')},`,
        );
      } catch (e) {
        console.error(`${shot.key}: ${e.message.split('\n')[0]}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
    server.stop();
  }
});
