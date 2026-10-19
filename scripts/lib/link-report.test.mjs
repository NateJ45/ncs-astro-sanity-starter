// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The weekly link check's Checkup report (scripts/check-live-links.mjs, card 122):
// every link is traced to its document and a Studio deep-link path, and the
// report document is private (an id path) and keyed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLinkReport, collect, usedIn } from '../check-live-links.mjs';

describe('link report', () => {
  it('traces each external link to its document and keyed field path', () => {
    const docs = [
      {
        _id: 'p1',
        _type: 'page',
        title: 'Visit',
        pageBuilder: [{ _key: 'abc', _type: 'ctaBandSection', href: 'https://gone.example/' }],
      },
      { _id: 'siteSettings', _type: 'siteSettings', social: [{ url: 'https://gone.example/' }] },
    ];
    const found = collect(docs);
    assert.equal(found.size, 1);
    assert.deepEqual(usedIn.get('https://gone.example/'), [
      { id: 'p1', type: 'page', path: 'pageBuilder[_key=="abc"].href' },
      { id: 'siteSettings', type: 'siteSettings', path: 'social[0].url' },
    ]);

    const report = buildLinkReport(
      1,
      [{ url: 'https://gone.example/', detail: 'HTTP 404' }],
      [],
      usedIn,
      new Date('2026-10-19T09:15:00Z'),
    );
    assert.equal(report._id, 'linkReport.latest');
    assert.equal(report._type, 'linkReport');
    assert.equal(report.checkedAt, '2026-10-19T09:15:00.000Z');
    assert.equal(report.dead.length, 1);
    assert.equal(report.dead[0]._key, 'l0');
    assert.equal(report.dead[0].docs[0]._key, 'd0');
    assert.equal(report.dead[0].docs[1].id, 'siteSettings');
    assert.deepEqual(report.unverified, []);
  });
});
