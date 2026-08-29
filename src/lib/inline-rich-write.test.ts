// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  htmlToRuns,
  htmlToInlineRich,
  inlineRichToHtml,
  normalizeRuns,
  runsToHtml,
  textToRuns,
  escapeHtml,
} from './inline-rich-write.ts';
import { RUN_BREAK, inlineRichRuns } from './inline-rich.ts';

/** Predictable keys, so a whole document value can be asserted. */
function counter() {
  let n = 0;
  return () => `k${++n}`;
}

// -----------------------------------------------------------------------------
// HTML -> runs
// -----------------------------------------------------------------------------

test('plain text is one unmarked run', () => {
  assert.deepEqual(htmlToRuns('A quiet morning'), [
    { text: 'A quiet morning', strong: false, em: false },
  ]);
});

test('bold and italic tags become marks, in both spellings', () => {
  assert.deepEqual(htmlToRuns('one <b>two</b> <i>three</i>'), [
    { text: 'one ', strong: false, em: false },
    { text: 'two', strong: true, em: false },
    { text: ' ', strong: false, em: false },
    { text: 'three', strong: false, em: true },
  ]);
  assert.deepEqual(htmlToRuns('<strong>a</strong><em>b</em>'), [
    { text: 'a', strong: true, em: false },
    { text: 'b', strong: false, em: true },
  ]);
});

test('nesting carries both marks', () => {
  assert.deepEqual(htmlToRuns('<b>bold <i>and italic</i></b>'), [
    { text: 'bold ', strong: true, em: false },
    { text: 'and italic', strong: true, em: true },
  ]);
});

test('unknown tags keep their text and lose themselves', () => {
  assert.deepEqual(htmlToRuns('<div class="x"><a href="/y">link</a> text</div>'), [
    { text: 'link text', strong: false, em: false },
  ]);
});

test('script and style contribute nothing at all', () => {
  assert.deepEqual(htmlToRuns('safe<script>doSomething(1)</script> still safe'), [
    { text: 'safe still safe', strong: false, em: false },
  ]);
  assert.deepEqual(htmlToRuns('<style>p{color:red}</style>text'), [
    { text: 'text', strong: false, em: false },
  ]);
});

test('a browser that styled instead of tagged is still understood', () => {
  assert.deepEqual(htmlToRuns('<span style="font-weight: 700">heavy</span>'), [
    { text: 'heavy', strong: true, em: false },
  ]);
  assert.deepEqual(htmlToRuns("<span style='font-style:italic'>lean</span>"), [
    { text: 'lean', strong: false, em: true },
  ]);
  assert.deepEqual(htmlToRuns('<span class="plain">nothing</span>'), [
    { text: 'nothing', strong: false, em: false },
  ]);
});

test('line breaks become a single space, because the twin is one paragraph', () => {
  assert.deepEqual(htmlToRuns('one<br>two'), [{ text: 'one two', strong: false, em: false }]);
  assert.deepEqual(htmlToRuns('<div>one</div><div>two</div>'), [
    { text: 'one two', strong: false, em: false },
  ]);
});

test('entities are decoded, and a non-breaking space is a space', () => {
  assert.deepEqual(htmlToRuns('Tom &amp; Jerry &lt;3'), [
    { text: 'Tom & Jerry <3', strong: false, em: false },
  ]);
  assert.deepEqual(htmlToRuns('a&nbsp;b'), [{ text: 'a b', strong: false, em: false }]);
  assert.deepEqual(htmlToRuns('a&#160;b &#x41;'), [{ text: 'a b A', strong: false, em: false }]);
});

test('whitespace is squeezed and the ends are trimmed', () => {
  assert.deepEqual(htmlToRuns('  spaced \n\n out  '), [
    { text: 'spaced out', strong: false, em: false },
  ]);
  assert.deepEqual(htmlToRuns('<br>lead'), [{ text: 'lead', strong: false, em: false }]);
});

test('neighbours with the same marks are merged', () => {
  assert.deepEqual(htmlToRuns('<b>one</b><b>two</b>'), [
    { text: 'onetwo', strong: true, em: false },
  ]);
});

test('two spaces meeting ACROSS a mark boundary are still one space', () => {
  // The merge above cannot fire here (the runs carry different marks), so
  // without its own rule this stores "a" + "  b". The space is dropped from the
  // SECOND run, because a leading space inside an emphasised span renders as an
  // over-long underline or a wide bold.
  assert.deepEqual(htmlToRuns('<b>a </b><i> b</i>'), [
    { text: 'a ', strong: true, em: false },
    { text: 'b', strong: false, em: true },
  ]);
  // And a break tag inside one mark still merges into a single run, so the new
  // rule cannot cost a span where the old one already did the right thing.
  assert.deepEqual(htmlToRuns('<b>a<br>b</b>'), [{ text: 'a b', strong: true, em: false }]);
});

test('a lone angle bracket is text, not a tag', () => {
  assert.deepEqual(htmlToRuns('5 < 6'), [{ text: '5 < 6', strong: false, em: false }]);
});

test('an unbalanced close tag does not unwind the world', () => {
  assert.deepEqual(htmlToRuns('<b>bold</i> still bold</b> plain'), [
    { text: 'bold still bold', strong: true, em: false },
    { text: ' plain', strong: false, em: false },
  ]);
});

// -----------------------------------------------------------------------------
// HTML -> stored value
// -----------------------------------------------------------------------------

test('htmlToInlineRich builds one block of marked spans', () => {
  assert.deepEqual(htmlToInlineRich('Come <b>early</b>.', counter()), [
    {
      _type: 'block',
      _key: 'k1',
      style: 'normal',
      markDefs: [],
      children: [
        { _type: 'span', _key: 'k2', text: 'Come ', marks: [] },
        { _type: 'span', _key: 'k3', text: 'early', marks: ['strong'] },
        { _type: 'span', _key: 'k4', text: '.', marks: [] },
      ],
    },
  ]);
});

test('both marks are stored in a stable order', () => {
  const value = htmlToInlineRich('<em><strong>x</strong></em>', counter());
  assert.deepEqual(value[0].children?.[0].marks, ['strong', 'em']);
});

test('an emptied box stores nothing, so the plain string renders again', () => {
  assert.deepEqual(htmlToInlineRich('', counter()), []);
  assert.deepEqual(htmlToInlineRich('<br>', counter()), []);
  assert.deepEqual(htmlToInlineRich('   ', counter()), []);
  assert.deepEqual(htmlToInlineRich('<b></b>', counter()), []);
});

// -----------------------------------------------------------------------------
// stored value -> HTML, and the round trip
// -----------------------------------------------------------------------------

test('inlineRichToHtml seeds the box from what is stored', () => {
  const stored = [
    {
      _type: 'block',
      children: [
        { _type: 'span', text: 'Say ', marks: [] },
        { _type: 'span', text: 'yes', marks: ['strong', 'em'] },
      ],
    },
  ];
  assert.equal(inlineRichToHtml(stored), 'Say <strong><em>yes</em></strong>');
});

test('inlineRichToHtml is empty for an empty twin', () => {
  assert.equal(inlineRichToHtml(undefined), '');
  assert.equal(inlineRichToHtml([]), '');
});

test('markup in the text is escaped on the way out', () => {
  assert.equal(escapeHtml('a & b <c>'), 'a &amp; b &lt;c&gt;');
  assert.equal(
    runsToHtml([{ text: '<b>', strong: true, em: false }]),
    '<strong>&lt;b&gt;</strong>',
  );
});

test('a value survives the round trip unchanged', () => {
  const html = 'Doors open <strong>at ten</strong>, <em>sharp</em>.';
  const stored = htmlToInlineRich(html, counter());
  assert.equal(inlineRichToHtml(stored), html);
  assert.deepEqual(inlineRichRuns(stored), htmlToRuns(html));
});

// -----------------------------------------------------------------------------
// multiline: the seam a repo whose twin renders <br /> between blocks turns on
// -----------------------------------------------------------------------------

test('multiline keeps a break instead of collapsing it to a space', () => {
  assert.deepEqual(htmlToRuns('one<br>two', { multiline: true }), [
    { text: 'one', strong: false, em: false },
    { text: RUN_BREAK, strong: false, em: false },
    { text: 'two', strong: false, em: false },
  ]);
  assert.deepEqual(htmlToRuns('<div>one</div><div>two</div>', { multiline: true }), [
    { text: 'one', strong: false, em: false },
    { text: RUN_BREAK, strong: false, em: false },
    { text: 'two', strong: false, em: false },
  ]);
});

test('multiline keeps each line its own marks, and never merges across a break', () => {
  assert.deepEqual(htmlToRuns('<b>bold</b><br><i>italic</i>', { multiline: true }), [
    { text: 'bold', strong: true, em: false },
    { text: RUN_BREAK, strong: false, em: false },
    { text: 'italic', strong: false, em: true },
  ]);
});

test('multiline trims and drops blank lines, leading and trailing ones included', () => {
  assert.deepEqual(
    normalizeRuns([
      { text: RUN_BREAK, strong: false, em: false },
      { text: ' one ', strong: false, em: false },
      { text: RUN_BREAK, strong: false, em: false },
      { text: '   ', strong: false, em: false },
      { text: RUN_BREAK, strong: false, em: false },
      { text: ' two ', strong: false, em: false },
      { text: RUN_BREAK, strong: false, em: false },
    ]),
    [
      { text: 'one', strong: false, em: false },
      { text: RUN_BREAK, strong: false, em: false },
      { text: 'two', strong: false, em: false },
    ],
  );
});

test('a break inside the text of a run is whitespace, not a line', () => {
  // Source formatting between two tags reaches the parser as a text node. It
  // must never read as a deliberate break, or a pretty-printed paste would grow
  // a line for every newline its author's editor happened to insert.
  assert.deepEqual(htmlToRuns('<b>a\nb</b>', { multiline: true }), [
    { text: 'a b', strong: true, em: false },
  ]);
  assert.deepEqual(normalizeRuns([{ text: 'a\nb', strong: false, em: false }]), [
    { text: 'a b', strong: false, em: false },
  ]);
});

test('multiline stores one block per line', () => {
  assert.deepEqual(htmlToInlineRich('one<br>two', counter(), { multiline: true }), [
    {
      _type: 'block',
      _key: 'k1',
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: 'k2', text: 'one', marks: [] }],
    },
    {
      _type: 'block',
      _key: 'k3',
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: 'k4', text: 'two', marks: [] }],
    },
  ]);
  // The default is unchanged: one block, and the break is a space.
  assert.deepEqual(htmlToInlineRich('one<br>two', counter()), [
    {
      _type: 'block',
      _key: 'k1',
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: 'k2', text: 'one two', marks: [] }],
    },
  ]);
});

test('runsToHtml seeds a break back into the box', () => {
  assert.equal(
    runsToHtml([
      { text: 'one', strong: false, em: false },
      { text: RUN_BREAK, strong: false, em: false },
      { text: 'two', strong: false, em: false },
    ]),
    'one<br>two',
  );
});

test('textToRuns reads a clipboard with no HTML flavour', () => {
  assert.deepEqual(textToRuns('  two   words  '), [
    { text: 'two words', strong: false, em: false },
  ]);
  assert.deepEqual(textToRuns('one\r\ntwo', { multiline: true }), [
    { text: 'one', strong: false, em: false },
    { text: RUN_BREAK, strong: false, em: false },
    { text: 'two', strong: false, em: false },
  ]);
  // Without the seam a pasted newline is a space, like every other whitespace.
  assert.deepEqual(textToRuns('one\ntwo'), [{ text: 'one two', strong: false, em: false }]);
  assert.deepEqual(textToRuns(''), []);
  assert.deepEqual(textToRuns(undefined), []);
});
