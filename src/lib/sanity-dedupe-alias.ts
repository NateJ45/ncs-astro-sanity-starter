// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// sanity-dedupe-alias - repair @sanity/astro's dev-only alias on Windows
// =============================================================================
// PORTS.md card 60. Written in reid-design-site (PR #48) and folded back here on
// 2026-09-29. Config-time helper: astro.config.mjs imports it and adds the plugin
// to `vite.plugins`. Nothing in `src/` at runtime touches it.
//
// THE SYMPTOM
//   On Windows, `astro dev` exits within a minute of starting, with:
//
//     Error during dependency optimization:
//     Build failed with 364 errors:
//     [MISSING_EXPORT] "DocumentStatus" is not exported by
//       "node_modules/sanity/package.json".
//       node_modules/@sanity/orderable-document-list/dist/index.js:1:10
//
//   (The count and the first export named vary with what the optimizer scans
//   first; the tell is `is not exported by "node_modules/sanity/package.json"`,
//   a JSON file where a module should be.) `astro build`, CI and production are
//   all fine, because the plugin below only exists in the dev server.
//
// THE CAUSE
//   @sanity/astro (3.4.2, unchanged in 3.5.1) injects a dev-only Vite plugin
//   named `sanity:module-dedupe` (`apply: 'serve'`, `enforce: 'pre'`). Its
//   `config` hook returns `resolve.alias` entries
//   `{ find: /^sanity$/, replacement: <dir> }` and the same for
//   styled-components, so every `import ... from 'sanity'` resolves to ONE copy.
//   `<dir>` is computed as
//
//     createRequire(...).resolve('<pkg>/package.json').replace(/\/package\.json$/, '')
//
//   That regex matches a FORWARD slash only. Node hands back a backslash path on
//   Windows (`C:\...\node_modules\sanity\package.json`), the replace matches
//   nothing, and the alias points at the package.json file itself. Every import
//   of `sanity` is then satisfied by a JSON file with no exports.
//   (Look for it: grep node_modules/@sanity/astro/dist/sanity-astro.js for
//   `sanity:module-dedupe`.)
//
// THE REJECTED ALTERNATIVE
//   The same plugin has an env off switch, `SANITY_ASTRO_DISABLE_MODULE_DEDUPE=1`.
//   It does stop the crash and the server stays up, but the Studio then fails to
//   hydrate in the browser ("react-compiler-runtime ... does not provide an export
//   named 'c'"), because that plugin ALSO pre-bundles (`optimizeDeps.include`)
//   packages the Studio needs and the switch throws away the whole plugin, not
//   just the broken alias. Do not use it. Repair the alias instead.
//
// HOW THIS WORKS
//   Vite runs every plugin's `config` hook in enforce/order sequence and merges
//   what each returns. A hook ordered LAST (`enforce: 'post'`, `order: 'post'`)
//   receives the already-merged config, so it sees the array the upstream plugin
//   contributed and can correct its entries in place. We only touch an alias whose
//   `find` is a RegExp and whose `replacement` is a string ending in
//   `<sep>node_modules<sep>...<sep>package.json`; the trailing file name is cut
//   off, both separators handled. Returning nothing leaves the rest of the config
//   alone. It is a no-op on macOS and Linux (nothing matches) and stays a no-op
//   once upstream fixes its regex, so leaving it in is harmless.
//
// KEEP IT UNTIL
//   `sanity:module-dedupe` in node_modules/@sanity/astro/dist/sanity-astro.js
//   builds its replacement with a separator-safe replace (path.dirname, or a
//   `[\\/]` class). Then delete this file, its test, the astro.config.mjs import
//   and plugin entry, and note on PORTS.md card 60 that it is retired. Do NOT delete
//   it earlier because "the build works": the build never loads the plugin.
//
// Tested in sanity-dedupe-alias.test.ts.
// =============================================================================

import type { Plugin } from 'vite';

/**
 * An alias `replacement` that is a package.json FILE inside node_modules, in
 * either separator style. That shape is never a legitimate alias target (a
 * replacement is a directory or module path), so it is the signature of the bug.
 */
const PACKAGE_JSON_IN_NODE_MODULES = /[\\/]node_modules[\\/].+[\\/]package\.json$/;

/** The trailing `<sep>package.json`, either separator style. */
const TRAILING_PACKAGE_JSON = /[\\/]package\.json$/;

/**
 * Repair, IN PLACE, every alias entry whose replacement is a package.json file
 * under node_modules by cutting the file name off, leaving the package
 * directory. Returns how many entries were changed.
 *
 * Takes `unknown` on purpose: Vite types `resolve.alias` as either an array or
 * a record, and this must be a quiet no-op for the record form, for undefined,
 * and for anything else. Mutation is deliberate, because array-valued config
 * merges CONCATENATE: returning a corrected copy from a config hook would leave
 * the broken entry in front of it and the broken entry would still win.
 */
export function repairSanityDedupeAlias(alias: unknown): number {
  if (!Array.isArray(alias)) return 0;
  let repaired = 0;
  for (const entry of alias as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as { find?: unknown; replacement?: unknown };
    if (!(candidate.find instanceof RegExp)) continue;
    if (typeof candidate.replacement !== 'string') continue;
    if (!PACKAGE_JSON_IN_NODE_MODULES.test(candidate.replacement)) continue;
    candidate.replacement = candidate.replacement.replace(TRAILING_PACKAGE_JSON, '');
    repaired += 1;
  }
  return repaired;
}

/**
 * The Vite plugin. Add it to `vite.plugins` in astro.config.mjs; it only runs in
 * the dev server (`apply: 'serve'`), like the upstream plugin it repairs.
 */
export function fixSanityDedupeAlias(): Plugin {
  return {
    name: 'ncs:fix-sanity-dedupe-alias',
    apply: 'serve',
    // Two different orderings, both set as in the version that was verified in
    // reid-design-site: `enforce` places the plugin among the plugin groups,
    // `order` places this one hook within the hook sequence. Together they put
    // it after the upstream `enforce: 'pre'` plugin has contributed its alias.
    enforce: 'post',
    config: {
      order: 'post',
      handler(config) {
        repairSanityDedupeAlias(config.resolve?.alias);
      },
    },
  };
}
