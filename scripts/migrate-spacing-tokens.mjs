// One-off: migrate spacing utility classes from the colliding -xl/-2xl
// suffixes to -section-md/-section-lg, while leaving max-w-* alone (those
// reference Tailwind's container scale and are now restored to correct
// behavior because --spacing-xl/2xl no longer shadow them).
//
// Run: node scripts/migrate-spacing-tokens.mjs

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'src');

// Spacing-utility prefixes that read from the --spacing-* namespace.
// max-w / min-w / w / max-h etc. are intentionally excluded — they read
// from --container-* (or --spacing-* via a different resolution that we
// want to keep). Only the pure margin/padding/gap/inset family is renamed.
const PREFIXES = [
  'p',  'px', 'py', 'pt', 'pb', 'pl', 'pr',
  'm',  'mx', 'my', 'mt', 'mb', 'ml', 'mr',
  'gap', 'gap-x', 'gap-y',
  'space-x', 'space-y',
  'top', 'bottom', 'left', 'right', 'inset',
  'size',
];

// Build the regex. Match optional leading `-` for negative margins, then a
// prefix from the list, then `-xl` or `-2xl` as a word boundary.
const prefixGroup = PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const re = new RegExp(`(^|[\\s"'\`{(\\[])(-?)(${prefixGroup})-(2xl|xl)\\b`, 'g');

const MAP = { '2xl': 'section-lg', xl: 'section-md' };

const targets = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (['.astro', '.tsx', '.ts', '.js', '.mjs', '.jsx'].includes(extname(name))) {
      targets.push(full);
    }
  }
}
walk(SRC);

let totalReplacements = 0;
const affected = [];

for (const file of targets) {
  const original = readFileSync(file, 'utf-8');
  let replacements = 0;
  const updated = original.replace(re, (m, lead, neg, prefix, suffix) => {
    replacements++;
    return `${lead}${neg}${prefix}-${MAP[suffix]}`;
  });
  if (replacements > 0) {
    writeFileSync(file, updated, 'utf-8');
    affected.push({ file: file.replace(SRC, 'src'), count: replacements });
    totalReplacements += replacements;
  }
}

console.log(`\n[migrate-spacing-tokens] ${totalReplacements} replacements across ${affected.length} files:\n`);
for (const { file, count } of affected) {
  console.log(`  ${file.padEnd(50)} ${count}`);
}
console.log('\n[done]');
