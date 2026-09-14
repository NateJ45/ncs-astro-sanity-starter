// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
// =============================================================================
// scaffold: take the capabilities a project does not need out of the starter
// =============================================================================
// THE PROBLEM THIS SOLVES. The starter ships a full design studio's information
// architecture: services, a process, a journal, an FAQ, testimonials,
// philosophy points, an about page built from founder/values/story fields. A
// race site needs none of it. A church needs none of it. Removing one
// capability by hand means finding it in about twenty-five files, of which
// roughly a dozen are generic registries that must all agree: the schema index,
// the desk structure, the preview resolver and its two sibling path maps, the
// URL helper, the nav link options, the page-builder config, the seed script,
// the default sections, the llms.txt generator and the test route list. Miss
// one and the failure is a runtime error in the Studio, which passes the build.
//
// Nobody should do that by reading. So every registration site is MARKED in the
// source, and this removes them together.
//
//     node scripts/scaffold.mjs --list                 what is removable
//     node scripts/scaffold.mjs --remove journal       show what would go
//     node scripts/scaffold.mjs --remove journal --write   actually do it
//
// DRY BY DEFAULT. This deletes source files; it prints the plan and changes
// nothing unless you pass --write.
//
// -----------------------------------------------------------------------------
// THE THREE MARKERS
// -----------------------------------------------------------------------------
// They are comments, so they work in .ts, .tsx, .astro and .mjs alike, and they
// are greppable, which is the point: `grep -rn "scaffold:journal" src` answers
// "what makes the journal work" better than any document could.
//
//   1. WHOLE FILE. Anywhere in the first 8 lines:
//          // scaffold-file: journal
//      The file is deleted. Use it for schema types, routes and components that
//      exist only for that capability.
//
//   2. ONE LINE. A trailing comment:
//          journalPage,  // scaffold: journal
//      That line is removed. Use it for entries in an array, a map or an import
//      list.
//
//   3. A BLOCK. On its own line, closed by `scaffold:end`:
//          // scaffold: journal
//          case 'journalEntry':
//            return `/journal/${slug}`;
//          // scaffold:end
//      Everything between them, inclusive, is removed.
//
// A capability name is a bare word: journal, services, process, faq, about.
//
// IN AN ASTRO TEMPLATE, USE `{/* scaffold: journal */}`. Below the frontmatter
// fence a `//` is not a comment, it is TEXT, and it renders. Marking a footer
// nav link that way printed "// scaffold: process" into the page between two
// list items; `npm run parity compare` caught it, which is exactly the job that
// gate exists for. Inside a JSX expression (`{cond ? (...) : (...)}`) the `//`
// form is fine, because that region really is JavaScript.
//
// -----------------------------------------------------------------------------
// WHAT IT DELIBERATELY DOES NOT DO
// -----------------------------------------------------------------------------
// - It does not touch the Sanity DATASET. Documents of a removed type stay in
//   the project until someone deletes them, and the Studio will show them as
//   having an unknown type. That is on purpose: this script must never be able
//   to destroy content, and "Remove field" in the Studio is already the most
//   dangerous button in this stack (CLAUDE.md rule 1).
// - It does not run typegen or the build. It prints what to run next.
// - It does not reformat. Everything it writes is line-exact, so the diff is
//   only the lines that carried a marker.
// =============================================================================

import { readdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Where a capability can be registered. Everything else in the repo is either
// generated, vendored or irrelevant, and walking it would only find matches
// inside this file's own documentation.
const SEARCH_ROOTS = ['src', 'scripts', 'tests', 'modules'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git', '.parity']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.astro', '.mjs', '.js', '.json', '.css', '.md']);

// This file documents the markers, so it must never be treated as carrying one.
const SELF = resolve(__dirname, 'scaffold.mjs');

const FILE_MARKER = /scaffold-file:\s*([a-z0-9-]+)/i;
const LINE_OR_BLOCK = /scaffold:\s*([a-z0-9-]+)/i;
const BLOCK_END = /scaffold:\s*end\b/i;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.github') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (EXTENSIONS.has(e.name.slice(e.name.lastIndexOf('.')))) {
      out.push(full);
    }
  }
  return out;
}

const files = SEARCH_ROOTS.flatMap((d) => walk(resolve(root, d))).filter((f) => f !== SELF);

/**
 * Plan the removal of one capability.
 *
 * Returns { deleteFiles: string[], edits: Map<file, {lines: number[], kept: string[]}> }
 * with every line number 1-based, so the report can name them.
 */
function plan(capability) {
  const deleteFiles = [];
  const edits = new Map();

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');

    // 1. Whole-file marker, near the top.
    const head = lines.slice(0, 8).join('\n');
    const fm = FILE_MARKER.exec(head);
    if (fm && fm[1].toLowerCase() === capability) {
      deleteFiles.push(file);
      continue;
    }

    // 2 and 3. Line and block markers.
    const drop = [];
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (inBlock) {
        drop.push(i);
        if (BLOCK_END.test(line)) inBlock = false;
        continue;
      }
      if (FILE_MARKER.test(line)) continue; // another capability's file marker
      const m = LINE_OR_BLOCK.exec(line);
      if (!m || m[1].toLowerCase() !== capability) continue;
      // A marker alone on its line opens a block; a trailing one takes the line.
      const isOwnLine = /^\s*(\/\/|\/\*|\{\s*\/\*|<!--|#)/.test(line);
      drop.push(i);
      if (isOwnLine) inBlock = true;
    }
    if (inBlock) {
      throw new Error(`${relative(root, file)}: "scaffold: ${capability}" block is never closed`);
    }
    if (drop.length) {
      const dropSet = new Set(drop);
      edits.set(file, {
        lines: drop.map((i) => i + 1),
        kept: lines.filter((_, i) => !dropSet.has(i)),
      });
    }
  }
  return { deleteFiles, edits };
}

/** Every capability the repo currently knows how to remove. */
function listCapabilities() {
  const found = new Map();
  const note = (name, file) => {
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(relative(root, file));
  };
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const fm = i < 8 ? FILE_MARKER.exec(lines[i]) : null;
      if (fm) {
        note(fm[1].toLowerCase(), file);
        continue;
      }
      if (BLOCK_END.test(lines[i])) continue;
      const m = LINE_OR_BLOCK.exec(lines[i]);
      if (m) note(m[1].toLowerCase(), file);
    }
  }
  return found;
}

// ---- CLI --------------------------------------------------------------------

const argv = process.argv.slice(2);
const write = argv.includes('--write');
const wantList = argv.includes('--list') || argv.length === 0;
const removeArg = (() => {
  const i = argv.indexOf('--remove');
  if (i === -1) return null;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
})();

if (wantList && !removeArg) {
  const caps = listCapabilities();
  if (caps.size === 0) {
    console.log('No removable capabilities are marked in this repo.');
    process.exit(0);
  }
  console.log('Removable capabilities:\n');
  for (const [name, fileSet] of [...caps].sort()) {
    console.log(`  ${name.padEnd(14)} ${fileSet.size} file(s)`);
  }
  console.log('\n  node scripts/scaffold.mjs --remove <name>          show the plan');
  console.log('  node scripts/scaffold.mjs --remove <name> --write  apply it');
  process.exit(0);
}

if (!removeArg) {
  console.error('Usage: node scripts/scaffold.mjs --remove <name>[,<name>] [--write]');
  process.exit(1);
}

const wanted = removeArg
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const known = listCapabilities();
const unknown = wanted.filter((w) => !known.has(w));
if (unknown.length) {
  console.error(`Unknown capability: ${unknown.join(', ')}`);
  console.error(`Known: ${[...known.keys()].sort().join(', ')}`);
  process.exit(1);
}

let deleted = 0;
let editedFiles = 0;
let editedLines = 0;

for (const capability of wanted) {
  const { deleteFiles, edits } = plan(capability);
  console.log(`\n${capability}\n${'─'.repeat(capability.length)}`);
  for (const f of deleteFiles.sort()) {
    console.log(`  delete  ${relative(root, f)}`);
    if (write) rmSync(f, { force: true });
    deleted++;
  }
  for (const [f, edit] of [...edits].sort()) {
    console.log(`  edit    ${relative(root, f)}  (${edit.lines.length} line(s))`);
    if (write) writeFileSync(f, edit.kept.join('\n'), 'utf8');
    editedFiles++;
    editedLines += edit.lines.length;
  }
  if (deleteFiles.length === 0 && edits.size === 0) console.log('  nothing marked');
}

console.log(
  `\n${write ? 'Removed' : 'Would remove'}: ${deleted} file(s), ${editedLines} line(s) across ${editedFiles} file(s).`,
);

if (!write) {
  console.log('\nNothing was changed. Re-run with --write to apply.');
} else {
  console.log(
    [
      '',
      'Next:',
      '  npm run typegen     the schema changed',
      '  npm run build       proves the Studio still compiles and no route is orphaned',
      '  npm run test:unit',
      '',
      'NOT done for you: documents of the removed types are still in the Sanity',
      'dataset. Delete them in the Studio, or leave them; nothing reads them now.',
    ].join('\n'),
  );
}
