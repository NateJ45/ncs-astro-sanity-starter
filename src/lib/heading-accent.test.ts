import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAccentedWord, splitHeadingAccent, splitHeadingWords } from './heading-accent.ts';
import { hasInlineRich, inlineRichRuns } from './inline-rich.ts';

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
  // Since 2026-09-18 they share this function, so a heading that carries both
  // `scriptAccent` and `headingAccent` pointed at the same word gets the same
  // answer twice. SectionHeading.astro enforces the rule by checking the script
  // accent first, which is what makes that precedence load-bearing rather than
  // decorative: without it the word would be wrapped twice.
  it('answers the same for either accent field on the same heading', () => {
    const asScript = splitHeadingAccent('One clear promise', 'promise');
    const asColour = splitHeadingAccent('One clear promise', 'promise');
    assert.equal(asScript.found, true);
    assert.equal(asColour.found, true);
    assert.deepEqual(asScript, asColour);
  });
});

// =============================================================================
// Absorbed from scriptAccent.test.ts (2026-09-18)
// =============================================================================
// src/lib/scriptAccent.ts used to hold a second, weaker splitter for the script
// accent: case-sensitive, stega-blind, and it threw on a null heading. Its
// consumers moved onto splitHeadingAccent, so every case it guarded moves here
// rather than being deleted. Two of them record a DELIBERATE behaviour change
// and say so on the line; the rest assert the behaviour is unchanged.
// =============================================================================
describe('splitHeadingAccent, cases absorbed from the retired script splitter', () => {
  it('returns found:false when the accent is undefined', () => {
    const r = splitHeadingAccent('Hello World', undefined);
    assert.equal(r.found, false);
    assert.equal(r.before, '');
    assert.equal(r.word, '');
    assert.equal(r.after, '');
  });

  it('returns found:false when the accent is an empty string', () => {
    assert.equal(splitHeadingAccent('Hello World', '').found, false);
  });

  it('returns found:false when the accent is not in the headline', () => {
    assert.equal(splitHeadingAccent('Hello World', 'beautiful').found, false);
  });

  it('returns found:true and the right slices when the accent is found', () => {
    const r = splitHeadingAccent('Design That Feels Like You', 'Feels');
    assert.equal(r.found, true);
    assert.equal(r.before, 'Design That ');
    assert.equal(r.word, 'Feels');
    assert.equal(r.after, ' Like You');
  });

  it('before + word + after reconstructs the original headline', () => {
    const headline = 'Good design starts with a real conversation.';
    const r = splitHeadingAccent(headline, 'real');
    assert.equal(r.found, true);
    assert.equal(r.before + r.word + r.after, headline);
  });

  it('an accent that is not in the headline returns found:false', () => {
    assert.equal(splitHeadingAccent('Simple headline', 'missing').found, false);
  });

  // CHANGED on purpose. The old splitter missed here, so an editor who typed
  // "hello" for a headline reading "Hello World" got no accent and no reason.
  it('CHANGED: a case mismatch now matches instead of silently doing nothing', () => {
    const r = splitHeadingAccent('Hello World', 'hello');
    assert.equal(r.found, true);
    assert.equal(r.word, 'Hello', 'the headline own casing is what renders');
  });

  it('an exact-case accent still matches, as it always did', () => {
    const r = splitHeadingAccent('Hello World', 'Hello');
    assert.equal(r.found, true);
    assert.equal(r.word, 'Hello');
  });

  it('only the first occurrence is matched', () => {
    const r = splitHeadingAccent('love what you love', 'love');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'love');
    assert.equal(r.after, ' what you love');
  });

  // CHANGED on purpose, and this is the one case where the old splitter picked
  // a different word: it matched the lowercase occurrence at the end, because
  // that was the only exact-case hit. First-occurrence-only is the documented
  // rule for both accent fields, so the new answer is the intended one.
  it('CHANGED: a word repeated in another case accents the FIRST occurrence', () => {
    const r = splitHeadingAccent('Love what you love', 'love');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'Love');
    assert.equal(r.after, ' what you love');
  });

  it('accent at the start of the headline', () => {
    const r = splitHeadingAccent('Design is everything', 'Design');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'Design');
    assert.equal(r.after, ' is everything');
  });

  it('accent at the end of the headline', () => {
    const r = splitHeadingAccent('Everything is Design', 'Design');
    assert.equal(r.found, true);
    assert.equal(r.before, 'Everything is ');
    assert.equal(r.word, 'Design');
    assert.equal(r.after, '');
  });

  it('accent is the entire headline', () => {
    const r = splitHeadingAccent('Design', 'Design');
    assert.equal(r.found, true);
    assert.equal(r.before, '');
    assert.equal(r.word, 'Design');
    assert.equal(r.after, '');
  });

  // The old splitter threw a TypeError here, which is why every caller had to
  // remember `headline ?? ''`. One of them (Hero) did not.
  it('tolerates a missing heading instead of throwing', () => {
    const r = splitHeadingAccent(undefined, 'Design');
    assert.equal(r.found, false);
    assert.equal(r.heading, '');
    assert.equal(splitHeadingAccent(null, 'Design').found, false);
  });
});

describe('splitHeadingWords', () => {
  it('splits a heading into words and the spaces between them', () => {
    const tokens = splitHeadingWords('Work that earns the look');
    assert.deepEqual(
      tokens.map((t) => t.text),
      ['Work', ' ', 'that', ' ', 'earns', ' ', 'the', ' ', 'look'],
    );
    assert.deepEqual(
      tokens.map((t) => t.word),
      [true, false, true, false, true, false, true, false, true],
    );
  });

  it('rejoins to the cleaned heading, so the overlay redraws it exactly', () => {
    const heading = `Craft${STEGA}ed rooms,  finished well.`;
    const tokens = splitHeadingWords(heading);
    assert.equal(tokens.map((t) => t.text).join(''), 'Crafted rooms,  finished well.');
  });

  // The value is what gets STORED, and splitHeadingAccent matches it with
  // indexOf: a trailing comma in the value would make the accent swallow it.
  it('keeps punctuation on the label but off the stored value', () => {
    const tokens = splitHeadingWords('Craft, unhurried.');
    assert.deepEqual(tokens[0], { text: 'Craft,', value: 'Craft', word: true });
    assert.deepEqual(tokens[2], { text: 'unhurried.', value: 'unhurried', word: true });
  });

  // The picker's whole promise: a word it offers cannot fail to match.
  it('a value that survives is one splitHeadingAccent can find', () => {
    const heading = 'Craft, unhurried.';
    for (const token of splitHeadingWords(heading).filter((t) => t.word)) {
      assert.equal(splitHeadingAccent(heading, token.value).found, true, token.value);
    }
  });

  it('a token of pure punctuation is not offered as a word', () => {
    const tokens = splitHeadingWords('Come — and stay');
    const dash = tokens.find((t) => t.text === '—');
    assert.equal(dash?.word, false);
  });

  it('is empty for an empty heading', () => {
    assert.deepEqual(splitHeadingWords(''), []);
    assert.deepEqual(splitHeadingWords(undefined), []);
    assert.deepEqual(splitHeadingWords(STEGA), []);
  });
});

describe('isAccentedWord', () => {
  const tokens = splitHeadingWords('Craft, unhurried.');
  const craft = tokens[0];

  it('rings the word the stored accent points at, whatever its case', () => {
    assert.equal(isAccentedWord(craft, 'Craft'), true);
    assert.equal(isAccentedWord(craft, 'craft'), true);
    assert.equal(isAccentedWord(craft, `cra${STEGA}ft`), true);
  });

  it('rings nothing else', () => {
    assert.equal(isAccentedWord(craft, 'unhurried'), false);
    assert.equal(isAccentedWord(craft, ''), false);
    assert.equal(isAccentedWord(craft, undefined), false);
    assert.equal(isAccentedWord({ text: ' ', value: '', word: false }, ''), false);
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
