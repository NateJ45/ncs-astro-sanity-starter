// Safe to edit by hand
// Pins the page-builder guardrails (PORTS.md card 109). Every result here is a
// WARNING in the Studio, never an error, so none of it can block Publish.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pageWarnings, type PageRules } from './page-guardrails.ts';
import { example } from './authoring.ts';

const CHECKS = { selfFillingSections: ['spacerSection', 'syncedSection'], extraSettingKeys: [] };
const RULES: PageRules = {
  appliesTo: ['page'],
  mustStartWith: ['heroSection'],
  atMostOnce: ['heroSection'],
  maxSections: 3,
};

const hero = (key: string, headline = 'Welcome') => ({ _type: 'heroSection', _key: key, headline });
const text = (key: string, heading = '') => ({
  _type: 'richTextSection',
  _key: key,
  heading,
  width: 'normal',
});

const messages = (sections: unknown, docType = 'page', rules = RULES) =>
  pageWarnings(sections, docType, rules, CHECKS);

describe('built-in warnings', () => {
  it('says nothing about a well-built page', () => {
    assert.deepEqual(messages([hero('a'), text('b', 'About us')]), []);
  });

  it('flags an empty section, pointing at that section', () => {
    const [w] = messages([hero('a'), text('b')]);
    assert.match(w.message, /rich text section is empty/);
    assert.deepEqual(w.path, [{ _key: 'b' }]);
  });

  it('does not count a setting as words, and skips self-filling sections', () => {
    assert.equal(messages([hero('a'), { _type: 'spacerSection', _key: 's' }]).length, 0);
    assert.equal(messages([hero('a'), text('b')]).length, 1, 'width alone is not content');
  });

  it('flags example text left over from a template', () => {
    const [w] = messages([hero('a', example('Your headline'))]);
    assert.match(w.message, /example text/);
    assert.deepEqual(w.path, [{ _key: 'a' }]);
  });

  it('flags a synced section with nothing picked, and not one with a pick', () => {
    const empty = { _type: 'syncedSection', _key: 's' };
    const picked = { _type: 'syncedSection', _key: 't', preset: { _ref: 'abc' } };
    const out = messages([hero('a'), empty, picked]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].path, [{ _key: 's' }]);
  });

  it('tolerates junk and an empty or missing list', () => {
    assert.deepEqual(messages(undefined), []);
    assert.deepEqual(messages([]), []);
    assert.deepEqual(messages(['x', null, 3]), []);
  });
});

describe('site rules from kit.config.ts', () => {
  it('asks for the opening section the site wants', () => {
    const out = messages([text('b', 'Hello')]);
    assert.equal(out.length, 1);
    assert.match(out[0].message, /usually open with a hero section/);
    assert.deepEqual(out[0].path, []);
  });

  it('points at the second of a once-per-page section', () => {
    const out = messages([hero('a'), hero('b')]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].path, [{ _key: 'b' }]);
  });

  it('suggests splitting a long page', () => {
    const out = messages([hero('a'), text('b', '1'), text('c', '2'), text('d', '3')]);
    assert.equal(out.length, 1);
    assert.match(out[0].message, /4 sections/);
  });

  it('only applies to the listed page types', () => {
    assert.deepEqual(messages([text('b', 'Hello'), hero('a'), hero('c')], 'homePage'), []);
  });

  it('applies nothing when the site sets no rules', () => {
    assert.deepEqual(messages([text('b', 'Hi')], 'page', { appliesTo: ['page'] }), []);
  });
});
