// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The written-index check (card 165): a whole index passes, a cut-off one is named.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { incompleteIndexFiles } from './search-index-check.mjs';

const WHOLE_JS =
  'const a=1;function search(){return a}\nexport{createInstance,debouncedSearch,destroy,filters,init,mergeIndex,options,preload,search};\n';
const ENTRY = JSON.stringify({
  version: '1.5.0',
  languages: { en: { hash: 'en_1', wasm: 'en', page_count: 3 } },
});

function indexDir(js, entry) {
  const dir = mkdtempSync(join(tmpdir(), 'pf-check-'));
  if (js !== null) writeFileSync(join(dir, 'pagefind.js'), js);
  if (entry !== null) writeFileSync(join(dir, 'pagefind-entry.json'), entry);
  return dir;
}

describe('incompleteIndexFiles', () => {
  it('passes a whole index', () => {
    assert.deepEqual(incompleteIndexFiles(indexDir(WHOLE_JS, ENTRY)), []);
  });
  it('names a pagefind.js cut off part-way', () => {
    const cut = WHOLE_JS.slice(0, 40);
    const problems = incompleteIndexFiles(indexDir(cut, ENTRY));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /pagefind\.js is cut off/);
  });
  it('names missing files', () => {
    const problems = incompleteIndexFiles(indexDir(null, null));
    assert.deepEqual(problems, ['pagefind.js is missing', 'pagefind-entry.json is missing']);
  });
  it('names an entry file that does not parse or lists no language', () => {
    assert.match(
      incompleteIndexFiles(indexDir(WHOLE_JS, '{"languages":{"en"'))[0],
      /not valid JSON/,
    );
    assert.match(
      incompleteIndexFiles(indexDir(WHOLE_JS, '{"languages":{}}'))[0],
      /names no language index/,
    );
  });
});
