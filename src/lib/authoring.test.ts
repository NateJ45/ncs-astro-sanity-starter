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
import { PAGE_TEMPLATES, TEMPLATE_GROUPS, templateMenuTitle } from '../sanity/pageTemplates.ts';
import { SECTION_PATTERNS } from '../sanity/sectionPatterns.ts';
import { pageWarnings, type PageRules } from './page-guardrails.ts';
import { checkPage, type PageCheckConfig } from './page-checks.ts';

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

/** Block type names declared in a schema library file ([] when a scaffold removed the file). */
function declaredTypes(file: string): string[] {
  const url = new URL(`../sanity/schemaTypes/${file}`, import.meta.url);
  if (!existsSync(url)) return [];
  const src = readFileSync(url, 'utf8');
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

// ── Template and pattern checks (PORTS.md card 173) ──────────────────────────

/** Every string anywhere in a value, skipping keys and type names. */
function stringsIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsIn(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === '_key' || k === '_type') continue;
      stringsIn(v, out);
    }
  }
  return out;
}

/** The string list items of one array in a source file, read as text. */
function listIn(file: string, name: string): string[] {
  const src = readFileSync(new URL(file, import.meta.url), 'utf8');
  const start = src.indexOf(name);
  assert.ok(start >= 0, `${name} not found in ${file}`);
  const open = src.indexOf('[', start);
  const body = src.slice(open, src.indexOf(']', open));
  return [...body.replace(/\/\/.*$/gm, '').matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
}

// The page checks and rules as the Studio runs them (pageBuilderConfig.ts and
// kit.config.ts import `sanity`, so their lists are read as text here).
const CHECKS = {
  selfFillingSections: listIn('../sanity/pageBuilderConfig.ts', 'const SELF_FILLING_SECTIONS'),
  extraSettingKeys: listIn('../sanity/pageBuilderConfig.ts', 'extraSettingKeys:'),
};
const SITE_RULES: PageRules = {
  appliesTo: ['page'],
  mustStartWith: listIn('../sanity/kit.config.ts', 'mustStartWith:'),
  atMostOnce: listIn('../sanity/kit.config.ts', 'atMostOnce:'),
  maxSections: 20,
};

// Site copy rules (rule 2 and docs/claude/communication-style.md): no em-dashes,
// no AI-tell words, US spelling, no prices.
const BANNED =
  /\b(delve|leverage|robust|seamless|tapestry|navigate|crucial|pivotal|meticulous|realm|transformative)\b/i;
const UK = /\b(colour|neighbour|favourite|honour|centre|practise|organis(e|ed|ing))\b/i;

function checkCopy(id: string, text: string) {
  assert.ok(!text.includes('—'), `${id}: em-dash in "${text}"`);
  assert.ok(!text.includes(' -- '), `${id}: double hyphen in "${text}"`);
  assert.ok(!BANNED.test(text), `${id}: AI-tell word in "${text}"`);
  assert.ok(!UK.test(text), `${id}: UK spelling in "${text}"`);
  assert.ok(!/\$\s?\d/.test(text), `${id}: a price in "${text}"`);
}

/** Field limits from the schema, so a template never opens with a red error to fix. */
const MAX_LENGTH: Record<string, Record<string, number>> = {
  tabPanel: { label: 30 },
  timelineEntry: { year: 12, title: 100 },
  countdownSection: { eventName: 80 },
  noticeSection: { message: 200, label: 30 },
  accordionItem: { question: 160 },
  quickLink: { note: 120 },
  eventDetailsSection: { eyebrow: 40, title: 80 },
  eventDate: { label: 60 },
  scheduleDay: { title: 50 },
  scheduleItem: { title: 80, note: 140 },
  photoCard: { title: 60, body: 240 },
  letterSection: { eyebrow: 60, greeting: 80 },
};
const COUNT: Record<string, [string, number, number]> = {
  buttonRowSection: ['links', 2, 6],
  tabsSection: ['tabs', 2, 5],
  columnsSection: ['textColumns', 2, 3],
  accordionSection: ['items', 1, 20],
  timelineSection: ['entries', 1, 30],
  eventDetailsSection: ['occurrences', 1, 12],
  scheduleSection: ['days', 1, 6],
  scheduleDay: ['items', 1, 20],
  photoCardsSection: ['cards', 2, 6],
  statSection: ['stats', 0, 4],
};
const REQUIRED: Record<string, string[]> = {
  heroSection: ['headline'],
  ctaBandSection: ['headline'],
  countdownSection: ['eventName', 'startDate'],
  noticeSection: ['message'],
  timelineEntry: ['year', 'title'],
  accordionItem: ['question'],
  tabPanel: ['label'],
  eventDetailsSection: ['title', 'place'],
  eventDate: ['date'],
  scheduleItem: ['title'],
  photoCard: ['title'],
  letterSection: ['greeting', 'name'],
};

function checkLimits(id: string, value: unknown) {
  for (const obj of [value, ...arrayMembers(value)].flatMap((v) => (Array.isArray(v) ? v : [v]))) {
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as Record<string, unknown>;
    const type = String(o._type);
    for (const [field, max] of Object.entries(MAX_LENGTH[type] ?? {})) {
      const v = o[field];
      if (typeof v === 'string')
        assert.ok(v.length <= max, `${id}: ${type}.${field} is over ${max}: "${v}"`);
    }
    const count = COUNT[type];
    if (count) {
      const list = o[count[0]];
      const n = Array.isArray(list) ? list.length : 0;
      assert.ok(n >= count[1] && n <= count[2], `${id}: ${type} needs ${count[1]}-${count[2]}`);
    }
    for (const field of REQUIRED[type] ?? []) {
      assert.ok(typeof o[field] === 'string' && o[field], `${id}: ${type}.${field} is required`);
    }
  }
}

// A custom page takes the general blocks (sections.ts, which spreads the builder
// kit's builderSections.ts) and the rich ones; a template never starts with a
// synced section (it would point at nothing).
const LIBRARY = [
  ...declaredTypes('sections.ts'),
  ...declaredTypes('builderSections.ts'),
  ...declaredTypes('richSections.ts'),
  // Each in a file of its own (card 197); the documents one goes with its scaffold capability.
  ...declaredTypes('latestVideoSection.ts'),
  ...declaredTypes('documentsSection.ts'),
].filter((t) => t !== 'syncedSection');

// The blocks a main page is built around (card 190). They are offered on their own page only, so
// they are not in LIBRARY (a custom page or a saved section never takes them), but each still needs
// a fixture on the wall and a thumbnail in the + Add menu. journalPostsSection.ts is deleted by
// `npm run scaffold -- --remove journal`, so it is read only when it is there.
const PAGE_BLOCKS = [
  ...declaredTypes('mainPageSections.ts'),
  ...(existsSync(new URL('../sanity/schemaTypes/journalPostsSection.ts', import.meta.url))
    ? declaredTypes('journalPostsSection.ts')
    : []),
];

describe('page templates (src/sanity/pageTemplates.ts)', () => {
  const allowed = new Set(LIBRARY);

  it('has a blank page and unique ids', () => {
    const ids = PAGE_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, 'template ids must be unique');
    assert.ok(
      PAGE_TEMPLATES.some((t) => t.sections().length === 0),
      'one template should start empty',
    );
  });

  it('every template sits in a known group, and the list is in group order', () => {
    const order = PAGE_TEMPLATES.map((t) => TEMPLATE_GROUPS.indexOf(t.group));
    assert.ok(!order.includes(-1), 'a template names a group that is not in TEMPLATE_GROUPS');
    assert.deepEqual(
      order,
      [...order].sort((a, b) => a - b),
      'keep templates in group order',
    );
    for (const g of TEMPLATE_GROUPS) {
      assert.ok(
        PAGE_TEMPLATES.some((t) => t.group === g),
        `group ${g} has no templates`,
      );
    }
    const menu = PAGE_TEMPLATES.map(templateMenuTitle);
    assert.equal(new Set(menu).size, menu.length, 'two templates read the same in the menu');
    assert.equal(menu[0], `${PAGE_TEMPLATES[0].group}: ${PAGE_TEMPLATES[0].title}`);
  });

  for (const template of PAGE_TEMPLATES) {
    it(`${template.id}: copy follows the site copy rules`, () => {
      for (const text of stringsIn(template.sections())) checkCopy(template.id, text);
      checkCopy(template.id, template.title);
      checkCopy(template.id, template.description);
    });

    it(`${template.id}: passes the page rules with no warning but "example text"`, () => {
      const sections = template.sections();
      if (!sections.length) return;
      for (const w of pageWarnings(sections, 'page', SITE_RULES, CHECKS)) {
        assert.match(w.message, /example text/, `${template.id}: ${w.message}`);
      }
    });

    it(`${template.id}: stays inside the schema's limits`, () => {
      checkLimits(template.id, template.sections());
    });

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

describe('section patterns (src/sanity/sectionPatterns.ts)', () => {
  // A saved section accepts the general and rich blocks (sectionPreset.ts), never a synced one.
  const allowed = new Set(LIBRARY);

  it('has unique ids', () => {
    const ids = SECTION_PATTERNS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  for (const pattern of SECTION_PATTERNS) {
    it(`${pattern.id}: is a valid saved section with fresh keys and example text`, () => {
      const sections = pattern.sections();
      assert.ok(sections.length >= 1 && sections.length <= 12, 'a saved section holds 1 to 12');
      for (const s of sections) {
        assert.ok(allowed.has(String(s._type)), `${pattern.id} uses unknown block ${s._type}`);
      }
      for (const member of arrayMembers(sections)) {
        assert.equal(typeof member._key, 'string', `${pattern.id}: a member has no _key`);
      }
      const keys = keysIn(sections);
      assert.equal(new Set(keys).size, keys.length, `${pattern.id}: duplicate keys`);
      assert.notDeepEqual(keys, keysIn(pattern.sections()), 'each copy must get fresh keys');
      assert.ok(hasExampleText(sections), `${pattern.id} has no example marker`);
    });

    it(`${pattern.id}: copy follows the site copy rules and the schema's limits`, () => {
      for (const text of [pattern.title, pattern.note, ...stringsIn(pattern.sections())]) {
        checkCopy(pattern.id, text);
      }
      checkLimits(pattern.id, pattern.sections());
      for (const w of pageWarnings(pattern.sections(), 'sectionPreset', SITE_RULES, CHECKS)) {
        assert.match(w.message, /example text/, `${pattern.id}: ${w.message}`);
      }
    });
  }
});

describe('section thumbnails (the grid view of the + Add menu)', () => {
  const types = [...LIBRARY, ...PAGE_BLOCKS];
  const wall = readFileSync(new URL('../pages/styleguide/sections.astro', import.meta.url), 'utf8');

  for (const type of types) {
    it(`${type} is on the /styleguide/sections/ wall and has a thumbnail`, () => {
      assert.ok(wall.includes(`_type: '${type}'`), `add a ${type} fixture to the sections wall`);
      const file = new URL(`../../public/section-thumbnails/${type}.jpg`, import.meta.url);
      assert.ok(existsSync(file), `run npm run thumbnails to shoot ${type}`);
    });
  }
});

// A block that fills itself from a collection or another tab must not be told it is empty
// (PORTS.md card 187). A fresh one of each listed block, nothing typed, raises no "empty" finding.
describe('self-filling blocks (pageBuilderConfig.ts SELF_FILLING_SECTIONS)', () => {
  const config: PageCheckConfig = {
    sectionArrays: ['pageBuilder'],
    selfFillingSections: CHECKS.selfFillingSections,
    codeOwnedPaths: [],
  };
  for (const type of CHECKS.selfFillingSections) {
    it(`${type}: a fresh one raises no empty-section finding`, () => {
      const doc = { pageBuilder: [{ _type: type, _key: 'k1' }] };
      const empty = checkPage(doc, config).find((g) => g.id === 'empty')!;
      assert.deepEqual(empty.findings, []);
    });
  }
});
