// Gate: the layout slots in brand.config.schema.json and src/lib/site-layout.ts
// must agree, brand.config.json must name real values that src/data/layout.ts
// carries, and a default site must emit no layout attributes (so existing sites
// render unchanged). A fork may pick its own layout (PORTS.md card 104).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAYOUT_SLOTS, DEFAULT_LAYOUT, resolveLayout, layoutAttrs } from './site-layout.ts';

const schema = JSON.parse(readFileSync('brand/brand.config.schema.json', 'utf-8'));
const config = JSON.parse(readFileSync('brand/brand.config.json', 'utf-8'));

test('schema enums match the slot lists', () => {
  const props = schema.properties.layout.properties;
  assert.deepEqual(Object.keys(props).sort(), Object.keys(LAYOUT_SLOTS).sort());
  for (const [slot, values] of Object.entries(LAYOUT_SLOTS)) {
    assert.deepEqual(props[slot].enum, [...values], slot);
  }
});

test('every slot default is its first value, and brand.config.json names only real values', () => {
  for (const [slot, values] of Object.entries(LAYOUT_SLOTS)) {
    assert.equal(DEFAULT_LAYOUT[slot as keyof typeof DEFAULT_LAYOUT], values[0]);
  }
  // A fork may pick its own layout (apply-brand writes it), so the config is not held to the
  // defaults; it must name real values, which resolveLayout passes through unchanged.
  assert.deepEqual(resolveLayout(config.layout), config.layout);
});

test('src/data/layout.ts carries what brand.config.json says (apply-brand was run)', () => {
  const src = readFileSync('src/data/layout.ts', 'utf-8');
  for (const [slot, value] of Object.entries(config.layout as Record<string, string>)) {
    assert.match(src, new RegExp(slot + ": '" + value + "'"), slot);
  }
});

test('a default or missing config emits no attributes', () => {
  assert.deepEqual(layoutAttrs(resolveLayout()), {});
  assert.deepEqual(layoutAttrs(resolveLayout(null)), {});
  assert.deepEqual(layoutAttrs(resolveLayout(DEFAULT_LAYOUT)), {});
});

test('non-default values emit attributes; hero never does; unknowns fall back', () => {
  const l = resolveLayout({ header: 'centered', hero: 'split', density: 'tight', cards: 'soft' });
  assert.deepEqual(layoutAttrs(l), {
    'data-header': 'centered',
    'data-density': 'tight',
    'data-cards': 'soft',
  });
  assert.equal(resolveLayout({ header: 'nope' }).header, 'inline');
});
