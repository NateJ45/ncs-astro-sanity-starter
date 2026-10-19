// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Quick update jobs from config alone (card 137): what each job saves
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  answers,
  formValue,
  getPath,
  jobDocument,
  jobItem,
  jobProblems,
  jobTarget,
  inSeason,
  pickQuery,
  setPath,
  slugify,
  storedValue,
  textToBlocks,
  type JobField,
} from './studio-quick-jobs.ts';

let n = 0;
const key = () => `k${n++}`;

describe('values', () => {
  it('stores each kind as Sanity expects', () => {
    assert.equal(storedValue({ name: 'a', kind: 'boolean' }, 'true'), true);
    assert.equal(storedValue({ name: 'a', kind: 'boolean' }, ''), false);
    assert.equal(storedValue({ name: 'a', kind: 'number' }, '12.5'), 12.5);
    assert.equal(storedValue({ name: 'a', kind: 'string' }, '  '), undefined);
    assert.equal(
      storedValue({ name: 'a', kind: 'datetime' }, '2026-10-19T09:00'),
      new Date('2026-10-19T09:00').toISOString(),
    );
    assert.deepEqual(storedValue({ name: 'a', kind: 'string', as: 'slug' }, 'Harvest Supper!'), {
      _type: 'slug',
      current: 'harvest-supper',
    });
  });
  it('turns text into paragraphs and back', () => {
    const blocks = textToBlocks('One line\nwrapped.\n\nTwo.', key);
    assert.equal(blocks.length, 2);
    const f: JobField = { name: 'body', kind: 'text', as: 'blocks' };
    assert.equal(formValue(f, blocks), 'One line wrapped.\n\nTwo.');
  });
  it('slugs plainly', () => {
    assert.equal(slugify('Café & Coffee, 2026'), 'cafe-and-coffee-2026');
  });
  it('reads and writes dot paths', () => {
    const o = setPath({} as Record<string, unknown>, 'banner.show', true);
    assert.equal(getPath(o, 'banner.show'), true);
    assert.equal(getPath(o, 'banner.missing.deep'), undefined);
  });
});

describe('jobs', () => {
  const fields: JobField[] = [
    { name: 'title', kind: 'string' },
    { name: 'when', kind: 'date', path: 'event.date' },
    { name: 'pdf', kind: 'file' },
  ];
  it('create: defaults, answers at their paths, a slug and the file', () => {
    const doc = jobDocument(
      { kind: 'create', type: 'notice', defaults: { showOnHome: true }, slugFrom: 'title' },
      fields,
      { title: 'Bake sale', when: '2026-11-01' },
      { pdf: 'file-abc-pdf' },
      key,
    );
    assert.equal(doc._type, 'notice');
    assert.equal(doc.showOnHome, true);
    assert.equal(getPath(doc, 'event.date'), '2026-11-01');
    assert.deepEqual(doc.slug, { _type: 'slug', current: 'bake-sale' });
    assert.deepEqual(doc.pdf, {
      _type: 'file',
      asset: { _type: 'reference', _ref: 'file-abc-pdf' },
    });
  });
  it('create: defaults are copied, never shared between saves', () => {
    const defaults = { tags: ['a'] };
    const a = jobDocument({ kind: 'create', type: 't', defaults }, [], {});
    (a.tags as string[]).push('b');
    assert.deepEqual(defaults.tags, ['a']);
  });
  it('append: an item with a key and its type', () => {
    const item = jobItem(
      { kind: 'append', doc: 'siteSettings', array: 'notices', itemType: 'notice' },
      [{ name: 'text', kind: 'string' }],
      { text: 'Hello' },
      {},
      key,
    );
    assert.equal(item._type, 'notice');
    assert.ok(item._key);
    assert.equal(item.text, 'Hello');
  });
  it('answers leave out empty boxes so an edit can clear them', () => {
    assert.deepEqual(answers([{ name: 'a', kind: 'string' }], { a: '' }), {});
  });
  it('opens the right document afterwards', () => {
    assert.deepEqual(jobTarget({ kind: 'edit', doc: 'siteSettings' }), {
      doc: 'siteSettings',
      type: 'siteSettings',
    });
    assert.deepEqual(jobTarget({ kind: 'create', type: 'notice' }, 'x1'), {
      doc: 'x1',
      type: 'notice',
    });
  });
  it('finds config mistakes', () => {
    assert.equal(
      jobProblems('a', { kind: 'create', type: 'n', slugFrom: 'nope' }, fields).length,
      1,
    );
    assert.equal(jobProblems('b', { kind: 'edit', doc: 'x' }, []).length, 1);
    assert.equal(
      jobProblems('c', { kind: 'schedule', type: 'n' }, [{ name: 'publishAt', kind: 'datetime' }])
        .length,
      1,
    );
    assert.deepEqual(jobProblems('d', { kind: 'toggle', doc: 'x', field: 'on' }, []), []);
  });
});

describe('seasons, picking and links', () => {
  it('shows a form only in its season, across the new year too', () => {
    const d = (s: string) => new Date(`${s}T12:00:00`);
    assert.equal(inSeason(undefined, d('2026-01-01')), true);
    assert.equal(inSeason({ from: '10-18', to: '10-26' }, d('2026-10-20')), true);
    assert.equal(inSeason({ from: '10-18', to: '10-26' }, d('2026-11-01')), false);
    assert.equal(inSeason({ from: '12-01', to: '01-06' }, d('2027-01-03')), true);
    assert.equal(inSeason({ from: '12-01', to: '01-06' }, d('2026-06-03')), false);
    assert.equal(inSeason({ from: '2026-10-18', to: '2026-10-26' }, d('2027-10-20')), false);
  });
  it('lists published documents of the type for an edit job that picks', () => {
    const q = pickQuery({ type: 'event', filter: 'date >= now()', order: 'date asc' });
    assert.ok(q.includes('_type == $type'));
    assert.ok(q.includes('(date >= now())'));
    assert.ok(q.includes('order(date asc)'));
  });
  it('a picked edit opens the picked document; a link has no form', () => {
    assert.deepEqual(jobTarget({ kind: 'edit', pick: { type: 'event' } }, 'e1'), {
      doc: 'e1',
      type: 'event',
    });
    assert.equal(jobTarget({ kind: 'link', target: { tool: 'newsletter' } }), null);
    assert.deepEqual(jobProblems('l', { kind: 'link', target: { tool: 'x' } }, []), []);
    assert.equal(jobProblems('e', { kind: 'edit' }, [{ name: 'a', kind: 'string' }]).length, 1);
  });
});
