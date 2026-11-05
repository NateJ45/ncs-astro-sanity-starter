// Card 215: scripts/finish-share-cards.mjs, run for real on a small fake build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../finish-share-cards.mjs');
const site = 'https://site.test';

function page(image, url = `${site}/`) {
  const og = image ? `<meta property="og:image" content="${image}">` : '';
  return `<html><head><meta property="og:url" content="${url}">${og}</head></html>`;
}

function fakeBuild(files) {
  const dist = mkdtempSync(join(tmpdir(), 'share-cards-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), body);
  }
  return dist;
}

function run(dist) {
  const result = spawnSync(process.execPath, [script, dist], { encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}

/** A flat-colour card with a filter-free, level-0 encoding: lots to save, no pixels to lose. */
const bloatedPng = () =>
  sharp({ create: { width: 300, height: 158, channels: 3, background: '#586577' } })
    .png({ compressionLevel: 0, adaptiveFiltering: false })
    .toBuffer();

test('shrinks a PNG card without changing a pixel', async () => {
  const before = await bloatedPng();
  const dist = fakeBuild({ 'og/home.png': before, 'og-default.png': before });
  try {
    const { status } = run(dist);
    assert.equal(status, 0);
    for (const card of ['og/home.png', 'og-default.png']) {
      const after = readFileSync(join(dist, card));
      assert.ok(after.length < before.length, `${card} did not get smaller`);
      assert.deepEqual(
        await sharp(after).raw().toBuffer(),
        await sharp(before).raw().toBuffer(),
        `${card} pixels changed`,
      );
    }
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('leaves a JPEG card byte for byte', () => {
  const jpeg = Buffer.from('not really a jpeg, and nothing should try to read it');
  const dist = fakeBuild({ 'og/home.jpg': jpeg });
  try {
    assert.equal(run(dist).status, 0);
    assert.deepEqual(readFileSync(join(dist, 'og/home.jpg')), jpeg);
    assert.equal(statSync(join(dist, 'og/home.jpg')).size, jpeg.length);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('warns about a missing picture, a missing file and a big file, and still exits 0', () => {
  const dist = fakeBuild({
    'none/index.html': page(''),
    'gone/index.html': page(`${site}/og/gone.jpg`),
    'big/index.html': page(`${site}/og/big.jpg?v=abc`),
    'og/big.jpg': Buffer.alloc(601 * 1024),
  });
  try {
    const { status, output } = run(dist);
    assert.equal(status, 0);
    assert.match(output, /none\/index\.html: no og:image/);
    assert.match(output, /gone\/index\.html: .*gone\.jpg is not in the build/);
    assert.match(output, /big\/index\.html: .*big\.jpg\?v=abc is 601 KB/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('says all is well, skipping redirects, Studio plumbing and pictures on other hosts', () => {
  const dist = fakeBuild({
    'index.html': page(`${site}/og-default.png`),
    'og-default.png': Buffer.alloc(10),
    'cdn/index.html': page('https://cdn.sanity.io/images/x/y.jpg'),
    'old/index.html': '<meta http-equiv="refresh" content="0;url=/">',
    'studio/index.html': page(`${site}/og-default.png`, `${site}/studio/`),
    'studio/offline/index.html': '<html></html>',
  });
  try {
    const { status, output } = run(dist);
    assert.equal(status, 0);
    assert.match(output, /every page has a share picture under 600 KB/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a Studio page with no share tags is reported', () => {
  const dist = fakeBuild({ 'studio/index.html': page('', `${site}/studio/`) });
  try {
    assert.match(run(dist).output, /studio\/index\.html: no og:image/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
