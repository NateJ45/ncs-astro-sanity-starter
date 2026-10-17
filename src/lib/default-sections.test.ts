// =============================================================================
// default-sections - the built-in default blocks only use fields their schema has
// =============================================================================
// src/data/defaultSections.ts is hand-written page-builder data: it renders when
// no Sanity project is connected and `npm run seed` writes it as first content.
// Nothing type-checks its field names against the block schema (PageBuilderBlock
// is loose), so until 2026-10-17 the richText and imageText defaults named their
// heading `headline` while the components read `heading`, and every default
// section heading silently never rendered (PORTS.md card 104).
//
// Both files are read as text, like section-fields.test.ts does with the schema,
// because defaultSections.ts imports through the `@/` alias, which plain node
// cannot resolve. A top-level block is a `    _type: '...'` line; its fields are
// the other lines at that four-space indent.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../sanity/schemaTypes/sections.ts', import.meta.url), 'utf8');
const defaults = readFileSync(new URL('../data/defaultSections.ts', import.meta.url), 'utf8');

/** Every `name: '...'` and `proseBody('...')` inside one block's defineType (nested names included, which only loosens the check). */
function schemaFields(type: string): Set<string> {
  const start = schema.indexOf(`name: '${type}'`);
  assert.ok(start >= 0, `${type} is not defined in sections.ts`);
  const next = schema.indexOf('defineType(', start);
  const body = schema.slice(start, next < 0 ? undefined : next);
  return new Set([...body.matchAll(/(?:name: |proseBody\()'(\w+)'/g)].map((m) => m[1]));
}

/** [type, key, line number] for every top-level field of every default block. */
function defaultFields(): Array<[string, string, number]> {
  const out: Array<[string, string, number]> = [];
  let type: string | null = null;
  defaults.split('\n').forEach((line, i) => {
    const t = line.match(/^ {4}_type: '(\w+)'/);
    if (t) {
      type = t[1];
      return;
    }
    const k = line.match(/^ {4}(\w+):/);
    if (type && k && k[1] !== '_key') out.push([type, k[1], i + 1]);
  });
  return out;
}

test('every field in a default block exists on that block type', () => {
  const fields = defaultFields();
  assert.ok(fields.length > 10, 'parsed too few default fields; has the file shape changed?');
  const cache = new Map<string, Set<string>>();
  for (const [type, key, line] of fields) {
    if (!cache.has(type)) cache.set(type, schemaFields(type));
    assert.ok(
      cache.get(type)!.has(key),
      `defaultSections.ts:${line}: ${type} has no field "${key}", so it never renders`,
    );
  }
});
