// =============================================================================
// section-fields - the DRIFT GATE for the in-canvas control registry
// =============================================================================
// src/lib/section-fields.ts duplicates knowledge that really lives in the two
// block libraries: which section types carry `headingAccent`, which heading
// field each one's accent word is matched against, and which types have a rich
// twin. The overlay cannot read the Studio's schema at runtime (it ships in the
// site's preview island, and the schema lives in the parent window), so the
// duplicate is the only way to have the feature at all.
//
// This test is the price of that duplicate. It parses sections.ts and
// richSections.ts and re-derives all three answers from the source, so a block
// that gains or loses a control fails `npm test` instead of shipping a button
// that writes to a field the schema does not have - or, worse, silently NOT
// offering a control a section now deserves.
//
// It also pins the architectural rule the feature is built around: CLAUDE.md #9
// says a page-builder block carries no surface or colour field, so there is no
// band control here and there must never be a field for one to write to.
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HEADING_ACCENT_FIELDS,
  HERO_TEXT_FIELDS,
  RICH_TWINS,
  headingAccentFieldFor,
  overlayControlsForPath,
  resolveAccentTarget,
  resolveTextTarget,
  richTwinFor,
  type RichTwin,
} from './section-fields.ts';

const BLOCK_LIBRARIES = ['sections', 'richSections'] as const;

function readLibrary(name: string): string {
  return readFileSync(new URL(`../sanity/schemaTypes/${name}.ts`, import.meta.url), 'utf8');
}

interface ParsedType {
  name: string;
  /** The heading field its accent word is matched against, when it has one. */
  accentHeading: string | null;
  /** Its rich twin, when it has one. */
  twin: RichTwin | null;
}

/**
 * Re-derive the registry from the schema source.
 *
 * The heading field is NOT simply "the field declared before
 * headingAccentField()": four of the five types declare a `scriptAccent` string
 * in between. It is the last `heading` or `headline` field declared above the
 * call, which is the one the field's own description points at.
 */
function parseLibrary(source: string): ParsedType[] {
  const chunks = source.split('defineType({').slice(1);
  return chunks.map((chunk) => {
    const name = chunk.match(/name:\s*'([A-Za-z0-9_]+)'/)?.[1] ?? '';

    let accentHeading: string | null = null;
    const accentAt = chunk.indexOf('headingAccentField()');
    if (accentAt >= 0) {
      const above = [...chunk.slice(0, accentAt).matchAll(/name:\s*'(heading|headline)'/g)];
      assert.ok(
        above.length > 0,
        `${name} calls headingAccentField() with no heading field above it`,
      );
      accentHeading = above[above.length - 1][1];
    }

    let twin: RichTwin | null = null;
    const rich = chunk.match(/richTwin\('([A-Za-z0-9_]+)'/)?.[1];
    if (rich) {
      const plainName = rich.replace(/Rich$/, '');
      assert.notEqual(
        plainName,
        rich,
        `${name}'s twin ${rich} does not follow the <name>Rich rule`,
      );
      assert.ok(
        chunk.includes(`name: '${plainName}'`),
        `${name} has ${rich} but no plain ${plainName} field beside it`,
      );
      assert.ok(
        chunk.includes(`hideWhenRich('${rich}')`),
        `${name}'s plain field is not hidden once ${rich} holds text`,
      );
      twin = { plain: plainName, rich };
    }

    return { name, accentHeading, twin };
  });
}

const PARSED = BLOCK_LIBRARIES.flatMap((file) => parseLibrary(readLibrary(file)));

describe('the registry matches the schema', () => {
  it('every section type is named', () => {
    assert.ok(PARSED.length > 15, 'the block libraries did not parse');
    for (const type of PARSED) assert.notEqual(type.name, '');
  });

  it('the heading-accent map lists exactly the types that have the field', () => {
    const derived = Object.fromEntries(
      PARSED.filter((t) => t.accentHeading).map((t) => [t.name, t.accentHeading]),
    );
    assert.deepEqual(derived, HEADING_ACCENT_FIELDS);
  });

  it('the rich-twin map lists exactly the types that have a twin', () => {
    const derived = Object.fromEntries(PARSED.filter((t) => t.twin).map((t) => [t.name, t.twin]));
    assert.deepEqual(derived, RICH_TWINS);
  });

  // The popover writes to these by path alone, with no type check, so a rename
  // in a page singleton would leave the card editing a field nobody reads.
  it('every hero text field still exists in a page schema', () => {
    const all = readFileSync(new URL('../sanity/schemaTypes/faqPage.ts', import.meta.url), 'utf8')
      .concat(
        readFileSync(new URL('../sanity/schemaTypes/contactPage.ts', import.meta.url), 'utf8'),
      )
      .concat(
        readFileSync(new URL('../sanity/schemaTypes/privacyPage.ts', import.meta.url), 'utf8'),
      );
    for (const field of Object.keys(HERO_TEXT_FIELDS)) {
      assert.ok(all.includes(`name: '${field}'`), `${field} is gone from the page singletons`);
    }
  });

  // CLAUDE.md #9, as a test rather than a promise. If this ever fails, the fix
  // is to remove the field, not to add a control for it: SectionRenderer owns
  // the band cadence so that reordering a page cannot break its rhythm.
  it('no page-builder block carries a surface or colour field', () => {
    for (const file of BLOCK_LIBRARIES) {
      const source = readLibrary(file);
      for (const forbidden of ['tone', 'surface', 'background', 'accent', 'bandColor']) {
        assert.ok(
          !source.includes(`name: '${forbidden}'`),
          `${file}.ts declares a '${forbidden}' field; see CLAUDE.md #9`,
        );
      }
    }
  });
});

describe('overlayControlsForPath', () => {
  it('offers the word picker on a heading that carries an accent field', () => {
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"].heading'), ['headingAccent']);
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"].headline'), ['headingAccent']);
    assert.deepEqual(overlayControlsForPath('additionalSections[_key=="a"].headline'), [
      'headingAccent',
    ]);
  });

  it('offers the text card on either half of a rich twin', () => {
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"].subhead'), ['text']);
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"].subheadRich'), ['text']);
    assert.deepEqual(
      overlayControlsForPath(
        'pageBuilder[_key=="a"].subheadRich[_key=="b"].children[_key=="c"].text',
      ),
      ['text'],
    );
  });

  it('offers the text card on the two document-level hero strings', () => {
    assert.deepEqual(overlayControlsForPath('heroHeadline'), ['text']);
    assert.deepEqual(overlayControlsForPath('heroSubhead'), ['text']);
  });

  // The bare array-item path is the one that cost a whole first implementation:
  // the host resolves no FIELD for an array item, so the resolver is never even
  // called. Nothing may rely on it.
  it('offers nothing on a bare section item, or on anything else', () => {
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"]'), []);
    assert.deepEqual(overlayControlsForPath('pageBuilder[_key=="a"].eyebrow'), []);
    assert.deepEqual(overlayControlsForPath('heroEyebrow'), []);
    assert.deepEqual(overlayControlsForPath('navItems[_key=="n"].label'), []);
    assert.deepEqual(overlayControlsForPath(''), []);
    assert.deepEqual(overlayControlsForPath(undefined), []);
  });
});

describe('headingAccentFieldFor and richTwinFor confirm by type', () => {
  it('pairs the clicked field with the type that owns it', () => {
    assert.equal(headingAccentFieldFor('ctaBandSection', 'headline'), 'headline');
    // The CTA band's big line is `headline`, so a click on a `heading` there is
    // some other string and must not open the picker.
    assert.equal(headingAccentFieldFor('ctaBandSection', 'heading'), null);
    assert.equal(headingAccentFieldFor('richTextSection', 'heading'), 'heading');
    assert.equal(headingAccentFieldFor('gallerySection', 'heading'), null);
    assert.equal(headingAccentFieldFor('ctaBandSection'), 'headline');
  });

  it('resolves either half of a twin, and nothing on a type without one', () => {
    assert.deepEqual(richTwinFor('faqSection', 'subhead'), {
      plain: 'subhead',
      rich: 'subheadRich',
    });
    assert.deepEqual(richTwinFor('faqSection', 'subheadRich'), {
      plain: 'subhead',
      rich: 'subheadRich',
    });
    assert.equal(richTwinFor('faqSection', 'eyebrow'), null);
    assert.equal(richTwinFor('heroSection', 'subhead'), null);
  });
});

describe('resolveTextTarget', () => {
  const doc = {
    heroHeadline: 'Everything You Want to Know.',
    pageBuilder: [
      { _key: 'a', _type: 'faqSection', headline: 'Questions', subhead: 'The short answers.' },
      {
        _key: 'b',
        _type: 'ctaBandSection',
        headline: 'Ready?',
        subhead: 'ignored',
        subheadRich: [
          {
            _type: 'block',
            children: [
              { _type: 'span', text: 'Book a ', marks: [] },
              { _type: 'span', text: 'call', marks: ['strong'] },
            ],
          },
        ],
      },
      { _key: 'c', _type: 'gallerySection', heading: 'Work' },
    ],
  };

  it('reads a document-level hero string', () => {
    const target = resolveTextTarget(doc, 'heroHeadline');
    assert.equal(target?.kind, 'plain');
    assert.deepEqual(target?.path, ['heroHeadline']);
    assert.equal(target?.text, 'Everything You Want to Know.');
    assert.equal(target?.rows, 2);
  });

  // The point of the twin: an editor's first bold keeps the words that were
  // already in the plain string underneath.
  it('seeds an empty twin from the plain string', () => {
    const target = resolveTextTarget(doc, 'pageBuilder[_key=="a"].subhead');
    assert.equal(target?.kind, 'rich');
    assert.deepEqual(target?.path, ['pageBuilder', { _key: 'a' }, 'subheadRich']);
    assert.deepEqual(target?.runs, [{ text: 'The short answers.', strong: false, em: false }]);
    assert.equal(target?.label, 'Subhead');
  });

  it('reads a twin that already holds text, marks and all', () => {
    const target = resolveTextTarget(doc, 'pageBuilder[_key=="b"].subheadRich');
    assert.deepEqual(target?.runs, [
      { text: 'Book a ', strong: false, em: false },
      { text: 'call', strong: true, em: false },
    ]);
  });

  it('returns null for a section type with no twin, and for an unknown key', () => {
    assert.equal(resolveTextTarget(doc, 'pageBuilder[_key=="c"].heading'), null);
    assert.equal(resolveTextTarget(doc, 'pageBuilder[_key=="zz"].subhead'), null);
    assert.equal(resolveTextTarget(doc, 'heroEyebrow'), null);
  });
});

describe('resolveAccentTarget', () => {
  const doc = {
    pageBuilder: [
      {
        _key: 'a',
        _type: 'ctaBandSection',
        headline: 'Ready when you are',
        headingAccent: 'Ready',
      },
      { _key: 'b', _type: 'richTextSection', heading: 'How we work' },
      { _key: 'c', _type: 'gallerySection', heading: 'Work' },
    ],
  };

  it('points at the heading the type actually uses, and at the accent beside it', () => {
    const cta = resolveAccentTarget(doc, 'pageBuilder[_key=="a"].headline');
    assert.deepEqual(cta?.headingPath, ['pageBuilder', { _key: 'a' }, 'headline']);
    assert.deepEqual(cta?.accentPath, ['pageBuilder', { _key: 'a' }, 'headingAccent']);

    const text = resolveAccentTarget(doc, 'pageBuilder[_key=="b"].heading');
    assert.deepEqual(text?.headingPath, ['pageBuilder', { _key: 'b' }, 'heading']);
  });

  it('refuses a type that has no accent field, and a document-level path', () => {
    assert.equal(resolveAccentTarget(doc, 'pageBuilder[_key=="c"].heading'), null);
    assert.equal(resolveAccentTarget(doc, 'heroHeadline'), null);
    assert.equal(resolveAccentTarget(doc, 'pageBuilder[_key=="a"]'), null);
  });
});
