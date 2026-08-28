import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLUMN_VARIANTS,
  columnFallback,
  columnOptions,
  columnsClass,
  sideOptions,
} from './layout-variants.ts';

// The class strings each section rendered BEFORE src/lib/layout-variants.ts
// existed, copied out of the components by hand. This block is the parity gate:
// if someone "tidies" the registry into a formula, the default of every live
// section moves and this fails first, in milliseconds, instead of showing up as
// a diff in the page-parity harness minutes later.
const BEFORE: Record<string, Record<string, string>> = {
  gallerySection: {
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-2 lg:grid-cols-3',
    '4': 'sm:grid-cols-2 lg:grid-cols-4',
  },
  // Both of these were hard-wired: the string under '3' is what was inline in
  // the component, and it is what a section with no stored value still emits.
  valuesSection: { '3': 'md:grid-cols-3' },
  dynamicListSection: { '3': 'sm:grid-cols-2 lg:grid-cols-3' },
};

describe('columnsClass', () => {
  it('emits the exact classes each section rendered before the registry existed', () => {
    for (const [type, byValue] of Object.entries(BEFORE)) {
      for (const [value, cls] of Object.entries(byValue)) {
        assert.equal(columnsClass(type, Number(value)), cls, `${type} / ${value}`);
      }
    }
  });

  it('falls back to the section default for an unset value', () => {
    for (const type of Object.keys(COLUMN_VARIANTS)) {
      const fallback = columnsClass(type, COLUMN_VARIANTS[type].fallback);
      assert.equal(columnsClass(type, undefined), fallback, type);
      assert.equal(columnsClass(type, null), fallback, type);
      assert.equal(columnsClass(type, ''), fallback, type);
    }
  });

  it('accepts the number the schema stores and the string a patch script leaves', () => {
    // gallerySection.columns is `type: 'number'`, so the dataset holds 2 / 3 / 4.
    // A hand-written patch or an import can leave "2" instead; both must land
    // on the same classes rather than silently reverting to the default.
    for (const type of Object.keys(COLUMN_VARIANTS)) {
      assert.equal(columnsClass(type, 2), columnsClass(type, '2'), type);
      assert.equal(columnsClass(type, 3), columnsClass(type, '3'), type);
    }
  });

  it('falls back for a value outside the offered list', () => {
    // Values and the auto list offer two and three only. A stray 4 must not
    // render an empty class attribute, it must render what the page already had.
    assert.equal(columnsClass('valuesSection', 4), columnsClass('valuesSection', 3));
    assert.equal(columnsClass('dynamicListSection', 4), columnsClass('dynamicListSection', 3));
  });

  it('returns nothing for a section that has no column control', () => {
    assert.equal(columnsClass('quoteSection', 2), '');
    assert.equal(columnOptions('quoteSection').length, 0);
    assert.equal(columnFallback('quoteSection'), undefined);
  });
});

describe('COLUMN_VARIANTS', () => {
  it('offers every option a class, and defaults to an offered value', () => {
    for (const [type, spec] of Object.entries(COLUMN_VARIANTS)) {
      const offered = spec.options.map((o) => o.value);
      assert.ok(offered.includes(spec.fallback), `${type}: default is not in the list`);
      for (const value of offered) {
        assert.ok(spec.classes[String(value)], `${type} / ${value}: no classes`);
      }
      assert.deepEqual(
        Object.keys(spec.classes).sort(),
        offered.map(String).sort(),
        `${type}: classes and options disagree`,
      );
    }
  });

  it('never varies the phone layout', () => {
    // THE REFLOW INVARIANT. Replay what a 320px browser actually does: take the
    // section's own base grid class, apply the option's UNPREFIXED classes over
    // it (`sm:`, `md:` and `lg:` do not apply at 320px), and check the result is
    // the section's declared phoneColumns every time. While this holds, the
    // reflow sweep over the live pages covers every option, because no option
    // can produce a 320px layout the sweep has not already measured.
    for (const [type, spec] of Object.entries(COLUMN_VARIANTS)) {
      for (const option of spec.options) {
        const applied = [spec.baseColumns, ...spec.classes[String(option.value)].split(' ')]
          .filter((c) => c.startsWith('grid-cols-'))
          .at(-1);
        assert.equal(
          applied,
          spec.phoneColumns,
          `${type} / ${option.value}: a column choice moves the phone layout`,
        );
      }
    }
  });

  it('records the base grid class each component really carries', () => {
    // `baseColumns` is a copy of something that lives in an .astro file, and a
    // copy that nothing checks is a copy that goes stale. So read the component
    // and pull the base classes out of the element that interpolates colClass,
    // the same way surfaces.test.ts resolves its tokens against globals.css.
    //
    // Two spellings, because this template uses both: a template literal
    // (`class={\`... ${colClass} ...\`}`) and Astro's class:list array. The
    // first capture that yields any grid-cols-* class wins.
    const COMPONENT: Record<string, string> = {
      gallerySection: 'GalleryGrid',
      valuesSection: 'ValuesSection',
      dynamicListSection: 'DynamicList',
    };
    const PATTERNS = [/class=\{`([^`]*)\$\{colClass\}/, /class:list=\{\[([^\]]*?)colClass/];

    for (const [type, spec] of Object.entries(COLUMN_VARIANTS)) {
      const file = new URL(`../components/sections/${COMPONENT[type]}.astro`, import.meta.url);
      const src = readFileSync(file, 'utf8');
      const match = PATTERNS.map((p) => src.match(p)).find(Boolean);
      assert.ok(match, `${COMPONENT[type]}: no element interpolates colClass`);
      const base = match[1]
        .split(/[\s',]+/)
        .filter((c) => c.startsWith('grid-cols-'))
        .join(' ');
      assert.equal(base, spec.baseColumns, `${type}: baseColumns is out of date`);
    }
  });

  it('gives every option a plain-language title', () => {
    for (const spec of Object.values(COLUMN_VARIANTS)) {
      for (const option of spec.options) {
        assert.match(option.title, /across$/);
        assert.equal(typeof option.value, 'number');
      }
    }
  });
});

describe('sideOptions', () => {
  it('stores left and right, and says what moves', () => {
    assert.deepEqual(sideOptions('Image'), [
      { title: 'Image on the left', value: 'left' },
      { title: 'Image on the right', value: 'right' },
    ]);
  });
});
