// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
//
// Prints the Worker name from wrangler.jsonc.
//
// Used by .github/workflows/deploy-staging.yml so the staging Worker name is
// DERIVED rather than hardcoded. That line read
// `--name ncs-astro-sanity-starter-staging` until 2026-09-08, which meant the
// first fork to set its Cloudflare secrets and push a staging branch would have
// deployed its own site under the STARTER'S name. A fork has no way to notice
// that until it fires.
//
// wrangler.jsonc is JSONC: comments AND trailing commas, so JSON.parse needs
// both stripped. The comment strip requires whitespace or a line start before
// the slashes, so a "https://..." inside a string survives it.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8');

const json = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1')
  .replace(/,(\s*[}\]])/g, '$1');

let name;
try {
  name = JSON.parse(json).name;
} catch (err) {
  console.error('worker-name: could not parse wrangler.jsonc:', err.message);
  process.exit(1);
}

if (!name) {
  console.error('worker-name: wrangler.jsonc has no top-level "name".');
  process.exit(1);
}

process.stdout.write(String(name));
