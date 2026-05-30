// One-off sweep: swap text-secondary → text-foreground/65 in eyebrow-typography
// contexts so eyebrow labels clear WCAG AA contrast (4.5:1) on Cream and
// Linen surfaces. Warm Taupe is too light for body-size text; foreground at
// 65% lands at ~4.77:1 in light and ~6.5:1 in dark — passes both modes.
//
// Only matches strings that combine an uppercase-tracking utility with
// text-secondary, so decorative uses of text-secondary (borders, dividers,
// large display ornaments) are untouched.
//
// Idempotent: re-running matches nothing on the second pass.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcRoot = resolve(root, 'src');

// Recursive walk of src/, collecting only files we want to scan.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(astro|tsx|ts|jsx|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(srcRoot);

const REPLACEMENTS = [
  // tracking-eyebrow (our canonical eyebrow utility)
  { from: /tracking-eyebrow text-secondary/g,         to: 'tracking-eyebrow text-foreground/65' },
  // tracking-widest (used in older patterns + sidebar/footer captions)
  { from: /tracking-widest text-secondary/g,          to: 'tracking-widest text-foreground/65' },
  // arbitrary tracking like tracking-[0.22em]
  { from: /tracking-\[0\.22em\] text-secondary/g,     to: 'tracking-[0.22em] text-foreground/65' },
  { from: /tracking-\[0\.18em\] text-secondary/g,     to: 'tracking-[0.18em] text-foreground/65' },
  { from: /tracking-\[0\.2em\] text-secondary/g,      to: 'tracking-[0.2em] text-foreground/65' },
];

let totalChanges = 0;
const touched = [];

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  let next = src;
  let fileChanges = 0;
  for (const r of REPLACEMENTS) {
    const before = next;
    next = next.replace(r.from, r.to);
    if (before !== next) {
      const matches = before.match(r.from);
      fileChanges += matches ? matches.length : 0;
    }
  }
  if (next !== src) {
    totalChanges += fileChanges;
    writeFileSync(file, next, 'utf8');
    touched.push({ file: file.replace(root + '\\', '').replace(root + '/', ''), changes: fileChanges });
  }
}

console.log(`Swept ${totalChanges} eyebrow text-secondary → text-foreground/65 across ${touched.length} files:`);
for (const t of touched) {
  console.log(`  ${t.file}  (${t.changes})`);
}
