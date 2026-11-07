// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for video-ranges.ts (PORTS.md card 222).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isVideoPath, parseByteRange, rangedVideo } from './video-ranges.ts';

const file = () =>
  new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), {
    status: 200,
    headers: { 'Content-Type': 'video/mp4', ETag: '"abc"', 'Cache-Control': 'public' },
  });
const request = (headers: Record<string, string> = {}, method = 'GET') =>
  new Request('https://example.test/clip.mp4', { method, headers });

describe('isVideoPath', () => {
  it('matches mp4 and webm only', () => {
    assert.equal(isVideoPath('/guide-videos/a.mp4'), true);
    assert.equal(isVideoPath('/a.WEBM'), true);
    assert.equal(isVideoPath('/a.mp4/'), false);
    assert.equal(isVideoPath('/a.webp'), false);
    assert.equal(isVideoPath('/studio/'), false);
  });
});

describe('parseByteRange', () => {
  it('reads the forms Safari and Chrome send', () => {
    assert.deepEqual(parseByteRange('bytes=0-1', 10), { start: 0, end: 1 });
    assert.deepEqual(parseByteRange('bytes=4-', 10), { start: 4, end: 9 });
    assert.deepEqual(parseByteRange('bytes=-3', 10), { start: 7, end: 9 });
  });
  it('clips an end past the file', () => {
    assert.deepEqual(parseByteRange('bytes=8-500', 10), { start: 8, end: 9 });
    assert.deepEqual(parseByteRange('bytes=-500', 10), { start: 0, end: 9 });
  });
  it('sends the whole file for forms it does not serve', () => {
    assert.equal(parseByteRange(null, 10), 'whole');
    assert.equal(parseByteRange('bytes=-', 10), 'whole');
    assert.equal(parseByteRange('bytes=0-1,3-4', 10), 'whole');
    assert.equal(parseByteRange('items=0-1', 10), 'whole');
  });
  it('refuses a range outside the file', () => {
    assert.equal(parseByteRange('bytes=10-', 10), 'unsatisfiable');
    assert.equal(parseByteRange('bytes=5-2', 10), 'unsatisfiable');
    assert.equal(parseByteRange('bytes=-0', 10), 'unsatisfiable');
  });
});

describe('rangedVideo', () => {
  it('answers a range with a 206, the right bytes and the asset headers', async () => {
    const res = await rangedVideo(request({ Range: 'bytes=2-4' }), file());
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('Content-Range'), 'bytes 2-4/10');
    assert.equal(res.headers.get('Content-Length'), '3');
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
    assert.equal(res.headers.get('Content-Type'), 'video/mp4');
    assert.equal(res.headers.get('Cache-Control'), 'public');
    assert.equal(res.headers.get('ETag'), '"abc"');
    assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [2, 3, 4]);
  });
  it('sends the whole file with Accept-Ranges when no range is asked for', async () => {
    const res = await rangedVideo(request(), file());
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
    assert.equal((await res.arrayBuffer()).byteLength, 10);
  });
  it('answers 416 past the end', async () => {
    const res = await rangedVideo(request({ Range: 'bytes=99-' }), file());
    assert.equal(res.status, 416);
    assert.equal(res.headers.get('Content-Range'), 'bytes */10');
  });
  it('honours If-Range', async () => {
    const same = await rangedVideo(request({ Range: 'bytes=0-1', 'If-Range': '"abc"' }), file());
    assert.equal(same.status, 206);
    const old = await rangedVideo(request({ Range: 'bytes=0-1', 'If-Range': '"old"' }), file());
    assert.equal(old.status, 200);
    assert.equal((await old.arrayBuffer()).byteLength, 10);
  });
  it('does not slice a HEAD request', async () => {
    const res = await rangedVideo(request({ Range: 'bytes=0-1' }, 'HEAD'), file());
    assert.equal(res.status, 200);
  });
  it('passes a 304 through', async () => {
    const res = await rangedVideo(request(), new Response(null, { status: 304 }));
    assert.equal(res.status, 304);
  });
});
