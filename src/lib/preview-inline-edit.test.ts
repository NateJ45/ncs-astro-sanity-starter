// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INLINE_EDIT_ATTRIBUTE,
  blockChildrenFromRuns,
  classifyInlinePath,
  createTrailingWriter,
  editableBlockRuns,
  sameRuns,
  stegaRanges,
  typedPlainValue,
  withoutStega,
  type WriterClock,
} from './preview-inline-edit.ts';

// A real-shaped stega run: the four-character prefix and some payload digits.
const RUN = '​​​​‌‍﻿​‌‍﻿​';

test('the attribute is the one the morph keeps', () => {
  assert.equal(INLINE_EDIT_ATTRIBUTE, 'data-inline-editing');
});

// ---------------------------------------------------------------------------
// classifyInlinePath
// ---------------------------------------------------------------------------

test('a string or text field is a plain target with its parsed path', () => {
  assert.deepEqual(classifyInlinePath('pageBuilder[_key=="a1"].heading', 'string'), {
    kind: 'plain',
    path: ['pageBuilder', { _key: 'a1' }, 'heading'],
    multiline: false,
  });
  assert.deepEqual(classifyInlinePath('heroSubhead', 'text'), {
    kind: 'plain',
    path: ['heroSubhead'],
    multiline: true,
  });
});

test('a span inside a block targets the block', () => {
  assert.deepEqual(
    classifyInlinePath(
      'pageBuilder[_key=="a1"].body[_key=="b1"].children[_key=="s1"].text',
      'string',
    ),
    {
      kind: 'block',
      blockPath: ['pageBuilder', { _key: 'a1' }, 'body', { _key: 'b1' }],
      spanKey: 's1',
    },
  );
});

test('anything else keeps the form panel', () => {
  assert.equal(classifyInlinePath('price', 'number'), null);
  assert.equal(classifyInlinePath('link.url', 'url'), null);
  assert.equal(classifyInlinePath('slug.current', 'slug'), null);
  assert.equal(classifyInlinePath('pageBuilder[_key=="a1"]', 'object'), null);
  assert.equal(classifyInlinePath('pageBuilder[_key=="a1"]._type', 'string'), null);
  assert.equal(classifyInlinePath('', 'string'), null);
  assert.equal(classifyInlinePath('bad path!', 'string'), null);
  assert.equal(classifyInlinePath(undefined, 'string'), null);
  assert.equal(classifyInlinePath('heading', undefined), null);
});

// ---------------------------------------------------------------------------
// editableBlockRuns
// ---------------------------------------------------------------------------

const block = (children: unknown[], extra: Record<string, unknown> = {}) => ({
  _type: 'block',
  _key: 'b1',
  style: 'normal',
  markDefs: [],
  children,
  ...extra,
});

test('plain, bold and italic spans round-trip', () => {
  const runs = editableBlockRuns(
    block([
      { _type: 'span', _key: 's1', text: 'Come ', marks: [] },
      { _type: 'span', _key: 's2', text: 'as you are', marks: ['strong', 'em'] },
    ]),
  );
  assert.deepEqual(runs, [
    { text: 'Come ', strong: false, em: false },
    { text: 'as you are', strong: true, em: true },
  ]);
});

test('links, lists, other marks and inline objects keep the panel', () => {
  const span = { _type: 'span', _key: 's1', text: 'x', marks: [] };
  assert.equal(editableBlockRuns(block([span], { listItem: 'bullet' })), null);
  assert.equal(
    editableBlockRuns(block([{ ...span, marks: ['l1'] }], { markDefs: [{ _key: 'l1' }] })),
    null,
  );
  assert.equal(editableBlockRuns(block([{ ...span, marks: ['underline'] }])), null);
  assert.equal(editableBlockRuns(block([span, { _type: 'inlineIcon', _key: 'i1' }])), null);
  assert.equal(editableBlockRuns(block([])), null);
  assert.equal(editableBlockRuns({ _type: 'image' }), null);
  assert.equal(editableBlockRuns(null), null);
});

test('sameRuns ignores whitespace the page collapses but not words or marks', () => {
  const stored = [
    { text: 'Come  ', strong: false, em: false },
    { text: 'home', strong: true, em: false },
  ];
  assert.equal(
    sameRuns(stored, [
      { text: 'Come ', strong: false, em: false },
      { text: 'home', strong: true, em: false },
    ]),
    true,
  );
  assert.equal(sameRuns(stored, [{ text: 'Come home', strong: false, em: false }]), false);
  assert.equal(
    sameRuns(stored, [
      { text: 'Come ', strong: false, em: false },
      { text: 'HOME', strong: true, em: false },
    ]),
    false,
  );
});

// ---------------------------------------------------------------------------
// Typed values
// ---------------------------------------------------------------------------

test('stegaRanges finds every run, last first, in UTF-16 offsets', () => {
  const text = `Hi${RUN} there${RUN}`;
  const ranges = stegaRanges(text);
  assert.equal(ranges.length, 2);
  let out = text;
  for (const [start, end] of ranges) out = out.slice(0, start) + out.slice(end);
  assert.equal(out, 'Hi there');
  assert.equal(withoutStega(text), 'Hi there');
  assert.deepEqual(stegaRanges('no payload'), []);
});

test('typed plain values lose the browser artefacts and nothing else', () => {
  assert.equal(typedPlainValue('Welcome ', 'Welcome', false), 'Welcome ');
  assert.equal(typedPlainValue(`Two  words${RUN}`, 'x', false), 'Two  words');
  assert.equal(typedPlainValue('line\r\nbreak', 'x', false), 'line break');
  assert.equal(typedPlainValue('line\nbreak', 'x', true), 'line\nbreak');
  // A value that used non-breaking spaces on purpose keeps them.
  assert.equal(typedPlainValue('9 am', '10 am', false), '9 am');
});

// ---------------------------------------------------------------------------
// blockChildrenFromRuns
// ---------------------------------------------------------------------------

const counter = () => {
  let n = 0;
  return () => `new${(n += 1)}`;
};

test('typing inside one run keeps every key, so only that span text changes', () => {
  const previous = [
    { _type: 'span', _key: 's1', text: 'Come ', marks: [] },
    { _type: 'span', _key: 's2', text: 'home', marks: ['strong'] },
  ];
  const next = blockChildrenFromRuns(
    [
      { text: 'Come ', strong: false, em: false },
      { text: 'home today', strong: true, em: false },
    ],
    previous,
    counter(),
  );
  assert.deepEqual(next, [
    { _type: 'span', _key: 's1', text: 'Come ', marks: [] },
    { _type: 'span', _key: 's2', text: 'home today', marks: ['strong'] },
  ]);
});

test('new spans get fresh keys, never a duplicate', () => {
  const next = blockChildrenFromRuns(
    [
      { text: 'a', strong: false, em: false },
      { text: 'b', strong: false, em: true },
      { text: 'c', strong: false, em: false },
    ],
    [{ _type: 'span', _key: 'new1', text: 'abc', marks: [] }],
    counter(),
  );
  assert.deepEqual(
    next.map((span) => span._key),
    ['new1', 'new2', 'new3'],
  );
  assert.deepEqual(next[1].marks, ['em']);
});

test('an emptied paragraph keeps one empty span', () => {
  assert.deepEqual(
    blockChildrenFromRuns([], [{ _type: 'span', _key: 's1', text: 'x', marks: [] }], counter()),
    [{ _type: 'span', _key: 's1', text: '', marks: [] }],
  );
});

// ---------------------------------------------------------------------------
// createTrailingWriter
// ---------------------------------------------------------------------------

function fakeClock() {
  const timers = new Map<number, () => void>();
  let id = 0;
  const clock: WriterClock = {
    setTimer: (fn) => {
      id += 1;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (handle) => {
      timers.delete(handle as number);
    },
  };
  const tick = () => {
    const due = [...timers.entries()];
    timers.clear();
    due.forEach(([, fn]) => fn());
  };
  return { clock, tick, pending: () => timers.size };
}

test('a typing burst sends the first value at once and then only the newest', () => {
  const sent: string[] = [];
  const { clock, tick } = fakeClock();
  const writer = createTrailingWriter<string>((v) => sent.push(v), 250, clock);

  for (const value of ['W', 'We', 'Wel', 'Welc', 'Welco']) writer.push(value);
  assert.deepEqual(sent, ['W'], 'leading edge only while the window is open');
  tick();
  assert.deepEqual(sent, ['W', 'Welco'], 'the window closes with the newest value');
  writer.push('Welcom');
  writer.push('Welcome');
  tick();
  assert.deepEqual(sent, ['W', 'Welco', 'Welcome']);
  assert.ok(sent.length < 7, 'fewer writes than keystrokes');
});

test('flush sends what is pending once, and never repeats a value', () => {
  const sent: string[] = [];
  const { clock, pending } = fakeClock();
  const writer = createTrailingWriter<string>((v) => sent.push(v), 250, clock);

  writer.push('a');
  writer.push('ab');
  writer.flush();
  assert.deepEqual(sent, ['a', 'ab']);
  assert.equal(pending(), 0, 'flush clears the timer');
  writer.flush();
  writer.push('ab');
  writer.flush();
  assert.deepEqual(sent, ['a', 'ab'], 'the same value is not sent twice in a row');
});

test('cancel drops what is pending', () => {
  const sent: string[] = [];
  const { clock, tick } = fakeClock();
  const writer = createTrailingWriter<string>((v) => sent.push(v), 250, clock);
  writer.push('a');
  writer.push('ab');
  writer.cancel();
  tick();
  writer.flush();
  assert.deepEqual(sent, ['a']);
});

test('a custom equality suppresses structurally equal values', () => {
  const sent: string[][] = [];
  const { clock } = fakeClock();
  const writer = createTrailingWriter<string[]>(
    (v) => sent.push(v),
    250,
    clock,
    (a, b) => a.join('|') === b.join('|'),
  );
  writer.push(['a']);
  writer.flush();
  writer.push(['a']);
  writer.flush();
  assert.equal(sent.length, 1);
});

test('an initial value counts as sent, so typing back to it writes nothing', () => {
  const sent: string[] = [];
  const { clock, tick } = fakeClock();
  const writer = createTrailingWriter<string>((v) => sent.push(v), 250, clock, undefined, 'Hi');
  writer.push('Hi');
  tick();
  writer.flush();
  assert.deepEqual(sent, []);
  writer.push('Hi!');
  assert.deepEqual(sent, ['Hi!']);
});
