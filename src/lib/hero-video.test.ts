// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Unit tests for the photo hero's video rules (src/lib/hero-video.ts, PORTS.md card 189).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAST_START_PROBE_BYTES,
  checkFastStart,
  HERO_PHONE_VIDEO_BUDGET,
  HERO_VIDEO_BUDGET,
  heroVideoAllowed,
  heroVideoPick,
  heroVideoProblem,
  heroVideoSource,
  mp4FastStart,
} from './hero-video.ts';

test('heroVideoSource takes mp4 and webm uploads only', () => {
  assert.deepEqual(heroVideoSource({ url: 'https://cdn.sanity.io/a.mp4', mimeType: 'video/mp4' }), {
    url: 'https://cdn.sanity.io/a.mp4',
    type: 'video/mp4',
  });
  assert.equal(
    heroVideoSource({ url: 'https://cdn.sanity.io/a.webm', mimeType: 'video/webm' })?.type,
    'video/webm',
  );
  assert.equal(
    heroVideoSource({ url: 'https://cdn.sanity.io/a.mov', mimeType: 'video/quicktime' }),
    null,
  );
  assert.equal(heroVideoSource({ url: '', mimeType: 'video/mp4' }), null);
  assert.equal(heroVideoSource(null), null);
  assert.equal(heroVideoSource(undefined), null);
});

test('heroVideoProblem: an error for the wrong type, a warning over budget', () => {
  assert.equal(heroVideoProblem(null), null);
  assert.equal(heroVideoProblem({ mimeType: 'video/mp4', size: 3_000_000 }), null);
  assert.equal(heroVideoProblem({ mimeType: 'video/quicktime', size: 1 })?.level, 'error');
  const big = heroVideoProblem({ mimeType: 'video/mp4', size: HERO_VIDEO_BUDGET + 1 });
  assert.equal(big?.level, 'warning');
  assert.match(big?.message ?? '', /3\.0 MB\. Keep it under 3 MB/);
});

test('heroVideoProblem: the phone copy has its own 1 MB budget', () => {
  assert.equal(heroVideoProblem({ mimeType: 'video/mp4', size: 280_000 }, 'phone'), null);
  const big = heroVideoProblem(
    { mimeType: 'video/mp4', size: HERO_PHONE_VIDEO_BUDGET + 1 },
    'phone',
  );
  assert.equal(big?.level, 'warning');
  assert.match(big?.message ?? '', /phone video is 1\.0 MB\. Keep it under 1 MB/);
  // 1.5 MB is fine for the main clip but over the phone budget.
  assert.equal(heroVideoProblem({ mimeType: 'video/mp4', size: 1_500_000 }), null);
  assert.equal(
    heroVideoProblem({ mimeType: 'video/mp4', size: 1_500_000 }, 'phone')?.level,
    'warning',
  );
});

test('heroVideoPick: the phone copy on a phone, the main clip elsewhere', () => {
  const main = { url: '/big.mp4', type: 'video/mp4' };
  const phone = { url: '/small.mp4', type: 'video/mp4' };
  assert.equal(heroVideoPick(main, phone, true), phone);
  assert.equal(heroVideoPick(main, phone, false), main);
  // No phone copy: phones play the main clip; only a phone copy: everyone gets it.
  assert.equal(heroVideoPick(main, null, true), main);
  assert.equal(heroVideoPick(null, phone, false), phone);
  assert.equal(heroVideoPick(null, null, true), null);
});

test('heroVideoAllowed keeps the still for reduced motion, print, Save-Data and slow links', () => {
  assert.equal(heroVideoAllowed({ reducedMotion: false }), true);
  assert.equal(heroVideoAllowed({ reducedMotion: false, effectiveType: '4g' }), true);
  assert.equal(heroVideoAllowed({ reducedMotion: true }), false);
  assert.equal(heroVideoAllowed({ reducedMotion: false, print: true }), false);
  assert.equal(heroVideoAllowed({ reducedMotion: false, saveData: true }), false);
  for (const slow of ['slow-2g', '2g', '3g']) {
    assert.equal(heroVideoAllowed({ reducedMotion: false, effectiveType: slow }), false, slow);
  }
  // A measured downlink under 1 Mbps keeps the still even on "4g"; 0 means unknown.
  const fourG = { reducedMotion: false, effectiveType: '4g' };
  assert.equal(heroVideoAllowed({ ...fourG, downlink: 0.45 }), false);
  assert.equal(heroVideoAllowed({ ...fourG, downlink: 1.6 }), true);
  assert.equal(heroVideoAllowed({ ...fourG, downlink: 0 }), true);
});

/** An mp4's top-level boxes, each `[type, size]`, with empty bodies. */
function boxes(...list: [string, number][]): Uint8Array {
  const total = list.reduce((n, [, size]) => n + size, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;
  for (const [type, size] of list) {
    view.setUint32(offset, size);
    out.set(
      [...type].map((c) => c.charCodeAt(0)),
      offset + 4,
    );
    offset += size;
  }
  return out;
}

test('mp4FastStart: the index before the video data is fast start', () => {
  assert.equal(mp4FastStart(boxes(['ftyp', 24], ['moov', 400], ['mdat', 16])), true);
  assert.equal(mp4FastStart(boxes(['ftyp', 32], ['free', 8], ['moov', 64])), true);
});

test('mp4FastStart: the video data first is not', () => {
  assert.equal(mp4FastStart(boxes(['ftyp', 24], ['wide', 8], ['mdat', 16])), false);
});

test('mp4FastStart: a 64-bit box size is followed', () => {
  const head = boxes(['ftyp', 24], ['free', 16], ['moov', 16]);
  // Turn the free box into a 64-bit sized one of the same 16 bytes.
  const view = new DataView(head.buffer);
  view.setUint32(24, 1);
  view.setBigUint64(32, 16n);
  assert.equal(mp4FastStart(head), true);
});

test('mp4FastStart: cannot tell for a non-mp4 or when neither box is in reach', () => {
  assert.equal(mp4FastStart(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0])), null);
  assert.equal(mp4FastStart(boxes(['ftyp', 24], ['uuid', 900_000]).subarray(0, 64)), null);
  assert.equal(mp4FastStart(new Uint8Array(0)), null);
});

test('mp4FastStart: the test clip (tests/visual/fixtures/hero-clip.mp4) is saved for fast start', async () => {
  const { readFile } = await import('node:fs/promises');
  const file = await readFile(
    new URL('../../tests/visual/fixtures/hero-clip.mp4', import.meta.url),
  );
  assert.equal(mp4FastStart(new Uint8Array(file).subarray(0, FAST_START_PROBE_BYTES)), true);
  assert.ok(file.byteLength < HERO_PHONE_VIDEO_BUDGET / 10, `${file.byteLength} bytes`);
});

test('checkFastStart asks for the first 64 KB and never warns on a failed request', async () => {
  let range = '';
  const ok = (async (_url: string, init?: RequestInit) => {
    range = new Headers(init?.headers).get('Range') ?? '';
    return new Response(new Blob([boxes(['ftyp', 24], ['mdat', 16]) as Uint8Array<ArrayBuffer>]), {
      status: 206,
    });
  }) as typeof fetch;
  assert.equal(await checkFastStart('https://cdn.sanity.io/x.mp4', ok), false);
  assert.equal(range, `bytes=0-${FAST_START_PROBE_BYTES - 1}`);
  const notFound = (async () => new Response('', { status: 404 })) as typeof fetch;
  assert.equal(await checkFastStart('https://cdn.sanity.io/x.mp4', notFound), null);
  const offline = (async () => {
    throw new TypeError('network');
  }) as typeof fetch;
  assert.equal(await checkFastStart('https://cdn.sanity.io/x.mp4', offline), null);
});
