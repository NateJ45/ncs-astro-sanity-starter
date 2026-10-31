// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRetireArgs,
  retireQuery,
  valueAt,
  buildRetirePlan,
  backupBody,
} from './retire-fields-plan.mjs';

test('reads the type and every field, without duplicates', () => {
  const out = parseRetireArgs([
    '--type',
    'siteSettings',
    '--field',
    'sectionVisibility.showEDesign',
    '--field',
    'sectionVisibility.showEDesign',
    '--apply',
  ]);
  assert.deepEqual(out, { type: 'siteSettings', fields: ['sectionVisibility.showEDesign'] });
});

test('refuses a missing type, a missing field and anything that is not a plain path', () => {
  assert.throws(() => parseRetireArgs(['--field', 'a']), /--type/);
  assert.throws(() => parseRetireArgs(['--type', 'siteSettings']), /--field/);
  for (const bad of ['a[0].b', 'a..b', 'a) || true || (b', '', '1a']) {
    assert.throws(() => parseRetireArgs(['--type', 'x', '--field', bad]), /plain field path/);
  }
  assert.throws(() => parseRetireArgs(['--type', 'x"] | *[', '--field', 'a']), /--type/);
});

test('the query finds published and draft documents holding any of the fields', () => {
  assert.equal(
    retireQuery('siteSettings', ['sectionVisibility.showEDesign', 'oldField']),
    '*[_type == "siteSettings" && (defined(sectionVisibility.showEDesign) || defined(oldField))]',
  );
});

test('the plan names only the fields each document holds, false included', () => {
  const docs = [
    { _id: 'siteSettings', _rev: 'r1', sectionVisibility: { showEDesign: false, showShop: true } },
    { _id: 'drafts.siteSettings', _rev: 'r2', sectionVisibility: { showShop: true } },
  ];
  assert.equal(valueAt(docs[0], 'sectionVisibility.showEDesign'), false);
  assert.equal(valueAt(docs[1], 'sectionVisibility.showEDesign'), undefined);
  assert.deepEqual(buildRetirePlan(docs, ['sectionVisibility.showEDesign']), [
    {
      _id: 'siteSettings',
      _rev: 'r1',
      fields: ['sectionVisibility.showEDesign'],
      values: { 'sectionVisibility.showEDesign': false },
    },
  ]);
});

test('the backup keeps whole documents and says what was retired', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  const docs = [{ _id: 'siteSettings', a: 1 }];
  assert.deepEqual(backupBody({ type: 't', fields: ['a'], dataset: 'production', docs, now }), {
    retired: { type: 't', fields: ['a'], dataset: 'production', at: '2026-10-30T12:00:00.000Z' },
    documents: docs,
  });
});
