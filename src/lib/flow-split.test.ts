// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Pins the flow layer's word splitter (src/lib/flow-split.ts; PORTS.md card 192).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitWords } from './flow-split.ts';

const words = (text: string) =>
  splitWords(text)
    .filter((p) => !p.space)
    .map((p) => p.text);

describe('splitWords', () => {
  it('cuts on whitespace, not on the letter s', () => {
    assert.deepEqual(words('This is a test'), ['This', 'is', 'a', 'test']);
    assert.deepEqual(words('The story in our mark'), ['The', 'story', 'in', 'our', 'mark']);
    assert.deepEqual(words('sss'), ['sss']);
  });

  it('keeps every character, so joining the pieces gives the text back', () => {
    for (const text of ['About us', '  Come and see.  ', 'one\ttwo\nthree', 'stones', '']) {
      assert.equal(
        splitWords(text)
          .map((p) => p.text)
          .join(''),
        text,
      );
    }
  });

  it('marks whitespace runs as space and keeps them whole', () => {
    assert.deepEqual(splitWords('a  b'), [
      { text: 'a', space: false },
      { text: '  ', space: true },
      { text: 'b', space: false },
    ]);
  });

  it('treats a non-breaking space as whitespace', () => {
    assert.deepEqual(words('11:00 am'), ['11:00', 'am']);
  });
});
