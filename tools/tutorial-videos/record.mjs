// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Record a "Watch how it is done" clip from a script file (PORTS.md card 137)
// =============================================================================
// Ported from the Theology Matters pipeline (tools/tutorial-videos/ there),
// made simpler for the Astro family: Playwright drives the LOCAL Studio (the
// kit harness at /kit-harness/studio by default, the real Studio signed in as
// a pretend administrator, with every write refused), follows the steps in a
// script file, and records the screen. Then:
//   - with ffmpeg on PATH: trims the Studio's boot off the front and writes an
//     H.264 mp4 and a VP9 webm, with an optional music bed (below);
//   - without ffmpeg: keeps Playwright's own webm, untrimmed (the captions
//     still line up);
//   - always: a WebVTT caption file from the steps' captions, a poster (a
//     screenshot taken at the step marked `poster: true`, else after the first
//     step), and work/<slug>-cues.json for checkframes.mjs.
// It prints the entry to paste into src/sanity/guides/videos.ts.
//
// Run (one at a time; wrap it in the machine build lock when others build):
//   node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json [--serve]
//        [--base http://localhost:4321/kit-harness/studio] [--out public/guide-videos]
//        [--music <path to an mp3 or wav>]   (or TUTORIAL_MUSIC=<path>)
//
// MUSIC: the track is mixed in at a quiet bed (levelled to -22 LUFS), faded in
// over 1 s and out over the last 2 s, looped if the clip is longer, trimmed to
// the clip. Keep the track OUTSIDE the repo: the repo is public and the track's
// licence is not the repo's. Only the finished clips are committed; *.mp3 and
// *.wav under tools/ are git-ignored. No music path: the clip is silent.
// =============================================================================

import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildVtt, ffmpegArgs, videoScriptProblems } from '../../scripts/lib/studio-media.mjs';
import {
  DEFAULT_BASE,
  ROOT,
  devServer,
  hasFfmpeg,
  openStudio,
  playStep,
  runLock,
} from '../studio-media/session.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const VALUED = new Set(['--base', '--out', '--music']);
const files = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const base = flag('base', DEFAULT_BASE);
const out = resolve(ROOT, flag('out', 'public/guide-videos'));
const music = flag('music', process.env.TUTORIAL_MUSIC || '');
const serve = args.includes('--serve');
const WORK = join(ROOT, 'tools', 'tutorial-videos', 'work');

if (!files.length) {
  console.error(
    'Give a script file: node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json',
  );
  process.exit(64);
}
if (music && !existsSync(music)) {
  console.error(`The music file is not there: ${music}`);
  process.exit(66);
}
if (music && resolve(music).startsWith(ROOT)) {
  console.warn(
    'Note: the music file is inside the repo. Keep it outside, or make sure it is git-ignored.',
  );
}

async function recordOne(file) {
  const script = JSON.parse(readFileSync(file, 'utf8'));
  const problems = videoScriptProblems(script);
  if (problems.length) {
    console.error(`${file}:\n  ${problems.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  const viewport = script.viewport ?? { width: 1280, height: 800 };
  const raw = mkdtempSync(join(tmpdir(), 'ncs-video-'));
  const { browser, context, page, go } = await openStudio({
    base,
    viewport,
    cover: script.cover,
    video: raw,
    cursor: true,
  });
  const born = Date.now();
  mkdirSync(out, { recursive: true });
  mkdirSync(WORK, { recursive: true });
  const poster = join(out, `${script.slug}.jpg`);

  // The opening screen, then wait for the Studio to settle before the clock starts.
  await go(script.start ?? '/');
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if (script.ready) await page.locator(script.ready).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(script.settle ?? 2500);
  const start = (Date.now() - born) / 1000;
  const cues = [];

  for (const [i, step] of script.steps.entries()) {
    try {
      await playStep(page, go, step, {
        cursor: true,
        onCaption: (text) => cues.push({ st: (Date.now() - born) / 1000 - start, text }),
      });
    } catch (e) {
      console.error(
        `${script.slug} step ${i + 1} (${step.do} ${step.target ?? step.path ?? ''}): ${e.message.split('\n')[0]}`,
      );
      process.exitCode = 1;
      break;
    }
    // The poster: the step marked poster: true, else the screen after the first step.
    if (step.poster || (i === 0 && !script.steps.some((st) => st.poster))) {
      await page.screenshot({ path: poster, type: 'jpeg', quality: 82 });
    }
  }
  await page.waitForTimeout(script.tail ?? 1500);
  const duration = (Date.now() - born) / 1000 - start;
  const video = page.video();
  await context.close();
  await browser.close();
  const recorded = await video.path();

  const ffmpeg = hasFfmpeg();
  const mp4 = join(out, `${script.slug}.mp4`);
  const webm = join(out, `${script.slug}.webm`);
  if (ffmpeg) {
    const common = { input: recorded, duration, start, music: music || undefined };
    execFileSync('ffmpeg', ffmpegArgs({ ...common, output: mp4, format: 'mp4' }), {
      stdio: 'inherit',
    });
    execFileSync('ffmpeg', ffmpegArgs({ ...common, output: webm, format: 'webm' }), {
      stdio: 'inherit',
    });
  } else {
    // No ffmpeg: Playwright's webm as it is, so captions count from the page opening.
    copyFileSync(recorded, webm);
    for (const c of cues) c.st += start;
    console.warn(
      'ffmpeg is not on PATH: kept the webm only, untrimmed and silent. Install ffmpeg for the mp4.',
    );
  }
  const total = ffmpeg ? duration : duration + start;
  writeFileSync(join(out, `${script.slug}.vtt`), buildVtt(cues, total));
  writeFileSync(
    join(WORK, `${script.slug}-cues.json`),
    JSON.stringify(
      {
        video: webm,
        cues: cues.map((c, i) => ({ ...c, en: cues[i + 1]?.st ?? total })),
      },
      null,
      2,
    ),
  );

  const pub = (p) => `/${p.slice(join(ROOT, 'public').length + 1).replace(/\\/g, '/')}`;
  const entry = {
    title: script.title,
    ...(ffmpeg ? { src: pub(mp4) } : { src: pub(webm) }),
    ...(ffmpeg ? { webm: pub(webm) } : {}),
    poster: pub(poster),
    captions: pub(join(out, `${script.slug}.vtt`)),
    duration: Math.round(total),
    width: viewport.width,
    height: viewport.height,
  };
  console.log(
    `\n${basename(file)}: ${Math.round(total)} s, ${cues.length} captions${music ? ', with music' : ''}.`,
  );
  console.log(
    `Paste into src/sanity/guides/videos.ts:\n  '${script.slug}': ${JSON.stringify(entry, null, 2).replace(/\n/g, '\n  ')},`,
  );
  console.log(`Check it: node tools/tutorial-videos/checkframes.mjs ${script.slug}`);
}

await runLock(async () => {
  const server = await devServer(base, { serve });
  try {
    for (const f of files) await recordOne(f);
  } finally {
    server.stop();
  }
});
