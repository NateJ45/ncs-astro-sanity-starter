// Safe to edit by hand
// Pins the authoring kit's pure logic (PORTS.md card 109): fresh keys, patterns,
// synced-section expansion, the example-text marker, and the page templates
// themselves (every block type they use exists, every array member has a key).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  EXAMPLE_PREFIX,
  example,
  expandSyncedSections,
  freshKeys,
  hasExampleText,
  patternCopies,
  patternsFrom,
  syncedBlockFor,
  typesNotAllowed,
} from './authoring.ts';
import { PAGE_TEMPLATES } from '../sanity/pageTemplates.ts';

const counter = () => {
  let n = 0;
  return () => `k${++n}`;
};

/** Every `_key` anywhere in a value. */
function keysIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keysIn(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === '_key' && typeof v === 'string') out.push(v);
      else keysIn(v, out);
    }
  }
  return out;
}

/** Every object that sits directly in an array, anywhere in a value. */
function arrayMembers(value: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v as Record<string, unknown>);
      arrayMembers(v, out);
    }
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => arrayMembers(v, out));
  }
  return out;
}

/** Block type names declared in a schema library file. */
function declaredTypes(file: string): string[] {
  const src = readFileSync(new URL(`../sanity/schemaTypes/${file}`, import.meta.url), 'utf8');
  return [...src.matchAll(/defineType\(\{\s*name:\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
}

describe('freshKeys', () => {
  it('replaces every key at every depth and leaves the original alone', () => {
    const original = {
      _type: 'heroSection',
      _key: 'old',
      items: [{ _key: 'a', text: 'x', inner: [{ _key: 'b' }] }],
    };
    const copy = freshKeys(original, counter());
    assert.deepEqual(keysIn(copy).sort(), ['k1', 'k2', 'k3']);
    assert.equal(original._key, 'old');
    assert.equal(original.items[0]._key, 'a');
  });

  it('gives a key to an array member that had none', () => {
    const copy = freshKeys({ list: [{ text: 'no key' }] }, counter());
    assert.equal((copy.list[0] as { _key?: string })._key, 'k1');
  });

  it('does not invent a key on a plain object field', () => {
    const copy = freshKeys({ cta: { label: 'Go' } }, counter()) as { cta: Record<string, unknown> };
    assert.equal('_key' in copy.cta, false);
  });
});

describe('patterns', () => {
  const docs = [
    { _id: 'p2', title: 'Zebra band', section: [{ _type: 'ctaBandSection', _key: 'z' }] },
    { _id: 'p1', title: 'Old name', section: [{ _type: 'heroSection', _key: 'h' }] },
    {
      _id: 'drafts.p1',
      title: 'Apple pattern',
      note: 'two sections',
      section: [
        { _type: 'heroSection', _key: 'h' },
        { _type: 'faqSection', _key: 'f' },
        'not a section',
      ],
    },
  ];

  it('collapses draft and published twins, draft words winning, sorted by name', () => {
    const list = patternsFrom(docs);
    assert.deepEqual(
      list.map((p) => [p.id, p.title]),
      [
        ['p1', 'Apple pattern'],
        ['p2', 'Zebra band'],
      ],
    );
    assert.deepEqual(list[0].types, ['heroSection', 'faqSection']);
    assert.equal(list[0].sections.length, 2, 'junk entries are dropped');
    assert.equal(list[0].published, true);
    assert.equal(patternsFrom([{ _id: 'drafts.new', section: [] }])[0].published, false);
  });

  it('keeps an old single-section saved section working', () => {
    const [only] = patternsFrom([{ _id: 'x', section: [{ _type: 'quoteSection', _key: 'q' }] }]);
    assert.equal(only.sections.length, 1);
    assert.equal(only.title, '(unnamed saved section)');
  });

  it('names the types a list will not accept', () => {
    const [apple] = patternsFrom(docs);
    assert.deepEqual(typesNotAllowed(apple, ['heroSection', 'ctaBandSection']), ['faqSection']);
    assert.deepEqual(typesNotAllowed(apple, ['heroSection', 'faqSection']), []);
  });

  it('copies with fresh keys, so a pattern can go on one page twice', () => {
    const [apple] = patternsFrom(docs);
    const first = patternCopies(apple, counter());
    const second = patternCopies(apple);
    assert.equal(first.length, 2);
    assert.notDeepEqual(keysIn(first), keysIn(second));
    assert.equal(apple.sections[0]._key, 'h', 'the saved copy is untouched');
  });

  it('builds a synced block that references the published id', () => {
    const [apple] = patternsFrom(docs);
    assert.deepEqual(
      syncedBlockFor(apple, () => 'new'),
      {
        _type: 'syncedSection',
        _key: 'new',
        preset: { _type: 'reference', _ref: 'p1' },
      },
    );
  });
});

describe('expandSyncedSections', () => {
  it('swaps a synced block for its sections, keeping the outer key for editing', () => {
    const out = expandSyncedSections([
      { _type: 'heroSection', _key: 'a' },
      {
        _type: 'syncedSection',
        _key: 's',
        sections: [
          { _type: 'quoteSection', _key: 'q' },
          { _type: 'ctaBandSection', _key: 'c' },
        ],
      },
      { _type: 'richTextSection', _key: 'b' },
    ] as { _type: string; _key: string }[]);
    assert.deepEqual(
      out.map((s) => [s._type, s._key, (s as { _editKey?: string })._editKey]),
      [
        ['heroSection', 'a', undefined],
        ['quoteSection', 's-q', 's'],
        ['ctaBandSection', 's-c', 's'],
        ['richTextSection', 'b', undefined],
      ],
    );
  });

  it('renders nothing for a missing saved section and never nests', () => {
    const out = expandSyncedSections([
      { _type: 'syncedSection', _key: 'gone', sections: null },
      { _type: 'syncedSection', _key: 'n', sections: [{ _type: 'syncedSection', _key: 'x' }] },
    ] as unknown as { _type: string }[]);
    assert.deepEqual(out, []);
  });

  it('copes with no sections at all', () => {
    assert.deepEqual(expandSyncedSections(undefined), []);
  });
});

describe('example text', () => {
  it('finds the marker at any depth, and only at the start of a string', () => {
    assert.equal(hasExampleText({ a: [{ b: example('Say hello') }] }), true);
    assert.equal(hasExampleText({ a: 'Real words. Example: not a marker here' }), false);
    assert.equal(example('x').startsWith(EXAMPLE_PREFIX), true);
  });
});

describe('page templates (src/sanity/pageTemplates.ts)', () => {
  const allowed = new Set(declaredTypes('sections.ts'));

  it('has a blank page and unique ids', () => {
    const ids = PAGE_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, 'template ids must be unique');
    assert.ok(
      PAGE_TEMPLATES.some((t) => t.sections().length === 0),
      'one template should start empty',
    );
  });

  for (const template of PAGE_TEMPLATES) {
    it(`${template.id}: uses only blocks a custom page accepts`, () => {
      for (const s of template.sections()) {
        assert.ok(allowed.has(String(s._type)), `${template.id} uses unknown block ${s._type}`);
      }
    });

    it(`${template.id}: every array member has a type and a key, all different`, () => {
      const sections = template.sections();
      for (const member of arrayMembers(sections)) {
        assert.equal(typeof member._key, 'string', `${template.id}: a member has no _key`);
      }
      const keys = keysIn(sections);
      assert.equal(new Set(keys).size, keys.length, `${template.id}: duplicate keys`);
      const again = keysIn(template.sections());
      if (keys.length) assert.notDeepEqual(keys, again, 'each new page must get fresh keys');
    });

    it(`${template.id}: text is marked as example text`, () => {
      const sections = template.sections();
      if (sections.length)
        assert.ok(hasExampleText(sections), `${template.id} has no example marker`);
    });
  }
});

describe('section thumbnails (the grid view of the + Add menu)', () => {
  const types = [...declaredTypes('sections.ts'), ...declaredTypes('richSections.ts')].filter(
    (t) => t !== 'syncedSection',
  );
  const wall = readFileSync(new URL('../pages/styleguide/sections.astro', import.meta.url), 'utf8');

  for (const type of types) {
    it(`${type} is on the /styleguide/sections/ wall and has a thumbnail`, () => {
      assert.ok(wall.includes(`_type: '${type}'`), `add a ${type} fixture to the sections wall`);
      const file = new URL(`../../public/section-thumbnails/${type}.jpg`, import.meta.url);
      assert.ok(existsSync(file), `run npm run thumbnails to shoot ${type}`);
    });
  }
});
