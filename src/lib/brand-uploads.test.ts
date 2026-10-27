// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetDims, checkIcon, checkLogo } from './brand-uploads.ts';

const img = (ref: string) => ({ asset: { _ref: ref } });

test('reads the size and type out of an asset id', () => {
  assert.deepEqual(assetDims('image-abc123-1200x400-png'), {
    width: 1200,
    height: 400,
    ext: 'png',
  });
  assert.equal(assetDims('file-abc-pdf'), null);
  assert.equal(assetDims(undefined), null);
});

test('logo: empty and SVG pass, small is refused, mid-size and square-ish warn', () => {
  assert.deepEqual(checkLogo(undefined), {});
  assert.deepEqual(checkLogo(img('image-a-60x20-svg')), {});
  assert.match(checkLogo(img('image-a-300x100-png')).error ?? '', /blurry/);
  assert.match(checkLogo(img('image-a-480x120-png')).warning ?? '', /sharper/);
  assert.match(checkLogo(img('image-a-800x800-png')).warning ?? '', /Square icon/);
  assert.deepEqual(checkLogo(img('image-a-1400x300-png')), {});
});

test('icon: must be square and at least 512, SVG any size', () => {
  assert.deepEqual(checkIcon(undefined), {});
  assert.match(checkIcon(img('image-a-800x600-png')).error ?? '', /square/);
  assert.match(checkIcon(img('image-a-256x256-png')).error ?? '', /at least 512/);
  assert.deepEqual(checkIcon(img('image-a-1024x1024-png')), {});
  assert.deepEqual(checkIcon(img('image-a-1024x1010-png')), {}, 'a pixel or two of trim is fine');
  assert.deepEqual(checkIcon(img('image-a-64x64-svg')), {});
  assert.match(checkIcon(img('image-a-64x40-svg')).error ?? '', /square/);
});
