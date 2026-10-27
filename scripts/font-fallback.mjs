#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
/**
 * font-fallback.mjs - write metric-matched fallback faces for the display font
 * (PORTS.md card 188, from FBC Auburn's title layout-shift fix, 2026-10-26).
 *
 *   npm run font-fallback            # read brand.config.json, write src/styles/font-fallbacks.css
 *   npm run font-fallback -- --dry   # print the CSS, write nothing
 *   npm run font-fallback -- --file path/to/Font.woff --family "Font Name" --generic serif
 *
 * It reads the display font named in brand/brand.config.json (`fonts.display`:
 * the first family in `familyValue`, the generic family at its end, the
 * @fontsource package in `imports`), opens that package's Latin regular .woff
 * with opentype.js, and writes one @font-face per local stand-in (Georgia and
 * Times for a serif, Arial for a sans) scaled to the web font
 * (scripts/lib/font-fallback.mjs has the maths). Then name the faces SECOND in
 * the display stack, in brand.config.json `fonts.display.familyValue`, and run
 * `npm run apply-brand`:
 *   "\"Libre Baskerville\", \"Libre Baskerville Fallback\", \"Libre Baskerville Fallback Times\", Georgia, serif"
 * A variable @fontsource package ships only woff2, which opentype.js cannot
 * read; pass a .ttf or .woff of the same face with --file.
 * Docs: docs/agent/design-tokens.md, "Metric-matched fallback fonts".
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { fallbackCss, weightedAverageWidth } from './lib/font-fallback.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const dry = args.includes('--dry');

const config = JSON.parse(readFileSync(resolve(root, 'brand/brand.config.json'), 'utf-8'));
const display = config.fonts?.display ?? {};
const stack = String(display.familyValue ?? '')
  .split(',')
  .map((s) => s.trim().replace(/^["']|["']$/g, ''));
const family = flag('--family') ?? stack[0];
const last = stack[stack.length - 1];
const generic =
  flag('--generic') ?? (last === 'sans-serif' || last === 'system-ui' ? 'sans-serif' : 'serif');

/** The Latin regular .woff of the first @fontsource import, or --file. */
function fontFile() {
  const given = flag('--file');
  if (given) return resolve(given);
  const first = (display.imports ?? [])[0];
  if (!first) throw new Error('fonts.display.imports is empty; pass --file');
  const pkg = first.split('/').slice(0, 2).join('/');
  const dir = resolve(root, 'node_modules', pkg, 'files');
  if (!existsSync(dir)) throw new Error(dir + ' not found; run npm ci, or pass --file');
  const files = readdirSync(dir).filter((f) => /-latin-(400|wght)-normal\.woff$/.test(f));
  if (!files.length)
    throw new Error(
      'No Latin regular .woff in ' + dir + ' (a variable package ships woff2 only); pass --file',
    );
  return join(dir, files[0]);
}

const path = fontFile();
const buf = readFileSync(path);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const web = {
  upm: font.unitsPerEm,
  ascent: font.tables.hhea.ascender,
  descent: font.tables.hhea.descender,
  lineGap: font.tables.hhea.lineGap,
  xWidthAvg: weightedAverageWidth((ch) => {
    const g = font.charToGlyph(ch);
    return g && g.index !== 0 ? g.advanceWidth : undefined;
  }, font.tables.os2.xAvgCharWidth),
};

const css = [
  '/* Safe to edit by hand, but WRITTEN BY `npm run font-fallback` (scripts/font-fallback.mjs,',
  '   PORTS.md card 188). Metric-matched stand-ins for ' + family + ' while it loads: a local font',
  '   scaled to its average letter width and given its ascent and descent, so a title drawn in the',
  '   fallback breaks where the real one will and the page does not jump when the font arrives.',
  '   Named second in the display stack (brand.config.json fonts.display.familyValue).',
  '   Source: ' +
    relative(root, path).split('\\').join('/') +
    ' (upm ' +
    web.upm +
    ', hhea ' +
    web.ascent +
    ' / ' +
    web.descent +
    ', weighted width ' +
    web.xWidthAvg +
    '). */',
  fallbackCss(family, generic, web),
  '',
].join('\n');

if (dry) {
  process.stdout.write(css);
} else {
  writeFileSync(resolve(root, 'src/styles/font-fallbacks.css'), css);
  console.log('Wrote src/styles/font-fallbacks.css for ' + family + ' (' + generic + ').');
}
