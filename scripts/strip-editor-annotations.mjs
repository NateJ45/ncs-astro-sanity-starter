// Find + strip editor/audit meta annotations from Sanity content. These are
// bracketed prefixes/inlines that snuck in via AI-assisted drafting and were
// never meant to ship — things like "[NEW per audit, softer framing] …" or
// "[NEW] …" leading a paragraph.
//
// Behavior:
//   - Walks every document in the production dataset (all types).
//   - Recursively scans every string field, including nested Portable Text
//     block spans, for annotation patterns.
//   - Default mode: DRY RUN (prints what it would change). Pass --apply to
//     actually patch documents.
//
// Annotation patterns matched (conservative — designed to avoid false
// positives on legitimate bracketed prose):
//   [NEW …]                      e.g. "[NEW] ", "[NEW per audit, …]"
//   [per audit …]                e.g. "[per audit] ", "[per audit notes]"
//   [TODO …]
//   [DRAFT …]
//   [WIP …]
//   [v2 …] / [v3 …]
//   [softer framing]             standalone — agent-style tag
//   [audit: …]
//   [note: …] / [NOTE: …]
//
// Run with:
//   node scripts/strip-editor-annotations.mjs           (dry run, default)
//   node scripts/strip-editor-annotations.mjs --apply   (patches Sanity)

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const APPLY = process.argv.includes('--apply');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const readToken = (process.env.SANITY_API_READ_TOKEN ?? '').trim();
const writeToken = (process.env.SANITY_API_WRITE_TOKEN ?? '').trim();

if (!projectId || !readToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}
if (APPLY && !writeToken) {
  console.error('--apply requires SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const readClient = createClient({
  projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token: readToken,
});
const writeClient = APPLY
  ? createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token: writeToken })
  : null;

// Regex matches the annotation forms we want to strip. \[ … \] with a known
// keyword inside. Case-insensitive on the keyword. Captures the entire bracket
// expression so we can remove it cleanly along with any surrounding whitespace.
const ANNOTATION_RE = new RegExp(
  '\\[\\s*' +
    '(?:' +
      'NEW(?:[^\\]]*)|' +
      'per\\s+audit(?:[^\\]]*)|' +
      'TODO(?:[^\\]]*)|' +
      'DRAFT(?:[^\\]]*)|' +
      'WIP(?:[^\\]]*)|' +
      'v\\d+(?:[^\\]]*)|' +
      'softer\\s+framing|' +
      'audit:\\s*[^\\]]*|' +
      'note:\\s*[^\\]]*' +
    ')' +
    '\\s*\\]',
  'gi',
);

// Strip the annotation + collapse any double spaces left behind. Trim only
// leading whitespace produced by the strip so paragraph breaks survive.
function stripAnnotations(s) {
  if (typeof s !== 'string') return { value: s, changed: false, matches: [] };
  const matches = [...s.matchAll(ANNOTATION_RE)].map((m) => m[0]);
  if (matches.length === 0) return { value: s, changed: false, matches: [] };
  let cleaned = s.replace(ANNOTATION_RE, '');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' '); // collapse runs of spaces
  cleaned = cleaned.replace(/^[ \t]+/gm, (m, offset, str) =>
    // preserve leading whitespace on the very first character only if it was
    // intentional (block-indented Portable Text fragments). Otherwise trim.
    offset === 0 ? '' : m,
  );
  return { value: cleaned, changed: cleaned !== s, matches };
}

// Recursively walks any plain JSON value, applying the visitor to every
// string it finds. The visitor returns a new string (or the original) and a
// changed flag; this function bubbles up whether anything changed.
function walk(node, path, onChange) {
  if (typeof node === 'string') {
    const { value, changed, matches } = stripAnnotations(node);
    if (changed) onChange(path, value, matches);
    return value;
  }
  if (Array.isArray(node)) {
    return node.map((item, i) => walk(item, [...path, String(i)], onChange));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      // Skip Sanity internals — they're never editor text.
      if (k.startsWith('_') && k !== '_key') {
        out[k] = v;
        continue;
      }
      out[k] = walk(v, [...path, k], onChange);
    }
    return out;
  }
  return node;
}

// ---------- Main ----------

console.log(APPLY ? 'APPLY mode — will patch Sanity\n' : 'DRY RUN — no changes will be written. Pass --apply to patch.\n');

// Pull every published document. Drafts can also carry annotations; we patch
// both. Excluding sanity.imageAsset (binary metadata) so we don't waste cycles
// walking thousands of asset docs.
const docs = await readClient.fetch(`*[!(_type in ["sanity.imageAsset", "sanity.fileAsset"])]`);
console.log(`Scanning ${docs.length} documents...\n`);

let docsWithFindings = 0;
let totalAnnotations = 0;
let patchesAttempted = 0;
let patchesSucceeded = 0;
let patchesFailed = 0;

for (const doc of docs) {
  const findings = [];
  const onChange = (path, _newValue, matches) => {
    matches.forEach((m) => findings.push({ path: path.join('.'), match: m }));
  };
  const cleaned = walk(doc, [], onChange);

  if (findings.length === 0) continue;

  docsWithFindings++;
  totalAnnotations += findings.length;
  console.log(`• ${doc._type}/${doc._id}`);
  for (const f of findings) {
    console.log(`    ${f.path}: ${f.match}`);
  }

  if (APPLY && writeClient) {
    // Diff each top-level field and patch only the ones that changed, to
    // avoid clobbering anything we didn't intend to touch.
    const changedFields = {};
    for (const [k, v] of Object.entries(cleaned)) {
      if (k.startsWith('_')) continue;
      if (JSON.stringify(v) !== JSON.stringify(doc[k])) {
        changedFields[k] = v;
      }
    }
    if (Object.keys(changedFields).length > 0) {
      patchesAttempted++;
      try {
        await writeClient.patch(doc._id).set(changedFields).commit();
        patchesSucceeded++;
        console.log(`    ✓ patched (${Object.keys(changedFields).length} fields)`);
      } catch (err) {
        patchesFailed++;
        console.log(`    ✗ patch failed: ${err.message}`);
      }
    }
  }
  console.log();
}

console.log(`\nSummary:`);
console.log(`  Documents with annotations: ${docsWithFindings}`);
console.log(`  Total annotation matches:   ${totalAnnotations}`);
if (APPLY) {
  console.log(`  Patches attempted:          ${patchesAttempted}`);
  console.log(`  Patches succeeded:          ${patchesSucceeded}`);
  if (patchesFailed > 0) {
    console.log(`  Patches FAILED:             ${patchesFailed}`);
  }
} else {
  console.log(`\nRun again with --apply to patch Sanity.`);
}
