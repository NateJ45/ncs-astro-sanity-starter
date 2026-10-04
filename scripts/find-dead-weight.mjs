#!/usr/bin/env node
// find-dead-weight.mjs - list installed packages and component files that nothing uses
// =============================================================================
// WHY THIS EXISTS (PORTS.md card 88)
//
// Tailwind 4 scans every file under src/ for class names and inlines the CSS for each
// one it finds, whether or not the component that holds the class is ever imported.
// nixoncreativestudio carried an unused UI kit (Starwind, PrimeReact and 15 shadcn,
// Aceternity and Magic UI primitives) and went from 137 KB to 100 KB of inline CSS on
// the home page after deleting it (commit b93e381). Unused packages cost install time
// and bundle size too. This finds the candidates; a person decides.
//
// USAGE (from a site repo root; read-only, writes nothing)
//   node scripts/find-dead-weight.mjs [repo-root]
//
// Output: (1) dependencies whose name appears nowhere outside package.json and the
// lockfile, (2) files under src/components that no other file under src/ (or the
// config files) mentions by name, (3) the `@source not` lines in src/styles/globals.css.
// CANDIDATES ONLY: a package used by a CLI (typescript, prettier, wrangler) or by a
// string config shows up in (1) and is fine; a component loaded by a computed name
// shows up in (2). Check each before deleting. Exit code is always 0.
// =============================================================================
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, basename, extname, dirname } from 'node:path';

const root = resolve(process.argv[2] || '.');
const SKIP = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  '.wrangler',
  '_worktrees',
  '.claude',
]);
const TEXT = /\.(astro|tsx?|jsx?|mjs|cjs|mts|cts|css|json|jsonc|md|mdx|ya?ml|html|toml)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

const read = (p) => readFileSync(p, 'utf8');
const pkgPath = join(root, 'package.json');
if (!existsSync(pkgPath)) {
  console.error(`No package.json in ${root}`);
  process.exit(0);
}
const pkg = JSON.parse(read(pkgPath));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

// Everything that could name a package, except package.json itself and the lockfile.
const everything = walk(root).filter((f) => basename(f) !== 'package-lock.json' && f !== pkgPath);
const blob = everything.map(read).join('\n') + '\n' + JSON.stringify(pkg.scripts || {});
const unusedDeps = deps.filter((d) => !blob.includes(d));

console.log(
  `# ${basename(root)}: ${deps.length} dependencies, ${unusedDeps.length} never named outside package.json`,
);
for (const d of unusedDeps) console.log(`  dep   ${d}`);

// Component files nothing mentions by name.
const srcFiles = walk(join(root, 'src'));
const configFiles = ['astro.config.mjs', 'astro.config.ts', 'sanity.config.ts', 'sanity.cli.ts']
  .map((f) => join(root, f))
  .filter(existsSync);
const mentionText = [...srcFiles, ...configFiles].map((f) => [f, read(f)]);
const compDir = join(root, 'src', 'components');
const unusedFiles = [];
for (const f of walk(compDir)) {
  if (!/\.(astro|tsx|jsx|ts)$/.test(f) || /\.(test|spec)\./.test(f)) continue;
  let name = basename(f, extname(f));
  if (name === 'index') name = basename(dirname(f));
  const used = mentionText.some(([other, text]) => other !== f && text.includes(name));
  if (!used) unusedFiles.push(f.slice(root.length + 1).replaceAll('\\', '/'));
}
console.log(`# ${unusedFiles.length} files under src/components that no other src file names`);
for (const f of unusedFiles) console.log(`  file  ${f}`);

const css = join(root, 'src', 'styles', 'globals.css');
const sourceLines = existsSync(css)
  ? read(css)
      .split(/\r?\n/)
      .filter((l) => l.includes('@source'))
  : [];
console.log(`# globals.css @source lines: ${sourceLines.length}`);
for (const l of sourceLines) console.log(`  css   ${l.trim()}`);
