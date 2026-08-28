// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MORPH_LIMITS,
  ELEMENT_NODE,
  TEXT_NODE,
  imageSourceUnchanged,
  isRedundantRender,
  morph,
  nodeKey,
  sameKind,
  type MorphCharacterData,
  type MorphElement,
  type MorphNode,
} from './preview-morph.ts';

// ---------------------------------------------------------------------------
// A fake DOM, in the shape src/lib/preview-morph.ts actually reads
// ---------------------------------------------------------------------------
// The same move src/lib/preview-text-nodes.ts makes with `TextLike`: the module
// under test is written against a structural interface, so the algorithm can be
// exercised in `node:test`, which has no DOM. These fakes additionally COUNT
// writes, which is how the image rule and the "touch nothing else" promise are
// asserted rather than assumed.

class FakeText implements MorphCharacterData {
  nodeType = TEXT_NODE;
  nodeName = '#text';
  /** How many times `data` has been assigned. */
  writes = 0;
  value = '';

  constructor(value: string) {
    this.value = value;
  }

  get data(): string {
    return this.value;
  }

  set data(next: string) {
    this.writes += 1;
    this.value = next;
  }
}

class FakeElement implements MorphElement {
  nodeType = ELEMENT_NODE;
  nodeName = 'DIV';
  childNodes: MorphNode[] = [];
  attributes = new Map<string, string>();
  /** Attribute names written, in order. */
  writes: string[] = [];
  /** Attribute names removed, in order. */
  removals: string[] = [];

  constructor(
    nodeName: string,
    attributes: Record<string, string> = {},
    children: MorphNode[] = [],
  ) {
    this.nodeName = nodeName;
    for (const [name, value] of Object.entries(attributes)) this.attributes.set(name, value);
    this.childNodes = children;
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  getAttribute(name: string): string | null {
    const value = this.attributes.get(name);
    return value === undefined ? null : value;
  }

  setAttribute(name: string, value: string): void {
    this.writes.push(name);
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.removals.push(name);
    this.attributes.delete(name);
  }

  insertBefore(node: MorphNode, before: MorphNode | null): MorphNode {
    const already = this.childNodes.indexOf(node);
    if (already >= 0) this.childNodes.splice(already, 1);
    const at = before === null ? -1 : this.childNodes.indexOf(before);
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, node);
    return node;
  }

  removeChild(node: MorphNode): MorphNode {
    const at = this.childNodes.indexOf(node);
    if (at >= 0) this.childNodes.splice(at, 1);
    return node;
  }
}

const el = (
  nodeName: string,
  attributes: Record<string, string> = {},
  children: MorphNode[] = [],
): FakeElement => new FakeElement(nodeName, attributes, children);

const text = (value: string): FakeText => new FakeText(value);

/** Serialize a tree for comparison. Attributes are sorted so order never lies. */
function html(node: MorphNode): string {
  if (node.nodeType !== ELEMENT_NODE) return (node as MorphCharacterData).data;
  const element = node as FakeElement;
  const attributes = element
    .getAttributeNames()
    .sort()
    .map((name) => ` ${name}="${element.getAttribute(name)}"`)
    .join('');
  const tag = element.nodeName.toLowerCase();
  const inner = [...element.childNodes].map(html).join('');
  return `<${tag}${attributes}>${inner}</${tag}>`;
}

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

test('sets what changed, adds what appeared, removes what went away', () => {
  const from = el('SECTION', { class: 'a', 'data-old': '1', title: 'same' });
  const to = el('SECTION', { class: 'b', 'aria-label': 'new', title: 'same' });

  assert.equal(morph(from, to), true);
  assert.equal(from.getAttribute('class'), 'b');
  assert.equal(from.getAttribute('aria-label'), 'new');
  assert.equal(from.getAttribute('data-old'), null);
  assert.equal(from.getAttribute('title'), 'same');
});

test('never writes an attribute whose value already matches', () => {
  const from = el('SECTION', { class: 'a', title: 'same' });
  const to = el('SECTION', { class: 'b', title: 'same' });

  morph(from, to);
  assert.deepEqual(from.writes, ['class']);
  assert.deepEqual(from.removals, []);
});

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

test('changes only the text node that differs, and keeps every node object', () => {
  const heading = text('Our story');
  const blurb = text('Since 1971');
  const from = el('DIV', {}, [el('H2', {}, [heading]), el('P', {}, [blurb])]);
  const to = el('DIV', {}, [
    el('H2', {}, [text('Our stories')]),
    el('P', {}, [text('Since 1971')]),
  ]);
  const wrapper = from.childNodes[0];

  assert.equal(morph(from, to), true);
  assert.equal(heading.data, 'Our stories');
  assert.equal(heading.writes, 1);
  assert.equal(blurb.writes, 0, 'an unchanged text node is not written back');
  assert.equal(from.childNodes[0], wrapper, 'the element around it is reused, not rebuilt');
  assert.equal((from.childNodes[0] as FakeElement).childNodes[0], heading);
});

// ---------------------------------------------------------------------------
// Children: insert, remove, replace, reorder
// ---------------------------------------------------------------------------

test('inserts into a keyless run by repurposing the tail and appending one node', () => {
  // The honest contract for UNKEYED siblings, and the reason the site keys its
  // sections: positional matching cannot tell "a paragraph was inserted" from
  // "every paragraph was rewritten", so it does the latter and appends. The
  // result is correct, the cost is bounded by the length of the tail, and no
  // image is re-fetched by it — an <img> that ends up matched against a
  // different <img> with the same src is still left alone.
  const first = el('P', {}, [text('one')]);
  const last = el('P', {}, [text('three')]);
  const from = el('DIV', {}, [first, last]);
  const to = el('DIV', {}, [
    el('P', {}, [text('one')]),
    el('P', {}, [text('two')]),
    el('P', {}, [text('three')]),
  ]);
  const expected = html(to);

  assert.equal(morph(from, to), true);
  assert.equal(html(from), expected);
  assert.equal(from.childNodes[0], first, 'everything before the insertion point is untouched');
  assert.equal(from.childNodes[1], last, 'the tail is reused in place, with new characters');
  assert.equal(from.childNodes.length, 3);
});

test('a keyed insertion leaves every existing node exactly where it was', () => {
  const a = el('SECTION', { 'data-sanity': 'doc:a' }, [text('A')]);
  const c = el('SECTION', { 'data-sanity': 'doc:c' }, [text('C')]);
  const image = el('IMG', { src: '/cdn/a.jpg' });
  a.childNodes.push(image);
  const from = el('MAIN', {}, [a, c]);
  const to = el('MAIN', {}, [
    el('SECTION', { 'data-sanity': 'doc:a' }, [text('A'), el('IMG', { src: '/cdn/a.jpg' })]),
    el('SECTION', { 'data-sanity': 'doc:b' }, [text('B')]),
    el('SECTION', { 'data-sanity': 'doc:c' }, [text('C')]),
  ]);
  const expected = html(to);

  assert.equal(morph(from, to), true);
  assert.equal(html(from), expected);
  assert.equal(from.childNodes[0], a);
  assert.equal(from.childNodes[2], c);
  assert.equal(a.childNodes[1], image);
  assert.deepEqual(image.writes, []);
});

test('removes a child that is gone', () => {
  const keep = el('P', { id: 'keep' }, [text('one')]);
  const from = el('DIV', {}, [keep, el('P', { id: 'drop' }, [text('two')])]);
  const to = el('DIV', {}, [el('P', { id: 'keep' }, [text('one')])]);
  const expected = html(to);

  assert.equal(morph(from, to), true);
  assert.equal(html(from), expected);
  assert.equal(from.childNodes.length, 1);
  assert.equal(from.childNodes[0], keep);
});

test('replaces a child whose tag changed rather than mutating it', () => {
  const old = el('SPAN', {}, [text('hi')]);
  const from = el('DIV', {}, [old]);
  const to = el('DIV', {}, [el('STRONG', {}, [text('hi')])]);
  const expected = html(to);

  assert.equal(morph(from, to), true);
  assert.equal(html(from), expected);
  assert.equal(from.childNodes.includes(old), false);
});

test('a keyed reorder moves the same nodes instead of rebuilding them', () => {
  const a = el('DIV', { 'data-sanity': 'doc:a' }, [text('A')]);
  const b = el('DIV', { 'data-sanity': 'doc:b' }, [text('B')]);
  const c = el('DIV', { 'data-sanity': 'doc:c' }, [text('C')]);
  const from = el('MAIN', {}, [a, b, c]);
  const to = el('MAIN', {}, [
    el('DIV', { 'data-sanity': 'doc:c' }, [text('C')]),
    el('DIV', { 'data-sanity': 'doc:a' }, [text('A')]),
    el('DIV', { 'data-sanity': 'doc:b' }, [text('B')]),
  ]);

  assert.equal(morph(from, to), true);
  assert.deepEqual(from.childNodes, [c, a, b]);
  assert.deepEqual([a.writes, b.writes, c.writes], [[], [], []]);
});

test('a keyless run is matched in order, stepping over keyed siblings', () => {
  const lead = text('lead ');
  const section = el('DIV', { 'data-sanity': 'doc:s' }, [text('S')]);
  const tail = text(' tail');
  const from = el('MAIN', {}, [lead, section, tail]);
  const to = el('MAIN', {}, [
    text('lead '),
    el('DIV', { 'data-sanity': 'doc:s' }, [text('S')]),
    text(' TAIL'),
  ]);

  assert.equal(morph(from, to), true);
  assert.deepEqual(from.childNodes, [lead, section, tail]);
  assert.equal(lead.writes, 0);
  assert.equal(tail.data, ' TAIL');
});

// ---------------------------------------------------------------------------
// The image rule
// ---------------------------------------------------------------------------

test('an img whose source is unchanged keeps its identity and is never written to', () => {
  const image = el('IMG', {
    src: '/cdn/hero.jpg',
    srcset: '/cdn/hero.jpg 1x, /cdn/hero@2x.jpg 2x',
    sizes: '100vw',
    class: 'rounded',
    alt: 'Hero',
  });
  const from = el('FIGURE', {}, [image]);
  const to = el('FIGURE', {}, [
    el('IMG', {
      src: '/cdn/hero.jpg',
      srcset: '/cdn/hero.jpg 1x, /cdn/hero@2x.jpg 2x',
      sizes: '100vw',
      class: 'rounded shadow',
      alt: 'Hero',
    }),
  ]);

  assert.equal(morph(from, to), true);
  assert.equal(from.childNodes[0], image, 'the same element, so the same decoded bitmap');
  assert.deepEqual(image.writes, ['class']);
  assert.deepEqual(image.removals, []);
  assert.equal(image.getAttribute('src'), '/cdn/hero.jpg');
});

test('an img whose source really changed does get the new source', () => {
  const image = el('IMG', { src: '/cdn/one.jpg', alt: 'One' });
  const from = el('FIGURE', {}, [image]);
  const to = el('FIGURE', {}, [el('IMG', { src: '/cdn/two.jpg', alt: 'Two' })]);

  assert.equal(morph(from, to), true);
  assert.equal(from.childNodes[0], image);
  assert.equal(image.getAttribute('src'), '/cdn/two.jpg');
  assert.deepEqual(image.writes, ['src', 'alt']);
});

test('imageSourceUnchanged only speaks about a pair of images', () => {
  const a = el('IMG', { src: '/one.jpg' });
  const b = el('IMG', { src: '/one.jpg' });
  const c = el('IMG', { src: '/one.jpg', srcset: '/one.jpg 1x' });
  const div = el('DIV', { src: '/one.jpg' });

  assert.equal(imageSourceUnchanged(a, b), true);
  assert.equal(imageSourceUnchanged(a, c), false);
  assert.equal(imageSourceUnchanged(div, div), false);
});

test('an untouched subtree beside a changed one is left entirely alone', () => {
  const image = el('IMG', { src: '/cdn/kids.jpg', alt: 'Kids' });
  const figure = el('FIGURE', { 'data-sanity': 'doc:media' }, [image]);
  const heading = text('Welcome');
  const from = el('MAIN', {}, [el('DIV', { 'data-sanity': 'doc:hero' }, [heading]), figure]);
  const to = el('MAIN', {}, [
    el('DIV', { 'data-sanity': 'doc:hero' }, [text('Welcome back')]),
    el('FIGURE', { 'data-sanity': 'doc:media' }, [
      el('IMG', { src: '/cdn/kids.jpg', alt: 'Kids' }),
    ]),
  ]);

  assert.equal(morph(from, to), true);
  assert.equal(heading.data, 'Welcome back');
  assert.equal(from.childNodes[1], figure);
  assert.equal(figure.childNodes[0], image);
  assert.deepEqual(image.writes, []);
  assert.deepEqual(figure.writes, []);
});

// ---------------------------------------------------------------------------
// Bail-outs — every one of these must leave the caller free to replaceWith
// ---------------------------------------------------------------------------

test('bails when the trees are deeper than the cap', () => {
  const chain = (depth: number): FakeElement =>
    depth === 0 ? el('SPAN', {}, [text('leaf')]) : el('DIV', {}, [chain(depth - 1)]);

  assert.equal(morph(chain(2), chain(2), { maxDepth: 3, maxNodes: 1000 }), true);
  assert.equal(morph(chain(20), chain(20), { maxDepth: 3, maxNodes: 1000 }), false);
});

test('bails when there are more nodes than the cap', () => {
  const wide = (count: number): FakeElement =>
    el(
      'UL',
      {},
      Array.from({ length: count }, () => el('LI', {}, [text('item')])),
    );

  assert.equal(morph(wide(3), wide(3), { maxDepth: 60, maxNodes: 1000 }), true);
  assert.equal(morph(wide(400), wide(400), { maxDepth: 60, maxNodes: 100 }), false);
});

test('bails when a DOM call throws, rather than letting it escape', () => {
  class Hostile extends FakeElement {
    setAttribute(): void {
      throw new Error('DOMException');
    }
  }
  const from = new Hostile('SECTION', { class: 'a' });
  const to = el('SECTION', { class: 'b' });

  assert.equal(morph(from, to), false);
});

test('bails when the two roots are not the same kind of node', () => {
  assert.equal(morph(el('MAIN'), el('SECTION')), false);
});

test('the default caps are generous enough for a real page', () => {
  assert.ok(DEFAULT_MORPH_LIMITS.maxDepth >= 40);
  assert.ok(DEFAULT_MORPH_LIMITS.maxNodes >= 10000);
});

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

test('a key is the attribute name and value, so two attributes cannot collide', () => {
  assert.equal(nodeKey(el('DIV', { id: 'a' })), 'id=a');
  assert.equal(nodeKey(el('DIV', { 'data-key': 'a' })), 'data-key=a');
  assert.equal(
    nodeKey(el('DIV', { 'data-sanity': 'x', id: 'y' })),
    'id=y',
    'id wins, first listed',
  );
  assert.equal(nodeKey(el('DIV', { id: '' })), undefined, 'an empty key is no key');
  assert.equal(nodeKey(el('DIV')), undefined);
  assert.equal(nodeKey(text('hello')), undefined);
});

test('sameKind wants both the type and the name', () => {
  assert.equal(sameKind(el('DIV'), el('DIV')), true);
  assert.equal(sameKind(el('DIV'), el('SPAN')), false);
  assert.equal(sameKind(text('a'), text('b')), true);
  assert.equal(sameKind(el('DIV'), text('a')), false);
});

// ---------------------------------------------------------------------------
// The fast path
// ---------------------------------------------------------------------------

test('a render matching the live page is redundant', () => {
  assert.equal(isRedundantRender('<main>a</main>', '<main>a</main>', null), true);
});

test('a render matching the last accepted one is redundant', () => {
  assert.equal(isRedundantRender('<main>a</main>', '<main>b</main>', '<main>a</main>'), true);
});

test('a render matching neither is applied', () => {
  assert.equal(isRedundantRender('<main>c</main>', '<main>a</main>', '<main>b</main>'), false);
  assert.equal(isRedundantRender('<main>c</main>', null, null), false);
});

test('an empty render is never redundant, even against an empty memory', () => {
  assert.equal(isRedundantRender('', '', ''), false);
  assert.equal(isRedundantRender('', null, null), false);
});
