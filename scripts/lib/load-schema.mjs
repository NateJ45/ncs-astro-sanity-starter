// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// load-schema.mjs - load the Studio's TypeScript schema in plain Node, no tsx
// =============================================================================
// WHY THIS EXISTS (2026-10-13, PORTS.md card 95)
//
// scripts/audit-data-vs-schema.mjs and scripts/backfill-array-types.mjs need the
// REAL schema (the array members, the declared fields, the dropdown lists), and
// that lives in src/sanity/schemaTypes/*.ts. mas-monograms first loaded it
// through `tsx`, which is a dependency the family decided not to add. Node 24
// strips TypeScript types itself, so the only gaps are the three things the
// schema files do that Node will not:
//
//   1. extensionless relative imports (`from './sections'`), which Node's ESM
//      resolver refuses; we retry with `.ts`, `.tsx`, `/index.ts`;
//   2. the `@/` path alias from tsconfig, mapped to `<root>/src/`;
//   3. `.tsx` Studio components (custom inputs, previews). Node cannot strip
//      JSX, and a data audit never renders them, so each `.tsx` file loads as a
//      stub whose exports are functions that return null. Named exports are
//      read from the source with a regex, which is enough for the
//      `export function X` / `export const X` / `export default` shapes the
//      family writes. CSS and SVG imports load as empty modules for the same
//      reason.
//
// A type-only import that is not written `import type` would also break plain
// Node (it asks the real module for a name that only exists at compile time);
// the family's schema files already use `import type`, and the error names the
// file if one does not.
//
// Needs Node 22.18+ or 24 (type stripping on by default, `module.registerHooks`).
// CI's `node-version: 22` resolves to the newest 22.x, which has both.
// =============================================================================
import * as nodeModule from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TRY_SUFFIXES = ['.ts', '.tsx', '.mts', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
const STUB_EXT = /\.(css|scss|svg|png|jpe?g|webp|avif|gif)$/i;

/** Pure: the export names a `.tsx` component file declares (for its stub). */
export function exportNames(source) {
  const names = new Set();
  const decl =
    /export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of source.matchAll(decl)) names.add(m[1]);
  for (const m of source.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const bits = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/);
      const name = (bits[1] ?? bits[0]).trim();
      if (name && name !== 'default' && !part.trim().startsWith('type ')) names.add(name);
    }
  }
  const hasDefault = /export\s+default\b/.test(source) || /as\s+default\b/.test(source);
  return { names: [...names], hasDefault };
}

/** Pure: the stub module source for a `.tsx` file. */
export function stubSource(source) {
  const { names, hasDefault } = exportNames(source);
  const lines = names.map((n) => `export const ${n} = () => null;`);
  if (hasDefault) lines.push('export default () => null;');
  return lines.join('\n') + '\n';
}

let registered = false;

/** Install the resolve/load hooks once. `root` is the repo root. */
export function registerSchemaHooks(root) {
  if (registered) return;
  registered = true;
  const srcDir = resolve(root, 'src');

  if (typeof nodeModule.registerHooks !== 'function') {
    throw new Error(`load-schema needs Node 22.18+ or 24; this is ${process.version}.`);
  }
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      let spec = specifier;
      if (spec.startsWith('@/')) spec = pathToFileURL(resolve(srcDir, spec.slice(2))).href;
      const local = spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('file:');
      const fromNodeModules = context.parentURL?.includes('/node_modules/');
      try {
        return nextResolve(spec, context);
      } catch (err) {
        if (!local || fromNodeModules || !context.parentURL) throw err;
        const base = spec.startsWith('file:') ? fileURLToPath(spec) : null;
        for (const suffix of TRY_SUFFIXES) {
          const candidate = base
            ? base + suffix
            : fileURLToPath(new URL(spec + suffix, context.parentURL));
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return nextResolve(pathToFileURL(candidate).href, context);
          }
        }
        throw err;
      }
    },
    load(url, context, nextLoad) {
      if (url.startsWith('file:') && !url.includes('/node_modules/')) {
        if (url.endsWith('.tsx')) {
          const source = readFileSync(fileURLToPath(url), 'utf8');
          return { format: 'module', source: stubSource(source), shortCircuit: true };
        }
        if (STUB_EXT.test(url)) {
          return { format: 'module', source: 'export default "";\n', shortCircuit: true };
        }
      }
      return nextLoad(url, context);
    },
  });
}

/**
 * Load the compiled schema types array. Defaults to the family layout,
 * `src/sanity/schemaTypes/index.ts` exporting `schemaTypes`; a site that keeps
 * it elsewhere sets SANITY_SCHEMA_INDEX (repo-relative) and, if the export has
 * another name, SANITY_SCHEMA_EXPORT.
 */
export async function loadSchemaTypes(root, env = process.env) {
  registerSchemaHooks(root);
  const rel = env.SANITY_SCHEMA_INDEX || 'src/sanity/schemaTypes/index.ts';
  const name = env.SANITY_SCHEMA_EXPORT || 'schemaTypes';
  const mod = await import(pathToFileURL(resolve(root, rel)).href);
  const types = mod[name] ?? mod.default;
  if (!Array.isArray(types)) {
    throw new Error(`${rel} does not export an array named "${name}" (or a default array).`);
  }
  return types;
}
