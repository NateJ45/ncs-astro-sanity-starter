// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// sanity-lib.mjs - shared plumbing for the Sanity seed/patch scripts
// =============================================================================
// WHY THIS EXISTS (ported into the starter 2026-08-27; original 2026-08-25,
// itself distilled from the WCP repo's patch-lib.mjs + pagebuilder-lib.mjs)
//
// Gives every seed/patch script the same three things so they stop re-inlining
// them:
//
//   1. A token-authed client built from the root .env.
//   2. A DRY-RUN-BY-DEFAULT apply gate: scripts print exactly what they would
//      change and write nothing unless run with --apply.
//   3. Portable Text builders, _key generation, and an IDEMPOTENT asset
//      uploader (re-runs never re-upload: asset ids cache in
//      scripts/.asset-map.json, which is gitignored).
//
// ENV RECONCILIATION (the 2026-08-27 port decision)
// presacademy's copy carried its own inline .env parser. The starter already
// ships scripts/lib/loadEnv.mjs, so this file uses THAT and the duplicate
// parser is gone. One parser, one set of rules to remember. loadEnv is the
// keeper because it is the stricter of the two: it enforces a KEY shape,
// strips inline `# comments` from bare values, takes quoted values literally,
// and gives process.env precedence over .env. The looser parser silently
// accepted lines like `KEY=value # note` and put the comment IN the token,
// which is the shape of the .env-quoted-token 401 that cost a WCP session.
// Downstream sites porting this file must bring loadEnv.mjs with it (or point
// the import at their own equivalent) - it is the one dependency here beyond
// @sanity/client.
//
// Usage in a script:
//   import { client, APPLY, apply, done, toPT, p, bullet, h2, key, ref,
//            makeUploader, imageValue } from './lib/sanity-lib.mjs';
//   ...
//   await apply(`page-about: set hero title`, () =>
//     client.patch('aboutPage').set({ heroTitle: '...' }).commit());
//   done(count);
// =============================================================================
import { readFileSync, existsSync, writeFileSync, createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..', '..');
const ASSET_MAP_PATH = resolve(__dirname, '..', '.asset-map.json');

// --- env ---------------------------------------------------------------------
// loadEnv merges the root .env under process.env (process.env wins) and does
// not mutate process.env, so importing this file never leaks a token into a
// child process by accident.
const env = loadEnv(ROOT);

export const projectId = env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID;
export const dataset = env.PUBLIC_SANITY_DATASET || env.SANITY_STUDIO_DATASET || 'production';
const token = env.SANITY_API_WRITE_TOKEN || env.SANITY_AUTH_TOKEN;
if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-05-01',
  token,
  useCdn: false,
});

// --- dry-run gate ------------------------------------------------------------
export const APPLY = process.argv.includes('--apply');

/** Log one planned change; run it only under --apply. */
export async function apply(label, fn) {
  console.log(`${APPLY ? 'OK ' : 'DRY'} ${label}`);
  if (APPLY) await fn();
}

/** Print the run summary. Call once at the end with the change count. */
export function done(n) {
  console.log(
    `\n${APPLY ? 'APPLIED' : 'DRY RUN'}: ${n} change(s).` +
      (APPLY ? '' : ' Re-run with --apply to write.'),
  );
}

// --- _key + reference helpers ------------------------------------------------
let n = 0;
/** Monotonic _key generator: every array member in Sanity needs a unique _key. */
export const key = () => `k${n++}`;

export const ref = (id) => ({ _type: 'reference', _ref: id });

// --- Portable Text builders --------------------------------------------------
// Plain text (\n\n paragraph breaks) -> Portable Text blocks.
export const toPT = (text) =>
  String(text || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: key(), text: s, marks: [] }],
    }));

// A single Portable Text block with an explicit style (h2/h3/normal).
export const block = (text, style = 'normal') => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: [{ _type: 'span', _key: key(), text, marks: [] }],
});

// A bullet-list Portable Text block.
export const li = (text) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  level: 1,
  listItem: 'bullet',
  markDefs: [],
  children: [{ _type: 'span', _key: key(), text, marks: [] }],
});

// Inline part markers for p()/bullet(): plain string, strong(), or link().
export const strong = (text) => ({ text, marks: ['strong'] });
export const link = (text, href) => ({ text, href });

const spansOf = (parts, markDefs) =>
  parts.map((part) => {
    if (typeof part === 'string') return { _type: 'span', _key: key(), text: part, marks: [] };
    if (part.href) {
      const k = key();
      markDefs.push({ _type: 'link', _key: k, href: part.href });
      return { _type: 'span', _key: key(), text: part.text, marks: [k] };
    }
    return { _type: 'span', _key: key(), text: part.text, marks: part.marks ?? [] };
  });

/** A normal paragraph block from mixed string/strong()/link() parts. */
export const p = (...parts) => {
  const markDefs = [];
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs,
    children: spansOf(parts, markDefs),
  };
};

/** A bullet-list item block from mixed parts. */
export const bullet = (...parts) => {
  const markDefs = [];
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    level: 1,
    listItem: 'bullet',
    markDefs,
    children: spansOf(parts, markDefs),
  };
};

export const h2 = (text) => block(text, 'h2');
export const h3 = (text) => block(text, 'h3');

// --- Image/file upload (idempotent via a local asset-id cache) ---------------
// Re-runs of a seed never re-upload: the uploaded asset id is remembered per
// repo-relative path in scripts/.asset-map.json (gitignored).
export function makeUploader(uploadClient = client) {
  const map = existsSync(ASSET_MAP_PATH) ? JSON.parse(readFileSync(ASSET_MAP_PATH, 'utf8')) : {};
  const save = () => writeFileSync(ASSET_MAP_PATH, JSON.stringify(map, null, 2));
  return {
    async upload(relPath) {
      if (map[relPath]) return map[relPath];
      const asset = await uploadClient.assets.upload(
        'image',
        createReadStream(resolve(ROOT, relPath)),
        { filename: relPath.split('/').pop() },
      );
      map[relPath] = asset._id;
      save();
      return asset._id;
    },
    async uploadFile(relPath) {
      const cacheKey = `file:${relPath}`;
      if (map[cacheKey]) return map[cacheKey];
      const asset = await uploadClient.assets.upload(
        'file',
        createReadStream(resolve(ROOT, relPath)),
        { filename: relPath.split('/').pop() },
      );
      map[cacheKey] = asset._id;
      save();
      return asset._id;
    },
  };
}

export const imageValue = (assetId) => ({ _type: 'image', asset: ref(assetId) });
export const fileValue = (assetId) => ({ _type: 'file', asset: ref(assetId) });
