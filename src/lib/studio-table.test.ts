// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Table panes (src/lib/studio-table.ts, card 117): draft merging, status, sorting,
// cell text, and the site's own src/sanity/tables.config.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cellText,
  configProblems,
  mergeDrafts,
  sortRows,
  tableQuery,
  type TableConfig,
} from './studio-table.ts';
import { TABLES } from '../sanity/tables.config.ts';

describe('mergeDrafts', () => {
  it('one row per document, the draft shown, the status from which copies exist', () => {
    const rows = mergeDrafts([
      { _id: 'a', title: 'A live' },
      { _id: 'drafts.a', title: 'A edited' },
      { _id: 'b', title: 'B' },
      { _id: 'drafts.c', title: 'C new' },
      { _id: 'versions.r1.b', title: 'release copy' },
    ]);
    const by = Object.fromEntries(rows.map((r) => [r.id, [r.status, r.values.title]]));
    assert.deepEqual(by, {
      a: ['changed', 'A edited'],
      b: ['published', 'B'],
      c: ['draft', 'C new'],
    });
  });
});

describe('cellText', () => {
  it('formats each kind', () => {
    assert.equal(cellText('2026-10-18', 'date'), 'Oct 18, 2026');
    assert.equal(cellText(true, 'bool'), 'Yes');
    assert.equal(cellText(undefined, 'bool'), 'No');
    assert.equal(cellText(['Faith', null, 'Hope'], 'list'), 'Faith, Hope');
    assert.equal(cellText(null), '');
    assert.equal(cellText('not a date', 'date'), 'not a date');
  });
});

describe('sortRows', () => {
  const rows = mergeDrafts([
    { _id: 'a', date: '2026-01-05', title: 'beta' },
    { _id: 'b', date: '2026-03-01', title: 'Alpha' },
    { _id: 'c', title: 'gamma' },
  ]);
  it('dates newest first, blanks at the bottom either way', () => {
    assert.deepEqual(
      sortRows(rows, 'date', 'desc', 'date').map((r) => r.id),
      ['b', 'a', 'c'],
    );
    assert.deepEqual(
      sortRows(rows, 'date', 'asc', 'date').map((r) => r.id),
      ['a', 'b', 'c'],
    );
  });
  it('text ignores case', () => {
    assert.deepEqual(
      sortRows(rows, 'title', 'asc').map((r) => r.id),
      ['b', 'a', 'c'],
    );
  });
});

describe('config', () => {
  it('tableQuery leaves release copies out', () => {
    assert.match(tableQuery({ type: 'x', projection: 'title' }), /versions\.\*\*/);
  });
  it('configProblems catches a column the projection does not produce', () => {
    const bad: TableConfig = {
      id: 'Bad Id',
      title: 'x',
      type: 'x',
      projection: 'title',
      columns: [
        { key: 'title', label: 'T' },
        { key: 'date', label: 'D' },
      ],
      defaultSort: { key: 'nope', dir: 'asc' },
    };
    assert.equal(configProblems([bad]).length, 3);
  });
  it("this site's tables.config.ts is sound", () => {
    assert.deepEqual(configProblems(TABLES), []);
  });
});
