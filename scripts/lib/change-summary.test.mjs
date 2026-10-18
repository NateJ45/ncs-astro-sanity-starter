// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The morning change note's summary builder (scripts/lib/change-summary.mjs, card 117).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  authorsFromTransactions,
  buildChangeSummary,
  classifyChanges,
  describeChange,
  humanType,
  isReportable,
  issueTitle,
  parseNdjson,
  siteFromAstroConfig,
  studioEditUrl,
  windowFor,
} from './change-summary.mjs';

const FROM = '2026-10-17T10:00:00.000Z';
const TO = '2026-10-18T10:00:00.000Z';

const doc = (id, type, extra = {}) => ({
  _id: id,
  _type: type,
  _createdAt: '2026-01-01T00:00:00Z',
  _updatedAt: '2026-10-18T09:00:00Z',
  ...extra,
});

describe('isReportable', () => {
  it('skips system documents, assets, Trash records and share links', () => {
    assert.equal(isReportable(doc('a', 'page')), true);
    assert.equal(isReportable(doc('image-1', 'sanity.imageAsset')), false);
    assert.equal(isReportable(doc('t1', 'trashedItem')), false);
    assert.equal(isReportable(doc('previewShare.x', 'previewShare')), false);
    assert.equal(isReportable(doc('_.groups.x', 'system.group')), false);
    assert.equal(isReportable(doc('versions.r1.a', 'page')), false);
    assert.equal(isReportable(null), false);
  });
});

describe('classifyChanges', () => {
  it('tells published, new, edited, new draft and trashed apart', () => {
    const changes = classifyChanges({
      from: FROM,
      docs: [
        doc('about', 'aboutPage', { title: 'About', _updatedAt: '2026-10-18T08:00:00Z' }),
        doc('p1', 'page', {
          title: 'Easter',
          _createdAt: '2026-10-17T12:00:00Z',
          _updatedAt: '2026-10-17T12:30:00Z',
        }),
        doc('drafts.home', 'homePage', { title: 'Home', _updatedAt: '2026-10-18T07:00:00Z' }),
        doc('drafts.new1', 'journalEntry', { title: 'Hello', _updatedAt: '2026-10-18T06:00:00Z' }),
      ],
      publishedIds: ['home'],
      trashed: [
        {
          _id: 'trash1',
          _createdAt: '2026-10-18T05:00:00Z',
          originalId: 'old',
          originalType: 'faqItem',
          title: 'Parking?',
          deletedAt: '2026-10-18T05:00:00Z',
        },
      ],
    });
    assert.deepEqual(
      changes.map((c) => [c.id, c.action]),
      [
        ['about', 'published'],
        ['home', 'edited'],
        ['new1', 'new-draft'],
        ['old', 'trashed'],
        ['p1', 'published-new'],
      ],
    );
  });

  it('merges a published copy and its draft into one entry that says both', () => {
    const [c] = classifyChanges({
      from: FROM,
      docs: [doc('a', 'page', { title: 'A' }), doc('drafts.a', 'page', { title: 'A2' })],
    });
    assert.equal(c.action, 'published');
    assert.equal(c.draftPending, true);
  });
});

describe('buildChangeSummary', () => {
  it('is null on a quiet day, so nothing is posted', () => {
    assert.equal(
      buildChangeSummary({ from: FROM, to: TO, docs: [], siteUrl: 'https://x.org' }),
      null,
    );
    assert.equal(
      buildChangeSummary({
        from: FROM,
        to: TO,
        docs: [doc('image-1', 'sanity.imageAsset')],
        siteUrl: 'https://x.org',
      }),
      null,
    );
  });

  it('names who, what and which page, with Studio and live links', () => {
    const s = buildChangeSummary({
      from: FROM,
      to: TO,
      siteUrl: 'https://church.org/',
      docs: [doc('p1', 'page', { title: 'Visit', slug: { current: 'visit' } })],
      authors: { p1: 'pAnn' },
      names: { pAnn: 'Ann Smith' },
      pathFor: (type, d) => (type === 'page' ? `/${d.slug.current}` : null),
    });
    assert.equal(s.count, 1);
    assert.equal(s.title, 'What changed on Sunday, October 18, 2026');
    assert.match(s.body, /\*\*Ann Smith\*\* published changes to the page "Visit"\./);
    assert.match(
      s.body,
      /\[Open in the Studio\]\(https:\/\/church\.org\/studio\/#\/studio\/intent\/edit\/id=p1;type=page\)/,
    );
    assert.match(s.body, /\[Live page\]\(https:\/\/church\.org\/visit\/\)/);
    assert.doesNotMatch(s.body, /—/, 'no em-dashes in the note');
  });

  it('an unknown author reads as Someone, and drafts get no live link', () => {
    const s = buildChangeSummary({
      from: FROM,
      to: TO,
      siteUrl: 'https://church.org',
      docs: [doc('drafts.p2', 'page', { title: 'Draft only', slug: { current: 'd' } })],
      pathFor: () => '/d',
    });
    assert.match(s.body, /\*\*Someone\*\* started a new page "Draft only" \(not published yet\)\./);
    assert.doesNotMatch(s.body, /Live page/);
  });
});

describe('helpers', () => {
  it('authorsFromTransactions keeps the newest author per published id', () => {
    const a = authorsFromTransactions([
      { timestamp: '2026-10-18T01:00:00Z', author: 'pOld', documentIDs: ['drafts.a'] },
      { timestamp: '2026-10-18T02:00:00Z', author: 'pNew', documentIDs: ['a', 'b'] },
      { timestamp: '2026-10-18T03:00:00Z', documentIDs: ['b'] },
    ]);
    assert.deepEqual(a, { a: 'pNew', b: 'pNew' });
  });
  it('parseNdjson skips blank and torn lines', () => {
    assert.deepEqual(parseNdjson('{"a":1}\n\n{bad\n{"b":2}\n'), [{ a: 1 }, { b: 2 }]);
  });
  it('humanType, describeChange, studioEditUrl, windowFor, issueTitle', () => {
    assert.equal(humanType('journalEntry'), 'journal entry');
    assert.equal(describeChange('trashed', 'page', '"X"'), 'moved the page "X" to the Trash');
    assert.equal(
      studioEditUrl('https://a.org/', 'x y', 'page'),
      'https://a.org/studio/#/studio/intent/edit/id=x%20y;type=page',
    );
    assert.deepEqual(windowFor(new Date(TO)), { from: FROM, to: TO });
    assert.equal(issueTitle('2026-10-18T10:00:00Z'), 'What changed on Sunday, October 18, 2026');
  });
  it('siteFromAstroConfig reads the site: line', () => {
    assert.equal(
      siteFromAstroConfig(`export default { site: 'https://a.org/', x: 1 }`),
      'https://a.org',
    );
    assert.equal(siteFromAstroConfig('nothing'), null);
  });
});
