import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSectionVisibility } from './sectionVisibility.ts';

// The critical rule: unset (undefined/null) counts as VISIBLE.
// Only an explicit `false` hides a section.

test('null input returns all sections visible', () => {
  const v = getSectionVisibility(null);
  assert.equal(v.portfolio, true);
  assert.equal(v.journal, true);
  assert.equal(v.shop, true);
  assert.equal(v.eDesign, true);
  assert.equal(v.giftCertificates, true);
  assert.equal(v.press, true);
  assert.equal(v.resources, true);
  assert.equal(v.guides, true);
  assert.equal(v.styleQuiz, true);
  assert.equal(v.budgetCalculator, true);
});

test('undefined input returns all sections visible', () => {
  const v = getSectionVisibility(undefined);
  assert.equal(v.portfolio, true);
  assert.equal(v.journal, true);
});

test('empty object returns all sections visible (unset = visible)', () => {
  const v = getSectionVisibility({});
  assert.equal(v.portfolio, true);
  assert.equal(v.journal, true);
  assert.equal(v.shop, true);
});

test('explicit false hides the section', () => {
  const v = getSectionVisibility({ showPortfolio: false });
  assert.equal(v.portfolio, false);
});

test('explicit false on one field does not affect others', () => {
  const v = getSectionVisibility({ showJournal: false });
  assert.equal(v.journal, false);
  assert.equal(v.portfolio, true);
  assert.equal(v.shop, true);
});

test('null field value counts as visible (not false)', () => {
  const v = getSectionVisibility({ showPortfolio: null });
  assert.equal(v.portfolio, true);
});

test('explicit true is visible', () => {
  const v = getSectionVisibility({ showShop: true });
  assert.equal(v.shop, true);
});

test('multiple explicit false fields all hidden', () => {
  const v = getSectionVisibility({
    showPortfolio: false,
    showJournal: false,
    showShop: false,
    showEDesign: false,
  });
  assert.equal(v.portfolio, false);
  assert.equal(v.journal, false);
  assert.equal(v.shop, false);
  assert.equal(v.eDesign, false);
  // unset ones remain visible
  assert.equal(v.press, true);
});

test('all ten fields map correctly', () => {
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
  assert.equal(v.portfolio, false);
  assert.equal(v.journal, false);
  assert.equal(v.shop, false);
  assert.equal(v.eDesign, false);
  assert.equal(v.giftCertificates, false);
  assert.equal(v.press, false);
  assert.equal(v.resources, false);
  assert.equal(v.guides, false);
  assert.equal(v.styleQuiz, false);
  assert.equal(v.budgetCalculator, false);
});
