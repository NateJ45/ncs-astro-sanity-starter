import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSectionVisibility } from './sectionVisibility.ts';

// Two rules, one per kind of route (see sectionVisibility.ts):
//   core route (journal) -> unset counts as VISIBLE, only `false` hides it
//   module route         -> unset counts as HIDDEN, only `true` shows it
// The module rule is the one that keeps a fresh clone from linking to nine
// routes it never builds.

const MODULE_KEYS = [
  'portfolio',
  'shop',
  'eDesign',
  'giftCertificates',
  'press',
  'resources',
  'guides',
  'styleQuiz',
  'budgetCalculator',
] as const;

test('null input: the core route is on, every module route is off', () => {
  const v = getSectionVisibility(null);
  assert.equal(v.journal, true);
  for (const key of MODULE_KEYS) assert.equal(v[key], false, `${key} should default off`);
});

test('undefined input behaves the same as null', () => {
  const v = getSectionVisibility(undefined);
  assert.equal(v.journal, true);
  assert.equal(v.portfolio, false);
});

test('empty object: unset means on for core, off for modules', () => {
  const v = getSectionVisibility({});
  assert.equal(v.journal, true);
  assert.equal(v.portfolio, false);
  assert.equal(v.shop, false);
});

test('explicit false hides the core route', () => {
  const v = getSectionVisibility({ showJournal: false });
  assert.equal(v.journal, false);
});

test('explicit true shows a module route', () => {
  const v = getSectionVisibility({ showShop: true });
  assert.equal(v.shop, true);
  // and does not turn its neighbours on
  assert.equal(v.portfolio, false);
  assert.equal(v.press, false);
});

test('explicit false on a module route keeps it off', () => {
  const v = getSectionVisibility({ showPortfolio: false });
  assert.equal(v.portfolio, false);
});

test('a null field value is not `true`, so a module route stays off', () => {
  const v = getSectionVisibility({ showPortfolio: null });
  assert.equal(v.portfolio, false);
});

test('a null field value is not `false`, so the core route stays on', () => {
  const v = getSectionVisibility({ showJournal: null });
  assert.equal(v.journal, true);
});

test('all ten fields map correctly when every one is set on', () => {
  const v = getSectionVisibility({
    showPortfolio: true,
    showJournal: true,
    showShop: true,
    showEDesign: true,
    showGiftCertificates: true,
    showPress: true,
    showResources: true,
    showGuides: true,
    showStyleQuiz: true,
    showBudgetCalculator: true,
  });
  assert.equal(v.journal, true);
  for (const key of MODULE_KEYS) assert.equal(v[key], true, `${key} should be on`);
});

test('all ten fields map correctly when every one is set off', () => {
  const v = getSectionVisibility({
    showPortfolio: false,
    showJournal: false,
    showShop: false,
    showEDesign: false,
    showGiftCertificates: false,
    showPress: false,
    showResources: false,
    showGuides: false,
    showStyleQuiz: false,
    showBudgetCalculator: false,
  });
  assert.equal(v.journal, false);
  for (const key of MODULE_KEYS) assert.equal(v[key], false, `${key} should be off`);
});
