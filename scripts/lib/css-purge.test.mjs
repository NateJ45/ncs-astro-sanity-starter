// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The page CSS purge must only ever drop rules that cannot match (css-purge.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canMatch, parseBlocks, purgeCss, splitList, unescapeIdent } from './css-purge.mjs';

const present = (...names) => {
  const set = new Set(names);
  return (c) => set.has(c);
};

describe('reading CSS', () => {
  it('splits top-level rules, at-rules and statements', () => {
    const items = parseBlocks('@layer a,b;.x{color:red}@media (min-width:1px){.y{color:blue}}');
    assert.deepEqual(
      items.map((i) => i.kind),
      ['stmt', 'rule', 'at'],
    );
  });
  it('ignores braces inside strings and escapes', () => {
    const items = parseBlocks('.a::before{content:"}{"}.b\\{{color:red}');
    assert.equal(items.length, 2);
  });
  it('splits a selector list only at top-level commas', () => {
    assert.deepEqual(splitList('.a, .b:is(.c, .d), [x="1,2"]'), [
      '.a',
      '.b:is(.c, .d)',
      '[x="1,2"]',
    ]);
  });
  it('undoes identifier escapes', () => {
    assert.equal(unescapeIdent('md\\:grid-cols-2'), 'md:grid-cols-2');
    assert.equal(unescapeIdent('\\32 xl\\:p-4'), '2xl:p-4');
    assert.equal(unescapeIdent('\\[\\&_a\\]\\:underline'), '[&_a]:underline');
  });
});

describe('canMatch', () => {
  it('needs every class of a compound selector', () => {
    assert.equal(canMatch('.a .b', present('a', 'b')), true);
    assert.equal(canMatch('.a .b', present('a')), false);
  });
  it('keeps rules with no class at all', () => {
    assert.equal(canMatch('main > p', present()), true);
    assert.equal(canMatch(':root', present()), true);
    assert.equal(canMatch('[data-state=open]', present()), true);
  });
  it('asks nothing of :not()', () => {
    assert.equal(canMatch('.a:not(.gone)', present('a')), true);
  });
  it(':is and :where need one branch', () => {
    assert.equal(canMatch('.a:where(.dark, .dark *)', present('a')), false);
    assert.equal(canMatch(':is(.x, .y) .a', present('a', 'y')), true);
  });
  it('reads escaped brackets as part of a class name, not as an attribute selector', () => {
    const sel =
      ':is(.\\*\\*\\:data-\\[slot\\=accordion-trigger-icon\\]\\:size-4 *)[data-slot=accordion-trigger-icon]';
    assert.equal(canMatch(sel, present('**:data-[slot=accordion-trigger-icon]:size-4')), true);
    assert.equal(canMatch(sel, present('**:data-:size-4')), false);
  });
  it('does not read dots inside attribute values as classes', () => {
    assert.equal(canMatch('a[href$=".pdf"]', present()), true);
  });
});

describe('purgeCss', () => {
  it('drops dead rules, trims dead selectors, keeps the rest', () => {
    const css =
      '.keep{color:red}.gone{color:blue}.keep,.gone2{margin:0}@media (min-width:1px){.gone{x:1}}@font-face{font-family:x}@keyframes k{0%{opacity:0}}';
    assert.equal(
      purgeCss(css, present('keep')),
      '.keep{color:red}.keep{margin:0}@font-face{font-family:x}@keyframes k{0%{opacity:0}}',
    );
  });
  it('keeps an emptied @layer, which fixes the layer order', () => {
    assert.equal(purgeCss('@layer base{.gone{x:1}}', present()), '@layer base{}');
  });
  it('changes nothing when every class is present', () => {
    const css = '.a{x:1}@media (min-width:1px){.b:hover{y:2}}@supports (x:y){.c{z:3}}';
    assert.equal(
      purgeCss(css, () => true),
      css,
    );
  });
});
