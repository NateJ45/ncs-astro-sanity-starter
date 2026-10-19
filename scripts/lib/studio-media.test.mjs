// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for scripts/lib/studio-media.mjs (card 137): script checks, WebVTT, ffmpeg arguments, marks.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import {
  buildVtt,
  captionTexts,
  ffmpegArgs,
  marksFor,
  shotConfigProblems,
  videoScriptProblems,
  vttTime,
  wrapCaption,
} from './studio-media.mjs';

describe('video scripts', () => {
  it('accepts a good script and names what is missing', () => {
    const good = {
      slug: 'post-a-notice',
      title: 'Put up a notice',
      steps: [
        { do: 'goto', path: '/quick-update', caption: 'Open Quick update.' },
        { do: 'click', target: 'text:Put up a notice' },
        { do: 'type', target: '#quick-title', text: 'Bake sale' },
      ],
    };
    assert.deepEqual(videoScriptProblems(good), []);
    assert.deepEqual(captionTexts(good), ['Open Quick update.']);
    const bad = {
      slug: 'Bad Slug',
      steps: [{ do: 'click' }, { do: 'fly' }, { do: 'caption', text: 'a — b' }],
    };
    assert.equal(videoScriptProblems(bad).length, 5);
  });
  it("checks this site's scripts", () => {
    const dir = new URL('../../tools/tutorial-videos/scripts/', import.meta.url);
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const s = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      assert.deepEqual(videoScriptProblems(s), [], f);
    }
  });
  it("checks this site's shot config", () => {
    const f = new URL('../../tools/guide-shots/shots.json', import.meta.url);
    if (!existsSync(f)) return;
    assert.deepEqual(shotConfigProblems(JSON.parse(readFileSync(f, 'utf8'))), []);
  });
});

describe('captions', () => {
  it('formats WebVTT times', () => {
    assert.equal(vttTime(62.5), '00:01:02.500');
  });
  it('runs each cue to the next and wraps long lines in two', () => {
    const vtt = buildVtt(
      [
        { st: 0.5, text: 'Open Quick update from the top bar of the editor, on the left.' },
        { st: 3, text: 'Pick the job.' },
      ],
      6,
    );
    assert.match(vtt, /^WEBVTT\n/);
    assert.match(vtt, /00:00:00\.500 --> 00:00:03\.000/);
    assert.match(vtt, /00:00:03\.000 --> 00:00:06\.000/);
    assert.equal(wrapCaption('short'), 'short');
    assert.equal(wrapCaption('a'.repeat(20) + ' ' + 'b'.repeat(30)).split('\n').length, 2);
  });
});

describe('ffmpeg', () => {
  it('is silent without music, trimmed to the clip', () => {
    const a = ffmpegArgs({
      input: 'in.webm',
      output: 'o.mp4',
      duration: 30,
      start: 4,
      format: 'mp4',
    });
    assert.ok(a.includes('-an'));
    assert.equal(a[a.indexOf('-ss') + 1], '4.00');
    assert.ok(a.includes('libx264'));
  });
  it('loops, levels, fades and trims the music bed', () => {
    const a = ffmpegArgs({
      input: 'in.webm',
      output: 'o.webm',
      duration: 40,
      music: 'm.mp3',
      format: 'webm',
    });
    const fc = a[a.indexOf('-filter_complex') + 1];
    assert.ok(a.indexOf('-stream_loop') < a.indexOf('m.mp3'));
    assert.match(fc, /loudnorm=I=-22/);
    assert.match(fc, /afade=t=in:st=0:d=1/);
    assert.match(fc, /afade=t=out:st=38\.00:d=2/);
    assert.ok(a.includes('libopus'));
  });
});

describe('marks', () => {
  it('turns a box into a ring and a stone in percent of the crop', () => {
    const m = marksFor(
      { x: 110, y: 60, width: 80, height: 30 },
      { x: 10, y: 10, width: 400, height: 200 },
      'Publish',
    );
    assert.deepEqual(m.ring, { kind: 'ring', x: 24.3, y: 23.5, w: 21.5, h: 18 });
    assert.equal(m.stone.label, 'Publish');
  });
});
