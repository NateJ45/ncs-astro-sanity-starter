import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isReservedSlug, RESERVED_SLUGS } from './reservedSlugs.ts';

test('isReservedSlug returns true for every known reserved slug', () => {
  for (const slug of RESERVED_SLUGS) {
    assert.equal(isReservedSlug(slug), true, `expected ${slug} to be reserved`);
  }
});

test('isReservedSlug returns false for a custom slug', () => {
  assert.equal(isReservedSlug('studio-tour'), false);
  assert.equal(isReservedSlug('my-portfolio'), false);
  assert.equal(isReservedSlug('team'), false);
});

// 2026-09-18. The list used to reserve seventeen names, seven of them routes
// the starter has never built: they belonged to opt-in modules, and eleven of
// those modules now live in archive/modules/. Reserving a route nothing serves
// refuses an editor's page for a collision that cannot happen, so these are
// pinned as FREE. A module coming back out of the archive puts its slug back
// (archive/README.md step 3) and this test moves with it.
test('a route the starter does not serve is not reserved', () => {
  for (const slug of ['portfolio', 'shop', 'press', 'resources', 'guides', 'quiz', 'calculator']) {
    assert.equal(isReservedSlug(slug), false, `${slug} should be free`);
  }
});

// THE SECOND COPY. src/pages/[slug].astro repeats this list inside
// getStaticPaths, and it has to: CLAUDE.md rule 10 says a guard lifted out of
// that function silently stops working, because Astro runs it in an isolated
// scope. A hand-kept copy with a "keep in sync" comment over it is exactly what
// went stale here, so the copy is now re-derived from the .astro source and
// compared, the same way layout-variants.test.ts reads a grid's base columns
// out of its component.
test('the copy of the list inside getStaticPaths matches this one', () => {
  const src = readFileSync(new URL('../pages/[slug].astro', import.meta.url), 'utf8');
  const body = src.match(/const RESERVED = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(body, '[slug].astro no longer declares `const RESERVED = new Set([...])`');
  const copied = [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(
    copied.slice().sort(),
    [...RESERVED_SLUGS].sort(),
    'src/pages/[slug].astro and src/lib/reservedSlugs.ts disagree',
  );
});

// The other half of the same rule: every slug that IS reserved has a page file
// behind it. This is the gate that would have caught the seven dead entries.
test('every reserved slug is a route this repo serves, a scaffolded one, or a build artefact', () => {
  const served = new Set([
    'about',
    'services',
    'process',
    'faq',
    'journal',
    'contact',
    'privacy',
    '404',
    // Served, but never for visitors: the fixed-data design-system wall the
    // visual suite screenshots. Reserved so a custom page cannot shadow it.
    'styleguide',
  ]);
  // Not pages: two are emitted by the build, one is the asset directory.
  const artefacts = new Set(['sitemap-index.xml', 'og', '_astro']);
  for (const slug of RESERVED_SLUGS) {
    assert.ok(
      served.has(slug) || artefacts.has(slug),
      `${slug} is reserved but nothing serves it; see the two rules in reservedSlugs.ts`,
    );
  }
});

test('isReservedSlug returns false for null and undefined', () => {
  assert.equal(isReservedSlug(null), false);
  assert.equal(isReservedSlug(undefined), false);
});

test('isReservedSlug is case-sensitive (slugs are lowercase by schema rule)', () => {
  assert.equal(isReservedSlug('About'), false);
  assert.equal(isReservedSlug('ABOUT'), false);
});
