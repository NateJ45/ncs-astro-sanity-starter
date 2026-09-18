// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPage,
  countFindings,
  hasTypedContent,
  internalPaths,
  normalizePath,
  pageUnits,
  sectionLabel,
  type CheckId,
  type PageCheckConfig,
} from './page-checks.ts';

// A fixture config, not a repo's own: the point of the config object is that
// this file never has to know which repo it is running in.
const CONFIG: PageCheckConfig = {
  sectionArrays: ['pageBuilder', 'extraSections'],
  header: { label: 'Hero (top banner)', fields: ['hero'], checkEmpty: true },
  selfFillingSections: ['teamSection', 'faqSection'],
  codeOwnedPaths: ['events', 'news', 'og'],
};

const img = (ref = 'image-abc-800x600-jpg') => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: ref },
});

const group = (doc: unknown, id: CheckId, slugs: string[] = []) =>
  checkPage(doc, CONFIG, slugs).find((g) => g.id === id)!;

// ── sectionLabel ────────────────────────────────────────────────────────────

test('label turns a suffixed type name into plain words', () => {
  assert.equal(sectionLabel('imageTextSection'), 'Image text');
  assert.equal(sectionLabel('faqSection'), 'Faq');
  assert.equal(sectionLabel('heroObject'), 'Hero');
});

test('label turns a prefixed type name into the same plain words', () => {
  assert.equal(sectionLabel('sectionImageText'), 'Image text');
  assert.equal(sectionLabel('sectionFaqList'), 'Faq list');
  assert.equal(sectionLabel('embed'), 'Embed');
});

// ── pageUnits ───────────────────────────────────────────────────────────────

test('units list the header then each section, numbered as the Studio numbers them', () => {
  const units = pageUnits(
    {
      hero: { headline: 'Hi' },
      pageBuilder: [{ _type: 'richTextSection' }, { _type: 'gallerySection' }],
    },
    CONFIG,
  );
  assert.deepEqual(
    units.map((u) => u.where),
    ['Hero (top banner)', 'Section 1: Rich text', 'Section 2: Gallery'],
  );
});

test('units number straight on across several section arrays', () => {
  const units = pageUnits(
    { pageBuilder: [{ _type: 'quoteSection' }], extraSections: [{ _type: 'ctaBandSection' }] },
    CONFIG,
  );
  assert.deepEqual(
    units.map((u) => u.where),
    ['Section 1: Quote', 'Section 2: Cta band'],
  );
});

test('units survive a page with no header and no sections', () => {
  assert.deepEqual(pageUnits({}, CONFIG), []);
  assert.deepEqual(pageUnits(null, CONFIG), []);
});

test('units skip the header when none of its fields are present', () => {
  const config: PageCheckConfig = {
    ...CONFIG,
    header: { label: 'Hero', fields: ['heroHeadline'] },
  };
  assert.deepEqual(pageUnits({ pageBuilder: [] }, config), []);
});

// ── alt text ────────────────────────────────────────────────────────────────

test('alt flags an image with no description anywhere', () => {
  const found = group(
    { pageBuilder: [{ _type: 'gallerySection', photos: [{ image: img() }] }] },
    'alt',
  );
  assert.deepEqual(found.findings, [
    { where: 'Section 1: Gallery', detail: 'A photo here has no description (alt text).' },
  ]);
});

test('alt accepts all three ways the family models a description', () => {
  const doc = {
    // a hero: `imageAlt` beside `image`
    hero: { image: img(), imageAlt: 'The front door' },
    pageBuilder: [
      // a figure object: `alt` beside `image`
      { _type: 'gallerySection', photos: [{ image: img(), alt: 'A work table' }] },
      // inline: `alt` on the image value itself
      { _type: 'richTextSection', body: [{ ...img(), alt: 'The garden' }] },
    ],
  };
  assert.deepEqual(group(doc, 'alt').findings, []);
});

test('alt counts several bare photos in one section as one finding', () => {
  const found = group(
    {
      pageBuilder: [
        { _type: 'gallerySection', photos: [{ image: img('a') }, { image: img('b') }] },
      ],
    },
    'alt',
  );
  assert.equal(found.findings.length, 1);
  assert.match(found.findings[0].detail, /2 photos/);
});

test('alt does not count whitespace as a description', () => {
  const found = group(
    { pageBuilder: [{ _type: 'gallerySection', image: img(), alt: '   ' }] },
    'alt',
  );
  assert.equal(found.findings.length, 1);
});

// ── empty sections ──────────────────────────────────────────────────────────

test('empty flags a section with no words in it', () => {
  const found = group({ pageBuilder: [{ _type: 'richTextSection', _key: 'k1' }] }, 'empty');
  assert.deepEqual(found.findings, [
    {
      where: 'Section 1: Rich text',
      detail: 'Nothing is typed in this one yet, so it may show up blank.',
    },
  ]);
});

test('empty does not count settings or ids as words', () => {
  const doc = {
    pageBuilder: [
      { _type: 'ctaBandSection', _key: 'k1', variant: 'wide', tone: 'warm', align: 'center' },
    ],
  };
  assert.equal(group(doc, 'empty').findings.length, 1);
});

test('empty counts words nested deep inside the section', () => {
  const doc = {
    pageBuilder: [
      {
        _type: 'richTextSection',
        body: [{ _type: 'block', children: [{ _type: 'span', text: 'Welcome!' }] }],
      },
    ],
  };
  assert.deepEqual(group(doc, 'empty').findings, []);
});

test('empty skips the sections that fill themselves from a list', () => {
  const doc = { pageBuilder: [{ _type: 'teamSection' }, { _type: 'faqSection' }] };
  assert.deepEqual(group(doc, 'empty').findings, []);
});

test('empty leaves the header alone unless the config asks for it', () => {
  const quiet: PageCheckConfig = { ...CONFIG, header: { label: 'Hero', fields: ['hero'] } };
  const doc = { hero: { image: img() } };
  assert.deepEqual(checkPage(doc, quiet).find((g) => g.id === 'empty')!.findings, []);
  assert.equal(group(doc, 'empty').findings.length, 1); // CONFIG sets checkEmpty
});

test('empty honours an extra setting key from the config', () => {
  const doc = { pageBuilder: [{ _type: 'richTextSection', flavour: 'chapel' }] };
  assert.deepEqual(group(doc, 'empty').findings, []);
  const strict: PageCheckConfig = { ...CONFIG, extraSettingKeys: ['flavour'] };
  assert.equal(checkPage(doc, strict).find((g) => g.id === 'empty')!.findings.length, 1);
});

test('typed-content exposes the same rule on its own', () => {
  assert.equal(hasTypedContent({ _type: 'x', variant: 'a' }), false);
  assert.equal(hasTypedContent({ headline: 'Hello' }), true);
});

// ── normalizePath ───────────────────────────────────────────────────────────

test('paths keep same-site addresses and drop the rest', () => {
  assert.equal(normalizePath('/about'), '/about');
  assert.equal(normalizePath('/about/?ref=x#top'), '/about');
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('https://example.com/about'), null);
  assert.equal(normalizePath('//example.com'), null);
  assert.equal(normalizePath('mailto:hi@example.com'), null);
  assert.equal(normalizePath('#services'), null);
});

test('paths are found wherever they are written', () => {
  assert.deepEqual(
    internalPaths({ href: '/about', buttons: [{ url: '/contact' }], text: 'not a link' }).sort(),
    ['/about', '/contact'],
  );
});

// ── links ───────────────────────────────────────────────────────────────────

const linkDoc = {
  pageBuilder: [
    {
      _type: 'ctaBandSection',
      headline: 'Come and see',
      buttons: [{ href: '/contact' }, { href: '/nowhere' }],
    },
  ],
};

test('links flag a path no page owns', () => {
  assert.deepEqual(group(linkDoc, 'links', ['home', 'contact']).findings, [
    { where: 'Section 1: Cta band', detail: 'Links to /nowhere, and no page seems to live there.' },
  ]);
});

test('links accept the addresses the site code owns', () => {
  const built = { pageBuilder: [{ _type: 'ctaBandSection', href: '/events/harvest', b: '/news' }] };
  assert.deepEqual(group(built, 'links', ['home']).findings, []);
});

test('links match on the first part, so sub-pages of a real page pass', () => {
  const nested = { pageBuilder: [{ _type: 'ctaBandSection', href: '/services/kitchens' }] };
  assert.deepEqual(group(nested, 'links', ['services']).findings, []);
});

test('links never flag the home page', () => {
  assert.deepEqual(
    group({ pageBuilder: [{ _type: 'ctaBandSection', href: '/' }] }, 'links').findings,
    [],
  );
});

test('links report one finding per distinct address in a section', () => {
  const twice = {
    pageBuilder: [{ _type: 'ctaBandSection', a: '/gone', b: '/gone', c: '/also-gone' }],
  };
  assert.equal(group(twice, 'links').findings.length, 2);
});

// ── the whole pass ──────────────────────────────────────────────────────────

test('the pass always returns the three groups, in order', () => {
  assert.deepEqual(
    checkPage({}, CONFIG).map((g) => g.id),
    ['alt', 'empty', 'links'],
  );
});

test('the pass counts nothing for a page that is in good shape', () => {
  const doc = {
    hero: { headline: 'Welcome', image: img(), imageAlt: 'Our front door' },
    pageBuilder: [{ _type: 'ctaBandSection', headline: 'Get in touch', href: '/contact' }],
  };
  assert.equal(countFindings(checkPage(doc, CONFIG, ['home', 'contact'])), 0);
});
