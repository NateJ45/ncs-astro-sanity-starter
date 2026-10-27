// Safe to edit by hand
// Checks the Page layouts scripts/main-pages-builder.mjs would write (card 190).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plans, defined, PAGE_IDS } from './main-pages-plan.mjs';

const types = (sections) => sections.map((s) => s._type);

describe('main-pages-plan', () => {
  it('covers contact, privacy and journal', () => {
    assert.deepEqual(PAGE_IDS, ['contactPage', 'privacyPage', 'journalPage']);
  });

  it('contact: banner from the hero fields, then the form block', () => {
    const out = plans.contactPage({
      heroHeadline: 'Say hello',
      heroEyebrow: 'Hi',
      heroSubhead: 'x',
    });
    assert.deepEqual(types(out), ['heroSection', 'contactFormSection']);
    assert.equal(out[0].headline, 'Say hello');
    assert.equal(out[0].size, 'short');
    assert.equal(out[1].sidebar, true);
  });

  it('uses the page fallbacks when the document has no hero words', () => {
    const out = plans.contactPage({});
    assert.equal(out[0].headline, 'Start the Conversation.');
    assert.equal(out[0].eyebrow, 'Request a Consultation.');
  });

  it('privacy: moves the body and the date into the policy block', () => {
    const body = [{ _type: 'block', _key: 'b1', children: [] }];
    const out = plans.privacyPage({ lastUpdated: '2026-01-02', body });
    assert.deepEqual(types(out), ['heroSection', 'privacyPolicySection']);
    assert.equal(out[1].lastUpdated, '2026-01-02');
    assert.equal(out[1].body, body);
  });

  it('journal: banner, posts, then a closing band only when it had a headline', () => {
    const plain = plans.journalPage({});
    assert.deepEqual(types(plain), ['heroSection', 'journalPostsSection']);
    const withCta = plans.journalPage({
      finalCtaHeadline: 'Got a project?',
      finalCta: { label: 'Go' },
    });
    assert.deepEqual(types(withCta), ['heroSection', 'journalPostsSection', 'ctaBandSection']);
    assert.equal(withCta[2].cta.label, 'Go');
  });

  it('every section has a type and a unique key, and no null fields', () => {
    for (const id of PAGE_IDS) {
      const out = plans[id]({ finalCtaHeadline: 'x', lastUpdated: null });
      const keys = out.map((s) => s._key);
      assert.equal(new Set(keys).size, keys.length);
      for (const s of out) {
        assert.ok(s._type && s._key);
        assert.ok(
          Object.values(s).every((v) => v != null),
          `${id}: a null field in ${s._type}`,
        );
      }
    }
  });

  it('defined drops null and undefined only', () => {
    assert.deepEqual(defined({ a: 0, b: '', c: null, d: undefined, e: false }), {
      a: 0,
      b: '',
      e: false,
    });
  });
});
