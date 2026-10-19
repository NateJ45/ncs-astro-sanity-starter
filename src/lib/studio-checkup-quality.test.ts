// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Checkup links, headings and hidden pages (src/lib/studio-checkup-quality.ts,
// card 122): each rule finds what it should, names the page with a Fix-it item,
// and stays quiet when all is well.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultNameOf, genericRules, runCheckup, type Doc } from './studio-checkup.ts';
import {
  LINK_REPORT_ID,
  LINK_REPORT_TYPE,
  normaliseInternal,
  qualityRules,
} from './studio-checkup-quality.ts';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const typeTitle = (t: string) => ({ page: 'Page', siteSettings: 'Site settings' })[t] ?? t;
const opts = { nameOf: defaultNameOf(typeTitle), typeTitle, now: NOW };
const rules = qualityRules({
  fixedPaths: ['/', '/about/', '/contact/'],
  seoTypes: ['page'],
});
/** The Fix-it item's target, read loosely (StudioTarget is a union). */
const tgt = (r: { items?: Array<{ target: unknown }> } | undefined, i: number) =>
  r?.items?.[i]?.target as { doc?: string; field?: string } | undefined;
const run = (docs: Doc[]) => runCheckup(docs, rules, opts);
const find = (docs: Doc[], id: string) => run(docs).find((r) => r.id === id);

const block = (style: string, text: string, link?: string) => ({
  _type: 'block',
  _key: `b-${style}-${text.length}`,
  style,
  markDefs: link ? [{ _key: 'l1', _type: 'link', href: link }] : [],
  children: [{ _type: 'span', _key: 's', text, marks: link ? ['l1'] : [] }],
});

const page = (id: string, slug: string, extra: Record<string, unknown> = {}): Doc => ({
  _id: id,
  _type: 'page',
  title: slug.replace(/-/g, ' '),
  slug: { current: slug },
  addToMainNav: true,
  ...extra,
});

describe('normaliseInternal', () => {
  it('turns typed addresses into the slashed path, and ignores the rest', () => {
    assert.equal(normaliseInternal('/visit'), '/visit/');
    assert.equal(normaliseInternal('/visit/?a=1#x'), '/visit/');
    assert.equal(normaliseInternal('https://x.org/'), null);
    assert.equal(normaliseInternal('//x.org/'), null);
    assert.equal(normaliseInternal('/files/bulletin.pdf'), null);
    assert.equal(normaliseInternal('mailto:a@b.c'), null);
  });
});

describe('dead-external-links (from the weekly report)', () => {
  const report = (checkedAt: string): Doc => ({
    _id: LINK_REPORT_ID,
    _type: LINK_REPORT_TYPE,
    checkedAt,
    dead: [
      {
        url: 'https://gone.example/',
        detail: 'HTTP 404',
        docs: [{ id: 'p1', type: 'page', path: 'pageBuilder[_key=="a"].href' }],
      },
    ],
  });

  it('names the page with the dead link, opening at the field', () => {
    const r = find([page('p1', 'visit'), report('2026-10-13T09:15:00Z')], 'dead-external-links');
    assert.ok(r);
    assert.equal(r.severity, 'Needs doing');
    assert.match(r.detail, /gone\.example/);
    assert.deepEqual(r.items?.[0].target, {
      doc: 'p1',
      type: 'page',
      field: 'pageBuilder[_key=="a"].href',
    });
  });

  it('ignores a report older than three weeks', () => {
    assert.equal(
      find([page('p1', 'visit'), report('2026-09-01T09:15:00Z')], 'dead-external-links'),
      undefined,
    );
  });

  it('a report is not content: it never counts as the last publish', () => {
    const generic = runCheckup(
      [
        { ...page('p1', 'visit'), _updatedAt: '2026-10-01T00:00:00Z' },
        { ...report('2026-10-18T09:00:00Z'), _updatedAt: '2026-10-18T09:00:00Z' },
      ],
      genericRules(),
      opts,
    );
    const last = generic.find((r) => r.id === 'last-publish');
    assert.match(last?.label ?? '', /17 days ago/);
  });
});

describe('internal-link-missing', () => {
  it('finds a typed address no page answers, and accepts real ones', () => {
    const docs: Doc[] = [
      page('p1', 'visit', {
        pageBuilder: [
          { _key: 'a', _type: 'ctaBandSection', href: '/visti' },
          { _key: 'b', _type: 'ctaBandSection', href: '/about' },
          { _key: 'c', _type: 'ctaBandSection', href: '/old-page/' },
          { _key: 'd', _type: 'ctaBandSection', href: '/visit/#times' },
          { _key: 'e', _type: 'ctaBandSection', href: '/bulletin.pdf' },
        ],
      }),
      { _id: 'r1', _type: 'redirect', from: '/old-page', to: '/visit/' },
    ];
    const r = find(docs, 'internal-link-missing');
    assert.ok(r);
    assert.match(r.detail, /\/visti\//);
    assert.doesNotMatch(r.detail, /about|old-page|bulletin/);
    assert.equal(tgt(r, 0)?.field, 'pageBuilder[_key=="a"].href');
  });

  it('a link to an archived page is missing', () => {
    const docs = [
      page('p1', 'visit', { pageBuilder: [{ _key: 'a', _type: 'x', href: '/gone/' }] }),
      page('p2', 'gone', { archived: true }),
    ];
    assert.ok(find(docs, 'internal-link-missing'));
  });
});

describe('heading-skips', () => {
  it('flags an H4 straight under the section heading, and an H1', () => {
    const skip = page('p1', 'visit', {
      pageBuilder: [{ _key: 'a', _type: 'richTextSection', body: [block('h4', 'Times')] }],
    });
    const h1 = page('p2', 'beliefs', {
      pageBuilder: [{ _key: 'a', _type: 'richTextSection', body: [block('h1', 'Beliefs')] }],
    });
    const r = find([skip, h1], 'heading-skips');
    assert.ok(r);
    assert.equal(r.items?.length, 2);
    assert.equal(tgt(r, 0)?.field, 'pageBuilder[_key=="a"].body');
  });

  it('accepts H2, H3, H3, H2, H3', () => {
    const ok = page('p1', 'visit', {
      body: ['h2', 'h3', 'h3', 'h2', 'h3'].map((s, i) => ({ ...block(s, 'x'), _key: `k${i}` })),
    });
    assert.equal(find([ok], 'heading-skips'), undefined);
  });
});

describe('vague-link-text', () => {
  it('flags "click here", a web address as link words, and an unlinked address', () => {
    for (const b of [
      block('normal', 'Click here', 'https://x.org'),
      block('normal', 'https://x.org/give', 'https://x.org/give'),
      block('normal', 'Give at www.example.org today'),
    ]) {
      const r = find([page('p1', 'visit', { body: [b] })], 'vague-link-text');
      assert.ok(r, JSON.stringify(b.children));
    }
  });

  it('flags a button labelled "Read more"', () => {
    const r = find(
      [page('p1', 'visit', { cta: { label: 'Read more', href: '/about/' } })],
      'vague-link-text',
    );
    assert.equal(tgt(r, 0)?.field, 'cta.label');
  });

  it('accepts link words that say where they go', () => {
    const b = block('normal', 'Our service times', '/visit/');
    assert.equal(find([page('p1', 'visit', { body: [b] })], 'vague-link-text'), undefined);
  });
});

describe('seo-too-long', () => {
  it('flags a long Google title or description, not a hidden page', () => {
    const long = page('p1', 'visit', { seoTitle: 'x'.repeat(61) });
    const longDesc = page('p2', 'about-us', { seoDescription: 'x'.repeat(161) });
    const hidden = page('p3', 'staff', { seoTitle: 'x'.repeat(80), hideFromSearch: true });
    const r = find([long, longDesc, hidden], 'seo-too-long');
    assert.equal(r?.items?.length, 2);
    assert.deepEqual(
      r?.items?.map((i) => (i.target as { field?: string }).field),
      ['seoTitle', 'seoDescription'],
    );
  });
});

describe('page-unreachable (orphans)', () => {
  it('finds a page nothing links to, but not a hidden one', () => {
    const lonely = page('p1', 'lonely', { addToMainNav: false });
    const hidden = page('p2', 'staff-only', { addToMainNav: false, hideFromSearch: true });
    const r = find([lonely, hidden], 'page-unreachable');
    assert.equal(r?.items?.length, 1);
    assert.equal(tgt(r, 0)?.doc, 'p1');
  });

  it('a menu reference, a footer switch or a typed link counts as a way in', () => {
    const byRef = page('p1', 'a', { addToMainNav: false });
    const byFooter = page('p2', 'b', { addToMainNav: false, addToFooter: true });
    const byLink = page('p3', 'c', { addToMainNav: false });
    const settings: Doc = {
      _id: 'siteSettings',
      _type: 'siteSettings',
      navItems: [{ _key: 'n', internalPage: { _ref: 'p1', _type: 'reference' } }],
    };
    const linker = page('p4', 'd', { body: [block('normal', 'C page', '/c/')] });
    assert.equal(find([byRef, byFooter, byLink, settings, linker], 'page-unreachable'), undefined);
  });
});

describe('private pages', () => {
  it('flags a private page stored outside the private id path', () => {
    const r = find(
      [{ _id: 'abc', _type: 'privatePage', title: 'Members' }],
      'private-page-exposed',
    );
    assert.equal(r?.severity, 'Needs doing');
    const ok = find(
      [
        { _id: 'privatePage.abc', _type: 'privatePage', title: 'Members' },
        { _id: 'drafts.privatePage.abc', _type: 'privatePage', title: 'Members' },
      ],
      'private-page-exposed',
    );
    assert.equal(ok, undefined);
  });

  it('flags a published private page with no password', () => {
    const r = find(
      [{ _id: 'privatePage.abc', _type: 'privatePage', title: 'Members' }],
      'private-page-no-password',
    );
    assert.equal(tgt(r, 0)?.field, 'password');
    const set = find(
      [
        {
          _id: 'privatePage.abc',
          _type: 'privatePage',
          title: 'Members',
          password: { hash: 'h' },
        },
      ],
      'private-page-no-password',
    );
    assert.equal(set, undefined);
  });
});

describe('all clear', () => {
  it('a tidy site has no findings from these rules', () => {
    const docs: Doc[] = [
      page('p1', 'visit', {
        seoTitle: 'Visit us',
        body: [block('h2', 'Times'), block('normal', 'Our service times', '/visit/')],
      }),
    ];
    assert.deepEqual(run(docs), []);
  });
});
