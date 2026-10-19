// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// "Before you publish" and the example-text and llms rules (PORTS.md card 123).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { genericRules, type Doc } from './studio-checkup.ts';
import {
  exampleTextIn,
  exampleTextRule,
  forDocument,
  llmsRules,
  llmsUpdatedAt,
} from './studio-prepublish.ts';
import { runCheckup } from './studio-checkup.ts';
import { qualityRules } from './studio-checkup-quality.ts';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const opts = {
  nameOf: (d: Doc) => String(d.title ?? d._id),
  typeTitle: (t: string) => t,
  now: NOW,
};
const rules = [
  ...genericRules({ seoTypes: ['page'] }),
  exampleTextRule(),
  ...llmsRules({ pageTypes: ['page'] }),
];
const IMG = { _type: 'image', asset: { _ref: 'image-abc-10x10-jpg' } };

describe('example text', () => {
  it('finds a field or a Portable Text block that still starts "Example:"', () => {
    assert.equal(exampleTextIn({ headline: 'Example: Welcome' }), 'headline');
    assert.equal(
      exampleTextIn({
        pageBuilder: [
          {
            _key: 's1',
            body: [
              { _key: 'b1', _type: 'block', children: [{ _type: 'span', text: 'Example: Text' }] },
            ],
          },
        ],
      }),
      'pageBuilder[_key=="s1"].body[_key=="b1"]',
    );
    assert.equal(exampleTextIn({ headline: 'For example: no' }), null);
  });
});

describe('before you publish', () => {
  const published: Doc = {
    _id: 'p1',
    _type: 'page',
    title: 'Visit',
    seoDescription: 'Come and see us.',
    hero: { ...IMG, alt: 'The front door' },
  };

  it('checks the draft as if it were published, with the field for each finding', () => {
    const draft: Doc = {
      ...published,
      _id: 'drafts.p1',
      seoDescription: '',
      hero: { ...IMG },
      headline: 'Example: Welcome',
    };
    const found = forDocument([published, draft], rules, draft, opts);
    const byRule = Object.fromEntries(found.map((f) => [f.ruleId, f]));
    assert.equal(byRule['image-no-description']?.field, 'hero');
    assert.equal(byRule['seo-missing']?.field, 'seoDescription');
    assert.equal(byRule['example-text']?.field, 'headline');
    // Site-wide notes never show here, even though there is a draft.
    assert.equal(byRule['unpublished-changes'], undefined);
  });

  it('says nothing about other documents', () => {
    const other: Doc = { _id: 'p2', _type: 'page', title: 'Other', hero: { ...IMG } };
    assert.deepEqual(forDocument([published, other], rules, published, opts), []);
  });

  it('reports a link to something that is only a draft', () => {
    const linking: Doc = {
      _id: 'p3',
      _type: 'page',
      title: 'Linking',
      seoDescription: 'x',
      cta: { _type: 'reference', _ref: 'p4' },
    };
    const onlyDraft: Doc = { _id: 'drafts.p4', _type: 'page', title: 'New' };
    const found = forDocument([linking, onlyDraft], rules, linking, opts);
    assert.deepEqual(
      found.map((f) => f.ruleId),
      ['link-to-missing'],
    );
  });

  it('picks up the link and heading rules (card 122) with no change to the panel', () => {
    const draft: Doc = {
      _id: 'drafts.p5',
      _type: 'page',
      title: 'Groups',
      seoDescription: 'Small groups.',
      slug: { current: 'groups' },
      cta: { href: '/nowhere/' },
      body: [
        { _key: 'a', _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'One' }] },
        { _key: 'b', _type: 'block', style: 'h4', children: [{ _type: 'span', text: 'Two' }] },
      ],
    };
    const found = forDocument(
      [draft],
      [...rules, ...qualityRules({ fixedPaths: ['/'] })],
      draft,
      opts,
    );
    const ids = found.map((f) => f.ruleId);
    assert.ok(ids.includes('heading-skips'), ids.join());
    assert.ok(ids.includes('internal-link-missing'), ids.join());
    assert.equal(found.find((f) => f.ruleId === 'heading-skips')?.field, 'body');
  });

  it('is empty with no document', () => {
    assert.deepEqual(forDocument([], rules, null, opts), []);
  });
});

describe('the files for AI assistants', () => {
  const page: Doc = {
    _id: 'p1',
    _type: 'page',
    title: 'Visit',
    slug: { current: 'visit' },
    _updatedAt: '2026-10-10T00:00:00Z',
  };
  const hidden: Doc = {
    ...page,
    _id: 'p2',
    title: 'Hidden',
    slug: { current: 'secret' },
    hideFromSearch: true,
  };
  const run = (site: { llmsTxt?: string | null; llmsFull?: string | null }) =>
    runCheckup([page, hidden], llmsRules(), { ...opts, site }).map((r) => r.id);

  it('reads the date line', () => {
    assert.equal(
      llmsUpdatedAt('# X\n\nLast updated: 2026-10-01\n'),
      Date.parse('2026-10-01T00:00:00Z'),
    );
    assert.equal(llmsUpdatedAt('# X'), null);
  });

  it('says nothing when the files were not fetched', () => {
    assert.deepEqual(run({}), []);
  });

  it('flags the starter’s words', () => {
    assert.deepEqual(run({ llmsTxt: '- [About](https://example.com/about/)' }), ['llms-template']);
  });

  it('lists pages missing from llms.txt, leaving hidden ones out', () => {
    const found = runCheckup([page, hidden], llmsRules(), {
      ...opts,
      site: { llmsTxt: '- [Home](https://church.org/)' },
    });
    assert.equal(found.length, 1);
    assert.equal(found[0].id, 'llms-pages-missing');
    assert.deepEqual(
      found[0].items?.map((i) => i.name),
      ['Visit'],
    );
    assert.deepEqual(run({ llmsTxt: '- [Visit](https://church.org/visit/)' }), []);
  });

  it('calls the full text old only when it is past the limit AND the site changed since', () => {
    const txt = '- [Visit](https://church.org/visit/)';
    assert.deepEqual(run({ llmsTxt: txt, llmsFull: 'Last updated: 2026-10-15' }), []);
    // Old, but nothing published since: still fine.
    assert.deepEqual(
      runCheckup([page], llmsRules({ maxAgeDays: 1 }), {
        ...opts,
        site: { llmsTxt: txt, llmsFull: 'Last updated: 2026-10-12' },
      }).map((r) => r.id),
      [],
    );
    const oldPage = { ...page, _updatedAt: '2026-10-10T00:00:00Z' };
    const found = runCheckup([oldPage], llmsRules({ maxAgeDays: 30 }), {
      ...opts,
      site: { llmsTxt: txt, llmsFull: 'Last updated: 2026-06-01' },
    });
    assert.deepEqual(
      found.map((r) => r.id),
      ['llms-stale'],
    );
    assert.match(found[0].label, /139 days old/);
    assert.deepEqual(run({ llmsTxt: txt, llmsFull: 'No date here' }), ['llms-stale']);
  });
});
