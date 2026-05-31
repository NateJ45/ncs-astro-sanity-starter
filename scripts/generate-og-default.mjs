// Foundation, edit with care
// Generates public/og-default.png — the fallback OG image used when a page
// doesn't have its own /og/<slug>.png yet. Run via `npm run og`.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOg } from './lib/render-og.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const result = await renderOg({
  wordmark: 'Studio Starter',
  tagline: ['Your tagline goes here.'],
  outPath: resolve(root, 'public/og-default.png'),
});

console.log(`OG default written: ${result.outPath} (${result.width}x${result.height})`);
