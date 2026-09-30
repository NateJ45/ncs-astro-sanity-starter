// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for the Windows repair of @sanity/astro's dev-only module-dedupe alias
// (src/lib/sanity-dedupe-alias.ts, PORTS.md card 60). Pure logic plus the shape
// of the plugin; whether the dev server really stays up is a manual gate (run
// `astro dev` on Windows and open /studio/), because nothing here starts Vite.
// node:test, like the rest of src/lib/*.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixSanityDedupeAlias, repairSanityDedupeAlias } from './sanity-dedupe-alias.ts';

// String.raw keeps the backslashes literal, so these read as the Windows paths
// they are. This is the exact shape @sanity/astro returns on Windows: a
// backslash path that still ends in \package.json because its forward-slash-only
// regex matched nothing.
const WIN_SANITY_FILE = String.raw`C:\Users\dev\site\node_modules\sanity\package.json`;
const WIN_SANITY_DIR = String.raw`C:\Users\dev\site\node_modules\sanity`;
const WIN_STYLED_FILE = String.raw`C:\Users\dev\site\node_modules\styled-components\package.json`;
const WIN_STYLED_DIR = String.raw`C:\Users\dev\site\node_modules\styled-components`;

test('a Windows backslash package.json replacement is cut back to the package directory', () => {
  const alias = [
    { find: /^sanity$/, replacement: WIN_SANITY_FILE },
    { find: /^styled-components$/, replacement: WIN_STYLED_FILE },
  ];
  assert.equal(repairSanityDedupeAlias(alias), 2);
  assert.equal(alias[0].replacement, WIN_SANITY_DIR);
  assert.equal(alias[1].replacement, WIN_STYLED_DIR);
});

test('a forward-slash /node_modules/x/package.json replacement is also cut back', () => {
  const alias = [{ find: /^sanity$/, replacement: '/repo/node_modules/sanity/package.json' }];
  assert.equal(repairSanityDedupeAlias(alias), 1);
  assert.equal(alias[0].replacement, '/repo/node_modules/sanity');
});

test('a scoped package under node_modules is repaired too', () => {
  const alias = [
    {
      find: /^@sanity\/ui$/,
      replacement: String.raw`C:\s\node_modules\@sanity\ui\package.json`,
    },
  ];
  assert.equal(repairSanityDedupeAlias(alias), 1);
  assert.equal(alias[0].replacement, String.raw`C:\s\node_modules\@sanity\ui`);
});

test('an already-correct folder path is left alone', () => {
  const alias = [
    { find: /^sanity$/, replacement: WIN_SANITY_DIR },
    { find: /^styled-components$/, replacement: '/repo/node_modules/styled-components' },
  ];
  assert.equal(repairSanityDedupeAlias(alias), 0);
  assert.equal(alias[0].replacement, WIN_SANITY_DIR);
  assert.equal(alias[1].replacement, '/repo/node_modules/styled-components');
});

test('a string `find` (not a RegExp) is left alone even with a matching replacement', () => {
  const alias = [{ find: 'sanity', replacement: WIN_SANITY_FILE }];
  assert.equal(repairSanityDedupeAlias(alias), 0);
  assert.equal(alias[0].replacement, WIN_SANITY_FILE);
});

test('a package.json that is NOT under node_modules is left alone', () => {
  const srcPkg = String.raw`C:\Users\dev\site\src\package.json`;
  const alias = [
    { find: /^config$/, replacement: srcPkg },
    { find: /^root$/, replacement: '/repo/package.json' },
  ];
  assert.equal(repairSanityDedupeAlias(alias), 0);
  assert.equal(alias[0].replacement, srcPkg);
  assert.equal(alias[1].replacement, '/repo/package.json');
});

test('entries with a non-string replacement, or that are not objects, are skipped without throwing', () => {
  const alias: unknown[] = [
    { find: /^x$/, replacement: 42 },
    { find: /^y$/ },
    null,
    'sanity',
    { find: /^sanity$/, replacement: WIN_SANITY_FILE },
  ];
  assert.equal(repairSanityDedupeAlias(alias), 1);
  assert.equal((alias[4] as { replacement: string }).replacement, WIN_SANITY_DIR);
});

test('the object form of alias, undefined and other junk are a no-op that never throws', () => {
  const record = { sanity: WIN_SANITY_FILE };
  assert.equal(repairSanityDedupeAlias(record), 0);
  assert.equal(record.sanity, WIN_SANITY_FILE);
  assert.equal(repairSanityDedupeAlias(undefined), 0);
  assert.equal(repairSanityDedupeAlias(null), 0);
  assert.equal(repairSanityDedupeAlias('sanity'), 0);
  assert.equal(repairSanityDedupeAlias([]), 0);
});

test('the repair is idempotent', () => {
  const alias = [{ find: /^sanity$/, replacement: WIN_SANITY_FILE }];
  assert.equal(repairSanityDedupeAlias(alias), 1);
  assert.equal(repairSanityDedupeAlias(alias), 0);
});

test('the plugin is dev-server only and repairs through a post-ordered config hook', () => {
  const plugin = fixSanityDedupeAlias();
  assert.equal(plugin.name, 'ncs:fix-sanity-dedupe-alias');
  assert.equal(plugin.apply, 'serve');
  assert.equal(plugin.enforce, 'post');

  const hook = plugin.config;
  assert.ok(hook && typeof hook === 'object' && !Array.isArray(hook), 'config is an object hook');
  const objectHook = hook as { order?: string; handler: (config: unknown) => unknown };
  assert.equal(objectHook.order, 'post');
  assert.equal(typeof objectHook.handler, 'function');

  // Driven the way Vite drives it: it receives the merged config, and the array
  // the upstream plugin contributed is repaired in place.
  const alias = [{ find: /^sanity$/, replacement: WIN_SANITY_FILE }];
  const result = objectHook.handler({ resolve: { alias } });
  assert.equal(result, undefined, 'returns nothing, so no extra config is merged');
  assert.equal(alias[0].replacement, WIN_SANITY_DIR);

  // And it tolerates a config with no resolve block at all.
  assert.doesNotThrow(() => objectHook.handler({}));
});
