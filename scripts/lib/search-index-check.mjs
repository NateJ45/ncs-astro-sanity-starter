// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// search-index-check.mjs - is the written Pagefind index whole? (card 165)
// =============================================================================
// scripts/build-search-index.mjs awaits Pagefind's writeFiles() and then
// close(), which stops Pagefind's helper process. On 2026-10-26 a CI build of
// first-baptist-auburn came out with dist/client/pagefind/pagefind.js cut off
// at exactly 32,768 bytes (one write buffer) and nothing failed: every search
// on that build said "Search is not available right now". The deploy runs the
// same build, so a cut-off file could have shipped. The build now checks the two
// files every search loads first and stops if either is incomplete.
//
// Pure and synchronous (reads files only), so node --test holds it
// (search-index-check.test.mjs).
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What is wrong with the index in `dir` (dist/client/pagefind), one plain line
 * each; empty when it is whole.
 *   - pagefind.js: Pagefind's ES module ends with its `export{...};` list, so a
 *     file cut off part-way has no such ending.
 *   - pagefind-entry.json: must parse and name at least one language index.
 */
export function incompleteIndexFiles(dir) {
  const problems = [];
  const js = join(dir, 'pagefind.js');
  if (!existsSync(js)) problems.push('pagefind.js is missing');
  else {
    const text = readFileSync(js, 'utf8').trimEnd();
    if (!/export\s*\{[^}]*\}\s*;?$/.test(text))
      problems.push(`pagefind.js is cut off (${Buffer.byteLength(text)} bytes, no closing export)`);
  }
  const entry = join(dir, 'pagefind-entry.json');
  if (!existsSync(entry)) problems.push('pagefind-entry.json is missing');
  else {
    try {
      const data = JSON.parse(readFileSync(entry, 'utf8'));
      if (!data || typeof data.languages !== 'object' || !Object.keys(data.languages).length)
        problems.push('pagefind-entry.json names no language index');
    } catch {
      problems.push('pagefind-entry.json is not valid JSON (cut off?)');
    }
  }
  return problems;
}
