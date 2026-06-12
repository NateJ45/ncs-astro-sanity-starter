// Foundation, edit with care
// Shared OG renderer. Used by generate-og-default.mjs (single PNG) and
// generate-og-pages.mjs (one PNG per page singleton). Uses sharp's native
// text rendering (Pango) so we don't depend on opentype.js or satori.
//
// Pango falls back to a system serif if Libre Baskerville isn't installed
// on the build machine. Close enough for a social-preview thumbnail; the
// brand wordmark + colors carry the recognition.

import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

const DEFAULTS = {
  width: 1200,
  height: 630,
  bg: '#FBFBFA',          // Paper
  primary: '#586577',     // Slate
  primaryDark: '#434E5C', // Slate Dark
  accent: '#2A2D31',      // Ink
  taupe: '#AAB0B8',       // Cool Gray
  fontDisplay: 'Libre Baskerville, Georgia, Cambria, Times New Roman, serif',
};

async function renderText(text, fontSize, color, font, weight = 'normal') {
  const escaped = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const markup = `<span foreground="${color}" font_desc="${font} ${weight} ${fontSize}px">${escaped}</span>`;
  const { data, info } = await sharp({
    text: { text: markup, rgba: true, dpi: 72 },
  }).png().toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

// Wraps a string to roughly N characters per line by splitting on word boundaries.
// Used to break long page headlines into two lines without measuring widths.
function wrapToLines(text, maxCharsPerLine = 28) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Render an OG image PNG.
 *
 * @param {object} opts
 * @param {string} opts.wordmark - top-line brand text (e.g., "Studio Starter")
 * @param {string|string[]} opts.tagline - subtitle. String gets wrapped to ~28 chars/line.
 * @param {string} opts.outPath - absolute path to write the PNG to
 * @param {Partial<typeof DEFAULTS>} [opts.theme] - color overrides
 */
export async function renderOg({ wordmark, tagline, outPath, theme = {} }) {
  const t = { ...DEFAULTS, ...theme };
  const lines = Array.isArray(tagline) ? tagline : wrapToLines(tagline, 28);
  const taglineLines = lines.slice(0, 3); // never more than 3 lines

  const wordmarkImg = await renderText(wordmark, 96, t.primaryDark, t.fontDisplay, '500');
  const lineImgs = await Promise.all(
    taglineLines.map((line) => renderText(line, 32, t.accent, t.fontDisplay)),
  );

  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}">
    <rect width="${t.width}" height="${t.height}" fill="${t.bg}"/>
    <rect x="40" y="40" width="${t.width - 80}" height="${t.height - 80}" fill="none" stroke="${t.taupe}" stroke-width="2" opacity="0.5"/>
    <rect x="${(t.width - 120) / 2}" y="330" width="120" height="2" fill="${t.primary}"/>
  </svg>`;

  const wordmarkTop = 200;
  const firstTaglineTop = 360;
  const lineHeight = 44;

  const composites = [
    {
      input: wordmarkImg.buffer,
      left: Math.round((t.width - wordmarkImg.width) / 2),
      top: wordmarkTop,
    },
    ...lineImgs.map((img, i) => ({
      input: img.buffer,
      left: Math.round((t.width - img.width) / 2),
      top: firstTaglineTop + i * lineHeight,
    })),
  ];

  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });

  await sharp(Buffer.from(baseSvg))
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return { width: t.width, height: t.height, outPath };
}
