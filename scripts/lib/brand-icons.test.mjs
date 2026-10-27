// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The icon set drawn from a Studio upload (PORTS.md card 168): the ICO layout, the SVG wrapper,
// and every file at the size the manifest and BaseLayout expect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ICON_FILES, MASKABLE_FILE, buildIco, iconSet, svgWrappingPng } from './brand-icons.mjs';

const SQUARE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2a2d31"/><circle cx="32" cy="32" r="20" fill="#fff"/></svg>';

test('buildIco writes the header, one entry per image, then the images', () => {
  const a = Buffer.from([1, 2, 3]);
  const b = Buffer.from([4, 5]);
  const ico = buildIco([
    { size: 16, buffer: a },
    { size: 256, buffer: b },
  ]);
  assert.equal(ico.readUInt16LE(2), 1, 'type 1 is an icon');
  assert.equal(ico.readUInt16LE(4), 2, 'two images');
  assert.equal(ico.readUInt8(6), 16, 'first entry width');
  assert.equal(ico.readUInt8(6 + 16), 0, '256 is written as 0');
  assert.equal(ico.readUInt32LE(6 + 12), 6 + 32, 'first image starts after the directory');
  assert.equal(ico.length, 6 + 32 + 5);
});

test('svgWrappingPng embeds the PNG at the given size', () => {
  const svg = svgWrappingPng(Buffer.from('png'), 128);
  assert.match(svg, /viewBox="0 0 128 128"/);
  assert.match(svg, /data:image\/png;base64,cG5n/);
});

test('iconSet draws every file at its size, from an SVG and from a raster', async () => {
  const png = await sharp(Buffer.from(SQUARE_SVG), { density: 300 })
    .resize(600, 600)
    .png()
    .toBuffer();
  for (const [bytes, mime] of [
    [Buffer.from(SQUARE_SVG), 'image/svg+xml'],
    [png, 'image/png'],
  ]) {
    const files = await iconSet(bytes, mime, { plate: '#ffffff' });
    assert.deepEqual(
      Object.keys(files).sort(),
      ['favicon.ico', 'favicon.svg', MASKABLE_FILE, ...ICON_FILES.map(([n]) => n)].sort(),
    );
    for (const [name, size] of [...ICON_FILES, [MASKABLE_FILE, 512]]) {
      const meta = await sharp(files[name]).metadata();
      assert.equal(meta.width, size, `${name} width (${mime})`);
      assert.equal(meta.height, size, `${name} height (${mime})`);
    }
    assert.equal(files['favicon.ico'].readUInt16LE(4), 3, 'favicon.ico holds 16, 32 and 48');
    const svg = files['favicon.svg'].toString('utf8');
    if (mime === 'image/svg+xml') assert.equal(svg, SQUARE_SVG, 'an SVG upload is used as is');
    else assert.match(svg, /<image /, 'a raster upload is wrapped in an SVG');
  }
});
