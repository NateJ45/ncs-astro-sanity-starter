// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for scripts/lib/load-schema.mjs and the audit's pure checker (PORTS.md card 95).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Schema } from '@sanity/schema';
import { exportNames, stubSource, loadSchemaTypes } from './load-schema.mjs';
import { checkValue } from '../audit-data-vs-schema.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('exportNames reads the shapes a Studio component file uses', () => {
  const src = [
    'export function SeoInput(props: Props) { return <div /> }',
    'export const Badge = () => null;',
    'const Hidden = 1;',
    'export { Hidden as Shown, type Props };',
    'export default function Main() {}',
  ].join('\n');
  const r = exportNames(src);
  assert.deepEqual(r.names.sort(), ['Badge', 'SeoInput', 'Shown']);
  assert.equal(r.hasDefault, true);
  assert.match(stubSource(src), /export const SeoInput = \(\) => null;/);
  assert.match(stubSource(src), /export default \(\) => null;/);
});

test("this repo's TypeScript schema loads in plain Node and compiles", async () => {
  const types = await loadSchemaTypes(ROOT, {});
  assert.ok(Array.isArray(types) && types.length > 0);
  const schema = Schema.compile({ name: 'default', types });
  assert.ok(schema.getTypeNames().length >= types.length);
});

// The audit's checker, against a hand-built compiled schema.
const schema = Schema.compile({
  name: 'test',
  types: [
    { name: 'link', type: 'object', fields: [{ name: 'href', type: 'string' }] },
    { name: 'pageLink', type: 'object', fields: [{ name: 'page', type: 'string' }] },
    {
      name: 'doc',
      type: 'document',
      fields: [
        { name: 'links', type: 'array', of: [{ type: 'link' }, { type: 'pageLink' }] },
        {
          name: 'tone',
          type: 'string',
          options: { list: ['plain', 'bold'] },
        },
        { name: 'count', type: 'number' },
      ],
    },
  ],
});

test('checkValue reports every kind of problem the audit promises', () => {
  const out = checkValue(
    {
      _id: 'd',
      _type: 'doc',
      links: [{ href: '/a' }, { _key: 'b', _type: 'nope' }, { _type: 'link', href: '/c' }],
      tone: 'loud',
      count: 'three',
      removedField: 'left behind',
    },
    schema.get('doc'),
    '',
  );
  const text = out.join('\n');
  assert.match(text, /\.links\[0\] {2}item has no _key/);
  assert.match(text, /\.links\[0\] {2}item has no _type/);
  assert.match(text, /\.links\[1\] {2}_type "nope" is not allowed/);
  assert.match(text, /\.links\[2\] {2}item has no _key/);
  assert.match(text, /\.tone {2}"loud" is not one of the choices/);
  assert.match(text, /\.count {2}expected number/);
  assert.match(text, /\.removedField {2}stored but the schema does not declare it/);
});

test('clean data produces no findings', () => {
  const out = checkValue(
    {
      _id: 'd',
      _type: 'doc',
      links: [{ _key: 'a', _type: 'link', href: '/a' }],
      tone: 'bold',
      count: 3,
    },
    schema.get('doc'),
    '',
  );
  assert.deepEqual(out, []);
});
