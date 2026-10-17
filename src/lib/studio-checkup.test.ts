// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Checkup rules (src/lib/studio-checkup.ts): each generic rule finds what it
// should, stays quiet when all is well, and one broken rule never stops the rest.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countBySeverity,
  defaultNameOf,
  genericRules,
  isAllClear,
  listNames,
  runCheckup,
  unconfirmedRule,
  type Doc,
} from './studio-checkup.ts';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const typeTitle = (t: string) => ({ page: 'Page', homePage: 'Home page' })[t] ?? t;
const opts = { nameOf: defaultNameOf(typeTitle), typeTitle, now: NOW };
const rules = genericRules({ seoTypes: ['page', 'homePage'] });
const run = (docs: Doc[], r = rules) => runCheckup(docs, r, opts);
const ids = (docs: Doc[]) => run(docs).map((r) => r.id);

const img = (alt?: string) => ({
  _type: 'image',
  asset: { _ref: 'image-abc-10x10-png', _type: 'reference' },
  ...(alt === undefined ? {} : { alt }),
});

describe('generic checkup rules', () => {
  it('finds a picture with no words, inside a page builder, with a deep link', () => {
    const docs: Doc[] = [
      {
        _id: 'p1',
        _type: 'page',
        title: 'Visit',
        seoDescription: 'x',
        sections: [{ _key: 'k1', _type: 'imageBlock', image: img('') }],
      },
    ];
    const [hit] = run(docs).filter((r) => r.id === 'image-no-description');
    assert.ok(hit);
    assert.equal(hit.severity, 'Needs doing');
    assert.deepEqual(hit.target, {
      doc: 'p1',
      type: 'page',
      field: 'sections[_key=="k1"].image',
    });
  });

  it('leaves described pictures and logos alone', () => {
    const docs: Doc[] = [
      { _id: 'siteSettings', _type: 'siteSettings', logo: img() },
      { _id: 'p1', _type: 'page', title: 'A', seoDescription: 'x', hero: img('A doorway') },
    ];
    assert.ok(!ids(docs).includes('image-no-description'));
  });

  it('asks for a Google description on page types only, unless hidden from search', () => {
    const docs: Doc[] = [
      { _id: 'homePage', _type: 'homePage' },
      { _id: 'p2', _type: 'page', title: 'Hidden', hideFromSearch: true },
      { _id: 'a1', _type: 'announcement', title: 'Not a page' },
    ];
    const hit = run(docs).find((r) => r.id === 'seo-missing');
    assert.ok(hit);
    assert.match(hit.label, /^1 page /);
    assert.equal(hit.target && 'field' in hit.target ? hit.target.field : '', 'seoDescription');
  });

  it('finds a reference to something unpublished, but not image assets or weak refs', () => {
    const base: Doc = { _id: 'p1', _type: 'page', title: 'A', seoDescription: 'x' };
    const ok: Doc[] = [
      { ...base, hero: img('x'), weak: { _ref: 'gone', _weak: true } },
      { _id: 'nav', _type: 'nav', links: [{ _key: 'a', page: { _ref: 'p1' } }] },
    ];
    assert.ok(!ids(ok).includes('link-to-missing'));
    const bad: Doc[] = [...ok, { _id: 'nav2', _type: 'nav', link: { _ref: 'drafts-only' } }];
    assert.ok(ids(bad).includes('link-to-missing'));
  });

  it('splits drafts into old (worth a look) and recent (for information)', () => {
    const docs: Doc[] = [
      { _id: 'drafts.a', _type: 'page', title: 'Old', _updatedAt: '2026-09-01T00:00:00Z' },
      { _id: 'drafts.b', _type: 'page', title: 'New', _updatedAt: '2026-10-16T00:00:00Z' },
    ];
    const res = run(docs);
    const old = res.find((r) => r.id === 'old-drafts');
    const recent = res.find((r) => r.id === 'unpublished-changes');
    assert.equal(old?.severity, 'Worth a look');
    assert.equal(recent?.severity, 'For information');
    assert.deepEqual(old?.target, { doc: 'a', type: 'page' });
  });

  it('reports the last publish and the Trash for information only', () => {
    const docs: Doc[] = [
      {
        _id: 'p1',
        _type: 'page',
        title: 'A',
        seoDescription: 'x',
        _updatedAt: '2026-10-16T09:00:00Z',
      },
      { _id: 't1', _type: 'trashedItem', title: 'Old notice' },
    ];
    const res = run(docs);
    assert.ok(isAllClear(res));
    assert.match(res.find((r) => r.id === 'last-publish')?.label ?? '', /yesterday/);
    assert.match(res.find((r) => r.id === 'things-in-trash')?.label ?? '', /^1 thing /);
  });

  it('sorts by severity and counts for the Home card', () => {
    const docs: Doc[] = [
      { _id: 'homePage', _type: 'homePage', hero: img('') },
      { _id: 'drafts.x', _type: 'page', title: 'X', _updatedAt: '2026-10-17T00:00:00Z' },
    ];
    const res = run(docs);
    assert.equal(res[0].severity, 'Needs doing');
    const counts = countBySeverity(res);
    assert.equal(counts['Needs doing'], 1);
    assert.equal(counts['Worth a look'], 1);
    assert.ok(!isAllClear(res));
  });
});

describe('unconfirmed facts', () => {
  it('finds the marker in text and an unticked confirmed box', () => {
    const r = [unconfirmedRule()];
    const docs: Doc[] = [
      {
        _id: 'a',
        _type: 'page',
        title: 'Times',
        body: [
          { _type: 'block', children: [{ _type: 'span', text: 'Sunday 11am (to be confirmed)' }] },
        ],
      },
      { _id: 'b', _type: 'event', title: 'Picnic', confirmed: false },
      { _id: 'c', _type: 'event', title: 'Fine', confirmed: true },
      { _id: 'd', _type: 'x', title: 'Address', address: { street: '1', confirmed: true } },
    ];
    const [hit] = run(docs, r);
    assert.equal(hit.id, 'unconfirmed-facts');
    assert.match(hit.label, /^2 pages /);
    assert.match(hit.detail, /Times and Picnic/);
  });

  it('finds unticked boxes nested in objects and arrays, and *Confirmed flags', () => {
    const r = [unconfirmedRule()];
    const one = (doc: Doc) => run([doc], r).length;
    assert.equal(one({ _id: 's', _type: 'siteSettings', address: { confirmed: false } }), 1);
    assert.equal(one({ _id: 's', _type: 'siteSettings', phoneConfirmed: false }), 1);
    assert.equal(
      one({ _id: 's', _type: 'siteSettings', serviceTimes: [{ _key: 'a', confirmed: false }] }),
      1,
    );
    assert.equal(one({ _id: 's', _type: 'siteSettings', phoneConfirmed: true }), 0);
  });
});

describe('robustness and wording', () => {
  it('a rule that throws is skipped', () => {
    const boom = {
      id: 'boom',
      run: () => {
        throw new Error('x');
      },
    };
    assert.deepEqual(run([], [boom]), []);
  });

  it('lists names plainly', () => {
    assert.equal(listNames(['a']), 'a');
    assert.equal(listNames(['a', 'b', 'c']), 'a, b and c');
    assert.equal(listNames(['a', 'b', 'c', 'd', 'e', 'f'], 4), 'a, b, c, d and 2 more');
  });

  it('no finding uses an em-dash', () => {
    const docs: Doc[] = [
      { _id: 'homePage', _type: 'homePage', hero: img(''), x: { _ref: 'gone' } },
      { _id: 'drafts.a', _type: 'page', _updatedAt: '2026-01-01T00:00:00Z' },
      { _id: 't', _type: 'trashedItem', confirmed: false },
    ];
    for (const r of run(docs, [...rules, unconfirmedRule()])) {
      assert.ok(!`${r.label} ${r.detail}`.includes('—'), r.id);
    }
  });
});
