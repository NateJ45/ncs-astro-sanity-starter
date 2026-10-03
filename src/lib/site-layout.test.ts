// Gate: the layout slots in brand.config.schema.json, the defaults in
// brand.config.json and src/lib/site-layout.ts must agree, and a default site
// must emit no layout attributes (so existing sites render unchanged).
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

test('every slot default is its first value, and brand.config.json ships the defaults', () => {
  for (const [slot, values] of Object.entries(LAYOUT_SLOTS)) {
    assert.equal(DEFAULT_LAYOUT[slot as keyof typeof DEFAULT_LAYOUT], values[0]);
  }
  assert.deepEqual(config.layout, DEFAULT_LAYOUT);
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
