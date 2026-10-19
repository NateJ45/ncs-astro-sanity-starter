// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Studio pictures and videos, the pure half (PORTS.md card 137)
// =============================================================================
// Shared by tools/guide-shots/capture.mjs (the Site Guide's screenshots, card
// 130) and tools/tutorial-videos/record.mjs (the "Watch how it is done" clips).
// Nothing here opens a browser or a file: it checks a site's capture config and
// video scripts, turns timed captions into a WebVTT file, works out the ffmpeg
// arguments and converts a control's box into the percent marks a GuideShot
// takes. Tested in studio-media.test.mjs (npm run test:scripts).
// =============================================================================

/** Steps a video script or a shot may use, and the keys each one needs. */
export const STEP_KINDS = {
  goto: ['path'],
  click: ['target'],
  hover: ['target'],
  type: ['target', 'text'],
  press: ['key'],
  wait: ['ms'],
  waitFor: ['target'],
  scroll: ['target'],
  ring: ['target'],
  caption: ['text'],
};

/** Names covered by default: the kit harness's pretend editor. */
export const DEFAULT_COVER_NAMES = ['Ann Harness'];

/**
 * The account avatar and name, wherever Sanity 6 draws them (the top bar, the
 * presence row, "edited by" lines, the review changes panel). A site adds its own
 * in `cover.selectors`.
 */
export const DEFAULT_COVER_SELECTORS = [
  '[data-testid="user-menu-button"]',
  '[data-ui="Avatar"]',
  '[data-ui="AvatarStack"]',
  '[data-testid="presence-menu-button"]',
];

/** Problems with one step, in plain words. */
export function stepProblems(step, where) {
  if (!step || typeof step !== 'object') return [`${where}: not a step.`];
  const kind = step.do;
  if (!kind || !(kind in STEP_KINDS))
    return [`${where}: "do" must be one of ${Object.keys(STEP_KINDS).join(', ')}.`];
  const out = [];
  for (const k of STEP_KINDS[kind]) {
    if (step[k] === undefined || step[k] === '') out.push(`${where}: "${kind}" needs "${k}".`);
  }
  if (typeof step.caption === 'string' && /—/.test(step.caption))
    out.push(`${where}: caption has an em-dash.`);
  if (kind === 'caption' && typeof step.text === 'string' && /—/.test(step.text)) {
    out.push(`${where}: caption has an em-dash.`);
  }
  return out;
}

/**
 * A video script: { slug, title, start, viewport?, steps: [...] }. `start` is a
 * path under the Studio base ('/' is Home). Each step may also carry `caption`
 * (shown from that step until the next caption) and `ms` (a pause after it).
 */
export function videoScriptProblems(script) {
  const out = [];
  if (!script || typeof script !== 'object') return ['The script is not an object.'];
  if (!/^[a-z0-9-]+$/.test(script.slug ?? ''))
    out.push('"slug" must be lower-case words joined by hyphens.');
  if (!script.title) out.push('"title" is needed.');
  if (!Array.isArray(script.steps) || !script.steps.length) out.push('"steps" is needed.');
  (script.steps ?? []).forEach((s, i) => out.push(...stepProblems(s, `step ${i + 1}`)));
  for (const c of captionTexts(script)) {
    if (c.length > 90) out.push(`Caption too long for two lines: "${c.slice(0, 40)}..."`);
  }
  return out;
}

/** Every caption a script shows, in order. */
export function captionTexts(script) {
  return (script.steps ?? [])
    .map((s) => (s.do === 'caption' ? s.text : s.caption))
    .filter((c) => typeof c === 'string' && c.trim());
}

/**
 * The capture config: { base?, viewport?, cover?, shots: [{ key, path, steps?,
 * clip?, waitFor?, measure? }] }. `clip` is a selector or { x, y, width, height }.
 */
export function shotConfigProblems(config) {
  const out = [];
  if (!config || !Array.isArray(config.shots)) return ['"shots" must be a list.'];
  const keys = new Set();
  config.shots.forEach((s, i) => {
    const where = `shot ${i + 1}${s?.key ? ` (${s.key})` : ''}`;
    if (!/^[a-z0-9-]+$/.test(s?.key ?? ''))
      out.push(`${where}: "key" must be lower-case words joined by hyphens.`);
    if (keys.has(s.key)) out.push(`${where}: the key is used twice.`);
    keys.add(s.key);
    if (typeof s.path !== 'string') out.push(`${where}: "path" is needed ('/' is Home).`);
    (s.steps ?? []).forEach((st, j) => out.push(...stepProblems(st, `${where} step ${j + 1}`)));
    if (s.clip && typeof s.clip !== 'string') {
      for (const k of ['x', 'y', 'width', 'height']) {
        if (typeof s.clip[k] !== 'number') out.push(`${where}: clip needs a number "${k}".`);
      }
    }
  });
  return out;
}

/** "00:01:02.500" for WebVTT. */
export function vttTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)}.${p(r, 3)}`;
}

/**
 * Timed captions to a WebVTT file. Each cue is { st, text } (seconds from the
 * start); a cue runs until the next one starts, the last until `end`.
 */
export function buildVtt(cues, end) {
  const sorted = cues.filter((c) => c.text && c.text.trim()).sort((a, b) => a.st - b.st);
  let out = 'WEBVTT\n';
  sorted.forEach((c, i) => {
    const en = i + 1 < sorted.length ? sorted[i + 1].st : end;
    if (en - c.st < 0.3) return;
    out += `\n${i + 1}\n${vttTime(c.st)} --> ${vttTime(en)}\n${wrapCaption(c.text)}\n`;
  });
  return out;
}

/** At most two lines of about 44 characters, split at a space near the middle. */
export function wrapCaption(text, width = 44) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= width) return t;
  const mid = Math.floor(t.length / 2);
  let cut = t.lastIndexOf(' ', mid);
  const after = t.indexOf(' ', mid);
  if (cut < 0 || (after > 0 && after - mid < mid - cut)) cut = after;
  return cut > 0 ? `${t.slice(0, cut)}\n${t.slice(cut + 1)}` : t;
}

/**
 * The ffmpeg arguments that turn the recorded webm into the mp4 (H.264, AAC,
 * faststart) and a clean webm (VP9, Opus), with an optional music bed. `music`
 * is a path: looped if it is shorter than the video, trimmed to the video,
 * faded in over 1 s and out over the last 2 s, levelled to -22 LUFS (a quiet bed
 * under the screen). No music: silent, as recorded.
 */
export function ffmpegArgs({ input, output, duration, music, format, start = 0 }) {
  // `start` trims the Studio's boot off the front of the recording.
  const args = ['-v', 'error', '-y', ...(start > 0 ? ['-ss', start.toFixed(2)] : []), '-i', input];
  const vcodec =
    format === 'mp4'
      ? [
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'medium',
          '-crf',
          '26',
          '-movflags',
          '+faststart',
        ]
      : ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1'];
  const acodec =
    format === 'mp4' ? ['-c:a', 'aac', '-b:a', '128k'] : ['-c:a', 'libopus', '-b:a', '96k'];
  if (!music) return [...args, '-t', Math.max(1, duration).toFixed(2), '-an', ...vcodec, output];
  const d = Math.max(1, duration);
  const fadeOut = Math.max(0, d - 2).toFixed(2);
  return [
    ...args,
    '-stream_loop',
    '-1',
    '-i',
    music,
    '-filter_complex',
    `[1:a]loudnorm=I=-22:TP=-2:LRA=11,atrim=0:${d.toFixed(2)},afade=t=in:st=0:d=1,afade=t=out:st=${fadeOut}:d=2[a]`,
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-t',
    d.toFixed(2),
    ...vcodec,
    ...acodec,
    output,
  ];
}

/**
 * A control's box (page pixels) as GuideShot marks in percent of the cropped
 * picture: a ring grown by 3 px and a stone just outside its top right corner.
 */
export function marksFor(box, crop, label) {
  const pct = (v, size) => Math.round((v / size) * 1000) / 10;
  const x = box.x - crop.x - 3;
  const y = box.y - crop.y - 3;
  const w = box.width + 6;
  const h = box.height + 6;
  return {
    ring: {
      kind: 'ring',
      x: pct(x, crop.width),
      y: pct(y, crop.height),
      w: pct(w, crop.width),
      h: pct(h, crop.height),
    },
    stone: {
      kind: 'stone',
      x: Math.min(98, pct(x + w + 6, crop.width)),
      y: Math.max(2, pct(y - 4, crop.height)),
      ...(label ? { label } : {}),
    },
  };
}
