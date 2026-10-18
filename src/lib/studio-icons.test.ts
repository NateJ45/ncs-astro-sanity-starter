// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio icon gate (PORTS.md card 119). Three parts:
//   1. The pure pieces in studio-icons.ts: the maps, the tile colours, the
//      schema decorator, the subtitle helpers.
//   2. COVERAGE: every document type this site registers has a meaning (so an
//      icon) and a preview, and sanity.config.ts runs the decorator that gives
//      every preview a picture. A new type without a meaning fails here.
//   3. The art file only names meanings that exist.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBrandPreviews,
  BRAND_ICON_KEYS,
  iconMaps,
  iconTileColors,
  previewDate,
  previewSubtitle,
  TILE_MIN_CONTRAST,
  type BrandIconKey,
} from './studio-icons.ts';
import { contrastRatio } from './contrast.ts';
import { studioColorInput, studioColors, TINTS, type Scale } from './studio-theme.ts';

const require = createRequire(import.meta.url);
const { color } = require('@sanity/color') as {
  color: Record<string, Record<string, { hex: string }> | { hex: string }>;
};
const hex = (v: unknown) => (v as { hex: string }).hex;
const scaleOf = (hue: unknown) =>
  Object.fromEntries(TINTS.map((t) => [t, hex((hue as Record<string, unknown>)[t])])) as Scale;
const stock = {
  blue: scaleOf(color.blue),
  gray: scaleOf(color.gray),
  white: hex(color.white),
  black: hex(color.black),
};

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, root)), 'utf8');
const brand = JSON.parse(read('brand/brand.config.json'));

// ---------------------------------------------------------------------------
// 1. The pure pieces
// ---------------------------------------------------------------------------

describe('iconMaps', () => {
  it('lays brand.config.json over the defaults and drops unknown meanings', () => {
    const maps = iconMaps({
      types: { sermon: 'scripture', page: 'sections', oops: 'not-a-meaning' },
      tools: { home: 'place' },
    });
    assert.equal(maps.types.sermon, 'scripture');
    assert.equal(maps.types.page, 'sections');
    assert.equal(maps.types.oops, undefined);
    assert.equal(maps.tools.home, 'place');
    assert.equal(maps.groups.seo, 'search');
    assert.equal(maps.ignored.length, 1);
  });

  it('every default names a real meaning', () => {
    const maps = iconMaps(undefined);
    for (const m of [maps.types, maps.groups, maps.tools]) {
      for (const key of Object.values(m)) assert.ok(BRAND_ICON_KEYS.includes(key), key);
    }
  });

  it("this site's brand.config.json has no unknown meanings", () => {
    assert.deepEqual(iconMaps(brand.studio?.icons).ignored, []);
  });
});

describe('iconTileColors', () => {
  const accents = ['#586577', '#C4401F', '#235E93', '#E8A93A', '#2C5B3A', '#7A1F5C', '#111111'];
  for (const accent of accents) {
    it(`a one-colour icon reads on its tile in both schemes (accent ${accent})`, () => {
      const colors = studioColors(
        studioColorInput({ ...brand, studio: { ...brand.studio, accent } }),
        stock,
      );
      const tile = iconTileColors(colors);
      assert.ok(contrastRatio(tile.light.fg, tile.light.bg) >= TILE_MIN_CONTRAST);
      assert.ok(contrastRatio(tile.dark.fg, tile.dark.bg) >= TILE_MIN_CONTRAST);
      // The tile sits apart from the page it is on, but quietly.
      assert.ok(contrastRatio(tile.light.bg, colors.white) < 1.6);
      assert.ok(contrastRatio(tile.dark.bg, colors.black) < 2.2);
    });
  }

  it('takes the tile colours from brand.config.json when set', () => {
    const colors = studioColors(studioColorInput(brand), stock);
    const tile = iconTileColors(colors, { light: '#F1E6D0', dark: '#2A3442' });
    assert.equal(tile.light.bg, '#F1E6D0');
    assert.equal(tile.dark.bg, '#2A3442');
    assert.ok(contrastRatio(tile.light.fg, tile.light.bg) >= TILE_MIN_CONTRAST);
    assert.ok(contrastRatio(tile.dark.fg, tile.dark.bg) >= TILE_MIN_CONTRAST);
  });

  it("this site's tile colours hold the contrast", () => {
    const colors = studioColors(studioColorInput(brand), stock);
    const tile = iconTileColors(colors, brand.studio?.icons?.tile);
    assert.ok(contrastRatio(tile.light.fg, tile.light.bg) >= TILE_MIN_CONTRAST);
    assert.ok(contrastRatio(tile.dark.fg, tile.dark.bg) >= TILE_MIN_CONTRAST);
  });
});

describe('applyBrandPreviews', () => {
  const maps = iconMaps({ types: { sermon: 'scripture' } });
  const hooks = {
    maps,
    icon: (key: BrandIconKey) => `icon:${key}`,
    tile: (key: BrandIconKey) => `tile:${key}`,
  };
  type T = Record<string, unknown> & {
    preview?: {
      select?: Record<string, string>;
      prepare: (v: Record<string, unknown>) => Record<string, unknown>;
    };
  };

  it('gives a document its icon, its groups icons, and a picture in every row', () => {
    const [out] = applyBrandPreviews<T, string>(
      [
        {
          name: 'sermon',
          type: 'document',
          groups: [{ name: 'seo', title: 'SEO' }, { name: 'custom' }],
          preview: {
            select: { title: 'title', media: 'image' },
            prepare: (v: Record<string, unknown>) => ({ title: v.title, media: v.media }),
          },
        },
      ],
      hooks,
    );
    assert.equal(out.icon, 'icon:scripture');
    const groups = out.groups as { name: string; icon?: string }[];
    assert.equal(groups[0].icon, 'icon:search');
    assert.equal(groups[1].icon, undefined);
    // No image: the tile. An image: the image.
    assert.equal(out.preview!.prepare({ title: 'A' }).media, 'tile:scripture');
    assert.equal(
      (out.preview!.prepare({ title: 'A', media: { asset: 1 } }).media as { asset: number }).asset,
      1,
    );
  });

  it('keeps a declared icon for a type nobody mapped, and leaves objects alone', () => {
    const obj = { name: 'hero', type: 'object' };
    const [doc, same] = applyBrandPreviews<T, string>(
      [{ name: 'mystery', type: 'document', icon: 'own' }, obj],
      hooks,
    );
    assert.equal(doc.icon, 'own');
    assert.equal(doc.preview!.prepare({ title: 'x' }).media, 'tile:document');
    assert.equal(same, obj);
  });

  it('gives a type with no preview a title guess and a picture', () => {
    const [doc] = applyBrandPreviews<T, string>([{ name: 'sermon', type: 'document' }], hooks);
    assert.deepEqual(doc.preview!.prepare({ name: 'Bob' }), {
      title: 'Bob',
      media: 'tile:scripture',
    });
  });

  it('is idempotent', () => {
    const once = applyBrandPreviews<T, string>([{ name: 'sermon', type: 'document' }], hooks);
    const twice = applyBrandPreviews(once, hooks);
    assert.equal(twice[0], once[0]);
  });
});

describe('subtitles', () => {
  it('formats a calendar day on its own day, and skips nonsense', () => {
    assert.equal(previewDate('2026-11-09'), 'Mon, Nov 9, 2026');
    assert.equal(previewDate(''), '');
    assert.equal(previewDate('nope'), '');
    assert.equal(previewDate(undefined), '');
  });
  it('joins the parts that have something in them', () => {
    assert.equal(previewSubtitle('Draft', '', null, 'John 3:16', 0), 'Draft · John 3:16 · 0');
  });
});

// ---------------------------------------------------------------------------
// 2. Coverage: every document type has a meaning and a preview
// ---------------------------------------------------------------------------

/** Document types declared in a source file: `name: 'x'` followed by `type: 'document'`. */
function documentTypesIn(source: string): { name: string; hasPreview: boolean }[] {
  const out: { name: string; hasPreview: boolean }[] = [];
  const re = /defineType\(\{\s*name:\s*([A-Z_]+|'[^']+')[\s\S]*?type:\s*'document'/g;
  for (const m of source.matchAll(re)) {
    const start = m.index ?? 0;
    const next = source.indexOf('defineType({', start + 1);
    const body = source.slice(start, next === -1 ? undefined : next);
    out.push({ name: m[1].replace(/'/g, ''), hasPreview: /\n\s{2}preview:\s*\{/.test(body) });
  }
  // Page singletons: definePageSingleton('name', ...) always declares a preview.
  for (const m of source.matchAll(/definePageSingleton\(\s*'([^']+)'/g)) {
    out.push({ name: m[1], hasPreview: true });
  }
  return out;
}

const CONSTANTS: Record<string, string> = {
  TRASH_TYPE: 'trashedItem',
  WEEK_TYPE: 'studioWeek',
  SHARE_RECORD_TYPE: 'previewShare',
};

function allDocumentTypes() {
  const files = [
    ...readdirSync(fileURLToPath(new URL('src/sanity/schemaTypes/', root)))
      .filter((f) => f.endsWith('.ts') && !f.startsWith('_'))
      .map((f) => `src/sanity/schemaTypes/${f}`),
    'src/sanity/kit/trash.tsx',
    'src/sanity/kit/weekType.ts',
    'src/sanity/workflow/previewShareType.ts',
  ];
  return files.flatMap((f) => {
    let source: string;
    try {
      source = read(f);
    } catch {
      return [];
    }
    return documentTypesIn(source).map((t) => ({
      ...t,
      name: CONSTANTS[t.name] ?? t.name,
      file: f,
    }));
  });
}

describe('coverage', () => {
  const maps = iconMaps(brand.studio?.icons);
  const types = allDocumentTypes();

  it('finds the document types', () => {
    assert.ok(types.length >= 5, `found only ${types.map((t) => t.name).join(', ')}`);
  });

  for (const t of types) {
    it(`${t.name} has an icon meaning and a preview (${t.file})`, () => {
      assert.ok(
        maps.types[t.name],
        `${t.name} has no icon meaning: add it to TYPE_ICON_DEFAULTS or brand.config.json studio.icons.types`,
      );
      assert.ok(t.hasPreview, `${t.name} has no preview: give it one with a useful subtitle`);
    });
  }

  it('sanity.config.ts decorates the schema and registers the plugin after the kit', () => {
    const config = read('sanity.config.ts');
    assert.match(config, /types:\s*withBrandPreviews\(/);
    const kit = config.indexOf('ncsStudioKit(kitConfig)');
    const icons = config.indexOf('brandIcons()');
    assert.ok(kit > -1 && icons > kit, 'brandIcons() must come after ncsStudioKit(kitConfig)');
  });
});

// ---------------------------------------------------------------------------
// 3. The art file names only real meanings
// ---------------------------------------------------------------------------

describe('brandIconArt.tsx', () => {
  it('only names meanings that exist', () => {
    const source = read('src/sanity/brandIconArt.tsx');
    const body = source.slice(source.indexOf('BRAND_ICON_ART'));
    for (const m of body.matchAll(/^\s+([a-zA-Z]+):\s*artIcon\(/gm)) {
      assert.ok(BRAND_ICON_KEYS.includes(m[1] as BrandIconKey), `${m[1]} is not a meaning`);
    }
  });
});
