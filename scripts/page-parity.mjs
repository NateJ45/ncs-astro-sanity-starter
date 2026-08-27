#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
/**
 * page-parity.mjs - rendered-HTML parity harness.
 *
 * WHY THIS EXISTS (ported into the starter 2026-08-27; original 2026-08-26)
 * A page-builder conversion moves markup out of bespoke singleton pages and
 * into CMS-driven section types. The whole promise is "same pixels". This
 * script is the machine that holds you to it: capture each page's rendered
 * HTML BEFORE a page converts, then diff the post-conversion render against
 * that snapshot. Zero diff, or the conversion is not done.
 *
 * It is useful well beyond a conversion: it is a cheap regression net for any
 * refactor that is supposed to be render-neutral (extracting a component,
 * reordering imports, swapping a wrapper, upgrading a dependency).
 *
 * NEITHER MODE RUNS THE BUILD. Both read an existing build output. The caller
 * builds. That keeps the script fast to re-run, keeps build noise out of the
 * diff output, and means "capture" and "compare" can be pointed at the exact
 * same build artifacts when you are debugging the normalizer itself.
 *
 *   # from PowerShell, in the repo root
 *   npm run build                        # you build
 *   node scripts/page-parity.mjs capture     # snapshot every built page
 *   ...refactor...
 *   npm run build                        # you build again
 *   node scripts/page-parity.mjs compare     # PASS/DIFF per page, exit 1 on any diff
 *   node scripts/page-parity.mjs compare about   # limit to one page
 *   node scripts/page-parity.mjs list         # show the routes it would snapshot
 *
 * WHERE IT READS THE BUILT HTML (the 2026-08-27 parameterization)
 * Astro's Cloudflare output shape moved between adapter majors:
 *   - @astrojs/cloudflare 14 (Astro 7) writes static HTML to dist/client/
 *   - @astrojs/cloudflare 13 (Astro 6) may write it straight to dist/
 * So the root is AUTO-DETECTED: dist/client if it holds an index.html,
 * otherwise dist. Override with PARITY_DIST=<relative-or-absolute-path> when
 * a project builds somewhere else entirely. The chosen root is printed on
 * every run so a snapshot is never silently taken against the wrong tree.
 *
 * WHICH PAGES (the other half of the parameterization)
 * By default every .html file under the html root is discovered and
 * snapshotted, so a fresh clone needs no edit. Asset directories (_astro,
 * _worker.js, anything dot-prefixed) are skipped. A project that wants a
 * fixed, ordered list (e.g. "the 13 pages this conversion touches") can set
 * PAGES below to [name, file] pairs and discovery switches off.
 *
 * WHAT THE NORMALIZER STRIPS, AND WHY
 * The goal is a snapshot that is stable across two identical rebuilds but still
 * catches real markup drift. Everything not listed here is left byte-faithful.
 *
 *   1. Content hashes in /_astro/ asset references.
 *      /_astro/BaseLayout.BQUbAod2.css        -> /_astro/BaseLayout.HASH.css
 *      /_astro/hero-room.DV6BG3W2_12pCEf.webp -> /_astro/hero-room.HASH.webp
 *      Rollup/Vite rehash a bundle whenever its content changes, and the image
 *      pipeline appends a second per-variant hash. Neither is markup drift, and
 *      both churn constantly during a refactor (a moved component changes the
 *      CSS bundle's hash without changing one rendered pixel). Only the LAST
 *      dot-segment before the extension is treated as the hash, so names that
 *      contain dots of their own survive intact
 *      (BaseLayout.astro_astro_type_script_index_0_lang.HASH.js).
 *   2. Astro's build-id / scoped-style hash ATTRIBUTE VALUES, where they carry a
 *      generated hash: data-astro-cid-xxxxxx and data-astro-transition-scope.
 *      A scoped-style id is derived from the component's file path, so moving
 *      markup from about.astro into a section component legitimately changes it
 *      while the rendered result is identical. The attribute NAME is kept (its
 *      presence or absence is real drift), the hash is replaced with CID.
 *   3. The hydration PREFIX on <astro-island>, prefix="r1" -> prefix="rN".
 *      Astro numbers each island by its position in the render order and uses
 *      the value only to namespace that island's hydration variables, so the
 *      number is unique-per-page and otherwise meaningless. Moving a section
 *      pushes its island down the render order (r1 -> r8) without changing one
 *      rendered byte, which is the same situation as the scoped-style hash in
 *      rule 2: a generated identity derived from source layout. The
 *      <astro-island> tag itself, its component-url and its serialized props
 *      are all still compared, so a real island change still shows up.
 *   4. Whitespace runs BETWEEN tags (>   < becomes ><) and trailing whitespace
 *      on every line, plus CRLF -> LF. Astro's indentation shifts when markup
 *      is nested one level deeper inside a section wrapper; the browser does not
 *      care and neither should the diff. Whitespace INSIDE a text node is left
 *      alone, because that is content.
 *
 * Deliberately NOT stripped: data-sanity attributes (they never appear in the
 * static build, only in the SSR preview build, which this harness does not
 * read), inline styles, class lists, ids, aria-*, JSON-LD payloads, and every
 * scrap of text. Those are exactly what a render-neutral change must not
 * disturb.
 *
 * Snapshots live in scripts/.parity/*.html and ARE COMMITTED. They are the
 * baseline; git history is the record of when one legitimately changed.
 * Re-capture only when you intend to move the baseline, and say so in the
 * commit message.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  readdirSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_DIR = join(ROOT, 'scripts', '.parity');
const STALE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Optional fixed page list: [name, file-relative-to-the-html-root].
 * Leave EMPTY to auto-discover every built .html file (the starter default).
 * Fill it in when a project wants a stable, plan-ordered subset instead.
 */
const PAGES = [];

/** Directories inside the html root that never contain rendered pages. */
const SKIP_DIRS = new Set(['_astro', '_worker.js', '_worker.js.assets', 'node_modules']);

// --------------------------------------------------------------------------
// Where the built HTML lives (adapter-shape aware)
// --------------------------------------------------------------------------

/**
 * Resolve the directory holding the built HTML.
 * Order: PARITY_DIST env override, then dist/client (adapter 14 shape),
 * then dist (adapter 13 shape). "Holds an index.html" is the test, because
 * dist/client can exist as an empty husk after a failed build.
 */
function resolveHtmlRoot() {
  const override = process.env.PARITY_DIST;
  if (override) {
    return { dir: resolve(ROOT, override), label: `PARITY_DIST=${override}` };
  }
  const candidates = [
    [join(ROOT, 'dist', 'client'), 'dist/client'],
    [join(ROOT, 'dist'), 'dist'],
  ];
  for (const [dir, label] of candidates) {
    if (existsSync(join(dir, 'index.html'))) return { dir, label };
  }
  // Nothing usable: return the first candidate so requireDist() can print a
  // precise "build first" message rather than a confusing one about dist/.
  return { dir: candidates[0][0], label: 'dist/client' };
}

const { dir: DIST, label: DIST_LABEL } = resolveHtmlRoot();

// --------------------------------------------------------------------------
// Route discovery
// --------------------------------------------------------------------------

/** Every .html under the html root, as [name, relativeFile] pairs. */
function discoverPages() {
  const found = [];
  const walk = (absDir, relParts) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(absDir, entry.name), [...relParts, entry.name]);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const rel = [...relParts, entry.name].join('/');
        // index.html at the root is "home"; foo/index.html is "foo";
        // 404.html is "404". Names double as snapshot filenames, so any
        // remaining slash becomes __ (a nested route stays readable).
        let name;
        if (entry.name === 'index.html') {
          name = relParts.length === 0 ? 'home' : relParts.join('/');
        } else {
          name = [...relParts, entry.name.replace(/\.html$/, '')].join('/');
        }
        found.push([name, rel]);
      }
    }
  };
  walk(DIST, []);
  // Stable order so capture output and the committed snapshot set are
  // deterministic across machines (readdir order is not guaranteed).
  found.sort((a, b) => a[0].localeCompare(b[0]));
  return found;
}

/** Snapshot filename for a route name (nested routes keep their shape). */
const snapFile = (name) => `${name.replace(/\//g, '__')}.html`;

function getPages() {
  if (PAGES.length > 0) return PAGES;
  requireDist();
  return discoverPages();
}

// --------------------------------------------------------------------------
// Normalizer
// --------------------------------------------------------------------------

/** Rule 1: hashed asset references under /_astro/. */
function stripAssetHashes(html) {
  // Match a full /_astro/ path, then rewrite only its final hash segment.
  return html.replace(
    /\/_astro\/([A-Za-z0-9._@-]+)\.([A-Za-z0-9_-]{6,})\.([a-z0-9]+)\b/g,
    '/_astro/$1.HASH.$3',
  );
}

/** Rule 2: generated hashes inside astro's own attribute names/values. */
function stripAstroCids(html) {
  return (
    html
      // class="... astro-cid-ge4ks5ma ..." and the matching data-astro-cid-* marker
      .replace(/data-astro-cid-[a-z0-9]+/g, 'data-astro-cid-CID')
      .replace(/astro-cid-[a-z0-9]{6,}/g, 'astro-cid-CID')
      // View-transition scopes are generated per build from component identity.
      .replace(/data-astro-transition-scope="[^"]*"/g, 'data-astro-transition-scope="SCOPE"')
  );
}

/** Rule 3: the render-order counter in an island's hydration prefix. */
function stripIslandPrefixes(html) {
  return html.replace(/(<astro-island\b[^>]*?)\sprefix="r\d+"/g, '$1 prefix="rN"');
}

/** Rule 4: whitespace that only reflects source indentation. */
function collapseWhitespace(html) {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/>[ \t\r\n]+</g, '><')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function normalize(html) {
  return collapseWhitespace(stripIslandPrefixes(stripAstroCids(stripAssetHashes(html))));
}

// --------------------------------------------------------------------------
// Built-HTML access
// --------------------------------------------------------------------------

function requireDist() {
  if (!existsSync(DIST)) {
    fail(
      `Built HTML not found (looked for ${DIST_LABEL}).\n` +
        'This script never builds. Run the build first, then re-run:\n' +
        '  npm run build\n' +
        '  node scripts/page-parity.mjs ' +
        (process.argv[2] ?? 'capture') +
        '\nIf this project builds somewhere else, set PARITY_DIST to that path.',
    );
  }
  const marker = join(DIST, 'index.html');
  if (!existsSync(marker)) {
    fail(
      `${DIST_LABEL} exists but has no index.html. The build did not finish. Re-run npm run build.`,
    );
  }
  const age = Date.now() - statSync(marker).mtimeMs;
  if (age > STALE_MS) {
    const hours = (age / 3600000).toFixed(1);
    console.warn(`WARNING: ${DIST_LABEL} was built ${hours}h ago. It may not reflect your working tree.`);
  }
}

function readPage(file) {
  const path = join(DIST, ...file.split('/'));
  if (!existsSync(path)) return null;
  return normalize(readFileSync(path, 'utf8'));
}

// --------------------------------------------------------------------------
// Diffing
// --------------------------------------------------------------------------

/**
 * Split normalized HTML into pseudo-lines at tag boundaries.
 * The snapshot on disk stays one long stream per source line (byte-faithful);
 * this split exists only so a diff points at a tag rather than at "line 12".
 */
function toDiffLines(text) {
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=>)(?=<)/))
    .filter((l) => l !== '');
}

/** Minimal LCS-backed unified diff, trimmed to the changed region. */
function unifiedDiff(oldText, newText, maxLines) {
  const a = toDiffLines(oldText);
  const b = toDiffLines(newText);

  // Trim common prefix/suffix so the DP table only covers the changed middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const CAP = 3000;
  if (midA.length > CAP || midB.length > CAP) {
    // Too big to LCS cheaply. Report the raw changed window instead.
    const out = [
      `@@ changed region is large (${midA.length} old / ${midB.length} new lines), showing head @@`,
    ];
    for (const line of midA.slice(0, Math.floor(maxLines / 2))) out.push('- ' + line);
    for (const line of midB.slice(0, Math.floor(maxLines / 2))) out.push('+ ' + line);
    return out;
  }

  // Classic LCS length table.
  const n = midA.length;
  const m = midB.length;
  const lcs = new Int32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] =
        midA[i] === midB[j]
          ? lcs[(i + 1) * (m + 1) + (j + 1)] + 1
          : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + (j + 1)]);
    }
  }

  const out = [`@@ first change at tag #${start + 1} @@`];
  let i = 0;
  let j = 0;
  while (i < n && j < m && out.length <= maxLines) {
    if (midA[i] === midB[j]) {
      out.push('  ' + midA[i]);
      i++;
      j++;
    } else if (lcs[(i + 1) * (m + 1) + j] >= lcs[i * (m + 1) + (j + 1)]) {
      out.push('- ' + midA[i]);
      i++;
    } else {
      out.push('+ ' + midB[j]);
      j++;
    }
  }
  while (i < n && out.length <= maxLines) out.push('- ' + midA[i++]);
  while (j < m && out.length <= maxLines) out.push('+ ' + midB[j++]);
  if (i < n || j < m) out.push(`... ${n - i + (m - j)} more changed lines suppressed ...`);
  return out;
}

/** Shorten a diff line so one runaway tag cannot flood the terminal. */
function clip(line, width = 200) {
  return line.length > width ? line.slice(0, width) + ' ...' : line;
}

// --------------------------------------------------------------------------
// Modes
// --------------------------------------------------------------------------

function capture(only) {
  const pages = getPages();
  mkdirSync(SNAP_DIR, { recursive: true });
  let written = 0;
  let missing = 0;
  for (const [name, file] of pages) {
    if (only && only !== name) continue;
    const html = readPage(file);
    if (html === null) {
      console.log(`  MISS  ${name.padEnd(20)} ${DIST_LABEL}/${file} not found`);
      missing++;
      continue;
    }
    const out = join(SNAP_DIR, snapFile(name));
    writeFileSync(out, html + '\n', 'utf8');
    const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
    console.log(`  SAVE  ${name.padEnd(20)} ${kb.padStart(7)} KB  -> scripts/.parity/${snapFile(name)}`);
    written++;
  }
  console.log(`\n${written} snapshot(s) written${missing ? `, ${missing} page(s) missing from ${DIST_LABEL}` : ''}.`);
  console.log('Commit scripts/.parity/*.html: they are the parity baseline.');
  if (missing) process.exit(1);
}

function compare(only) {
  const pages = getPages();
  if (!existsSync(SNAP_DIR) || readdirSync(SNAP_DIR).length === 0) {
    fail('No snapshots in scripts/.parity/. Run: node scripts/page-parity.mjs capture');
  }
  let pass = 0;
  let diff = 0;
  const diffs = [];
  for (const [name, file] of pages) {
    if (only && only !== name) continue;
    const snapPath = join(SNAP_DIR, snapFile(name));
    if (!existsSync(snapPath)) {
      console.log(`  SKIP  ${name.padEnd(20)} no baseline snapshot`);
      continue;
    }
    const baseline = readFileSync(snapPath, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
    const current = readPage(file);
    if (current === null) {
      console.log(`  DIFF  ${name.padEnd(20)} ${DIST_LABEL}/${file} not found (page gone?)`);
      diff++;
      continue;
    }
    if (current === baseline) {
      console.log(`  PASS  ${name}`);
      pass++;
    } else {
      console.log(`  DIFF  ${name}`);
      diff++;
      diffs.push([name, unifiedDiff(baseline, current, 40)]);
    }
  }

  for (const [name, lines] of diffs) {
    console.log(`\n--- baseline/${name}\n+++ current/${name}`);
    for (const line of lines) console.log(clip(line));
  }

  console.log(`\n${pass}/${pass + diff} PASS`);
  if (diff) {
    console.log('Parity broken. Either the change altered rendered markup, or the');
    console.log('normalizer needs a new rule for a genuinely build-varying value.');
    process.exit(1);
  }
}

function list() {
  const pages = getPages();
  console.log(`html root: ${DIST_LABEL}`);
  console.log(`${pages.length} route(s)${PAGES.length ? ' (fixed PAGES list)' : ' (auto-discovered)'}:`);
  for (const [name, file] of pages) console.log(`  ${name.padEnd(20)} ${file}`);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const mode = process.argv[2];
const only = process.argv[3];

if (mode === 'capture' || mode === 'compare') {
  console.log(`[page-parity] html root: ${DIST_LABEL}`);
  if (only) {
    const known = getPages().map(([n]) => n);
    if (!known.includes(only)) fail(`Unknown page "${only}". Known: ${known.join(', ')}`);
  }
}

if (mode === 'capture') capture(only);
else if (mode === 'compare') compare(only);
else if (mode === 'list') list();
else {
  console.log('Usage (build first, this script never builds):');
  console.log('  npm run build');
  console.log('  node scripts/page-parity.mjs capture [page]');
  console.log('  node scripts/page-parity.mjs compare [page]');
  console.log('  node scripts/page-parity.mjs list');
  console.log('\nHtml root is auto-detected (dist/client, else dist); override with PARITY_DIST.');
  process.exit(mode ? 1 : 0);
}
