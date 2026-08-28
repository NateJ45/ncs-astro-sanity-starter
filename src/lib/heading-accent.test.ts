import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitHeadingAccent } from './heading-accent.ts';
import { hasInlineRich, inlineRichRuns } from './inline-rich.ts';
import { splitScriptAccent } from './scriptAccent.ts';

// The invisible run Sanity's stega encoder hides inside a preview string. Two
// of the ranges plain() strips, so a test that only used one would pass for the
// wrong reason.
const STEGA = '​\u{E0041}\u{E0042}﻿';

describe('splitHeadingAccent', () => {
  it('does nothing when no accent word is set', () => {
    const r = splitHeadingAccent('Work that earns the second look.');
    assert.equal(r.found, false);
    assert.equal(r.heading, 'Work that earns the second look.');
  });

  it('does nothing when the accent word is not in the heading', () => {
    assert.equal(splitHeadingAccent('How we work', 'pricing').found, false);
  });

  it('splits around the FIRST occurrence and leaves the rest alone', () => {
    const r = splitHeadingAccent('Detail, and detail again', 'detail');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'Detail');
    assert.equal(r.after, ', and detail again');
  });

  it('matches case-insensitively but keeps the heading own casing', () => {
    const r = splitHeadingAccent('Craft upon craft', 'CRAFT');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'Craft');
  });

  // THE regression this helper exists for. In the Presentation preview both
  // strings arrive with an invisible marker run inside them; a plain indexOf
  // then never matches and the accent silently does nothing in preview only.
  it('still matches when either side is stega-encoded', () => {
    const r = splitHeadingAccent(`Built for real${STEGA} people`, `real${STEGA}`);
    assert.equal(r.found, true);
    assert.equal(r.word, 'real');
    assert.equal(r.before, 'Built for ');
    assert.equal(r.after, ' people');
    // The rendered halves are clean, so no marker leaks into the page.
    assert.ok(!(r.before + r.word + r.after).includes('​'));
  });

  // The two accent devices are siblings, and the house rule is one per heading.
  // SectionHeading.astro enforces it by checking the script accent first; this
  // records that they really can both fire on the same string, which is what
  // makes the precedence in that component load-bearing rather than decorative.
  it('can fire on the same heading the script accent does', () => {
    assert.equal(splitScriptAccent('One clear promise', 'promise').found, true);
    assert.equal(splitHeadingAccent('One clear promise', 'promise').found, true);
  });
});

describe('inline rich twins', () => {
  const filled = [
    {
      _type: 'block',
      children: [
        { _type: 'span', text: 'Two weeks, ', marks: [] },
        { _type: 'span', text: 'start to finish', marks: ['em'] },
        { _type: 'span', text: '.', marks: [] },
      ],
    },
  ];

  it('treats undefined, an empty array and a blank block as empty', () => {
    assert.equal(hasInlineRich(undefined), false);
    assert.equal(hasInlineRich([]), false);
    assert.equal(
      hasInlineRich([{ _type: 'block', children: [{ _type: 'span', text: '  ' }] }]),
      false,
    );
  });

  it('sees text', () => {
    assert.equal(hasInlineRich(filled), true);
  });

  it('flattens to runs carrying only bold and italic', () => {
    const runs = inlineRichRuns(filled);
    assert.equal(runs.length, 3);
    assert.deepEqual(runs[1], { text: 'start to finish', strong: false, em: true });
    assert.equal(runs.map((r) => r.text).join(''), 'Two weeks, start to finish.');
  });

  it('ignores a mark the schema does not allow rather than throwing', () => {
    const runs = inlineRichRuns([
      { _type: 'block', children: [{ _type: 'span', text: 'x', marks: ['someAnnotationKey'] }] },
    ]);
    assert.deepEqual(runs, [{ text: 'x', strong: false, em: false }]);
  });
});
