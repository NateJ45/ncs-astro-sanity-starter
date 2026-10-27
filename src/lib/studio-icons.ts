// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Studio's icons by meaning, and the picture every list row gets (card 119)
// =============================================================================
// The pure half of src/sanity/brandIcons.tsx, kept free of React and of Sanity
// so node --test can hold it (studio-icons.test.ts).
//
// An icon is named by what it MEANS ("times", "give", "scripture"), never by
// what it looks like. The starter draws every meaning with @sanity/icons; a site
// hands over its own art for any meaning in src/sanity/brandIconArt.tsx, and the
// Studio picks it up everywhere that meaning is used: the schema type `icon`
// (lists, search, references, the create menu), the desk structure, field-group
// tabs, page templates and the tools in the phone sidebar.
//
// Which document type means what is DATA: TYPE_ICON_DEFAULTS below for the
// starter's own types, plus brand.config.json `studio.icons.types` for a site's
// (a church: `"sermon": "scripture"`). The same for tools and field groups.
//
// applyBrandPreviews() is the one place that decorates the schema: every
// document type gets its meaning's icon, its field groups get theirs, and its
// list preview always returns a picture: the document's own image when it has
// one, else the type's icon on a brand-tinted tile (iconTileColors()).
// =============================================================================

import { contrastRatio } from './contrast.ts';
import { mix, type Scale } from './studio-theme.ts';

/** Every meaning the Studio draws. A site's art can stand in for any of them. */
export const BRAND_ICON_KEYS = [
  // Pages and building blocks
  'home',
  'page',
  'pages',
  'sections',
  'savedSection',
  'redirect',
  'notFound',
  'privacy',
  'contact',
  // Site-wide
  'settings',
  'place',
  'times',
  'brandKit',
  'overview',
  // Content
  'content',
  'event',
  'notice',
  'scripture',
  'series',
  'give',
  'music',
  'prayer',
  'children',
  'person',
  'people',
  'download',
  'question',
  'questionGroup',
  'post',
  'journal',
  'category',
  'form',
  'testimonial',
  'service',
  'value',
  'step',
  'link',
  'image',
  'text',
  'document',
  // Field groups
  'search',
  'publishing',
  'related',
  // Studio furniture (tools, help)
  'guide',
  'help',
  'trash',
  // Card 132: undo, earlier versions, restore from a backup
  'restore',
  'message',
  'preview',
  'checkup',
  'quickUpdate',
  'table',
  'code',
] as const;

export type BrandIconKey = (typeof BRAND_ICON_KEYS)[number];

export function isBrandIconKey(v: unknown): v is BrandIconKey {
  return typeof v === 'string' && (BRAND_ICON_KEYS as readonly string[]).includes(v);
}

/** The starter's own document types. A site adds or overrides in brand.config.json. */
export const TYPE_ICON_DEFAULTS: Record<string, BrandIconKey> = {
  siteSettings: 'settings',
  businessInfo: 'place',
  homePage: 'home',
  aboutPage: 'person',
  servicesPage: 'service',
  processPage: 'step',
  faqPage: 'question',
  contactPage: 'contact',
  journalPage: 'journal',
  notFoundPage: 'notFound',
  privacyPage: 'privacy',
  studioGuide: 'guide',
  studioNotes: 'overview',
  announcement: 'notice',
  popup: 'notice',
  testimonial: 'testimonial',
  faqCategory: 'questionGroup',
  faqItem: 'question',
  philosophyPoint: 'value',
  service: 'service',
  processStep: 'step',
  journalCategory: 'category',
  journalEntry: 'post',
  page: 'pages',
  privatePage: 'privacy',
  sectionPreset: 'savedSection',
  redirect: 'redirect',
  shortLink: 'link', // card 171
  form: 'form', // the form builder, card 194
  // Plugin types (the kit's Trash, weekly tick and marks, the workflow's share links).
  trashedItem: 'trash',
  studioWeek: 'times',
  studioStaff: 'person',
  previewShare: 'link',
  // The email backbone (card 127).
  newsletter: 'message',
};

/** Field groups by name, across every type. A site adds or overrides in brand.config.json. */
export const GROUP_ICON_DEFAULTS: Record<string, BrandIconKey> = {
  hero: 'image',
  builder: 'sections',
  content: 'text',
  seo: 'search',
  publishing: 'publishing',
  meta: 'settings',
  related: 'related',
  settings: 'settings',
  media: 'image',
};

/** Tools by name (their icon shows in the phone sidebar). A site adds or overrides. */
export const TOOL_ICON_DEFAULTS: Record<string, BrandIconKey> = {
  home: 'home',
  structure: 'content',
  presentation: 'preview',
  'site-guide': 'guide',
  checkup: 'checkup',
  'quick-update': 'quickUpdate',
  messages: 'message',
  rsvps: 'people',
  // The People tool (card 176).
  people: 'people',
  media: 'image',
  vision: 'code',
};

/** brand.config.json `studio.icons`: all optional. */
export interface BrandIconsConfig {
  /** Document type name -> meaning. */
  types?: Record<string, string>;
  /** Field group name -> meaning. */
  groups?: Record<string, string>;
  /** Tool name -> meaning. */
  tools?: Record<string, string>;
  /** The tile behind an icon in a list row, per scheme (hex). Unset: tinted from the accent. */
  tile?: { light?: string; dark?: string };
}

export interface IconMaps {
  types: Record<string, BrandIconKey>;
  groups: Record<string, BrandIconKey>;
  tools: Record<string, BrandIconKey>;
}

/**
 * The defaults with the brand's overrides laid on top. An override naming a
 * meaning that does not exist is dropped (and listed in `ignored`), so a typo
 * in brand.config.json falls back to the default instead of drawing nothing.
 */
export function iconMaps(config: BrandIconsConfig | undefined | null): IconMaps & {
  ignored: string[];
} {
  const ignored: string[] = [];
  const merge = (
    base: Record<string, BrandIconKey>,
    extra: Record<string, string> | undefined,
    label: string,
  ) => {
    const out = { ...base };
    for (const [name, key] of Object.entries(extra ?? {})) {
      if (isBrandIconKey(key)) out[name] = key;
      else ignored.push(`${label}.${name}: "${key}" is not a known icon meaning`);
    }
    return out;
  };
  return {
    types: merge(TYPE_ICON_DEFAULTS, config?.types, 'types'),
    groups: merge(GROUP_ICON_DEFAULTS, config?.groups, 'groups'),
    tools: merge(TOOL_ICON_DEFAULTS, config?.tools, 'tools'),
    ignored,
  };
}

// -----------------------------------------------------------------------------
// The tile behind an icon in a list row
// -----------------------------------------------------------------------------

export interface TileScheme {
  /** The square's colour. */
  bg: string;
  /** A one-colour icon's colour on it (art with its own colours ignores this). */
  fg: string;
}

export interface TileColors {
  light: TileScheme;
  dark: TileScheme;
}

/** A one-colour icon must read on its tile like any other UI glyph (WCAG 1.4.11). */
export const TILE_MIN_CONTRAST = 3;

const HEX6 = /^#[0-9a-f]{6}$/i;

/**
 * The tile colours from the Studio's own colours (studioColors() in
 * studio-theme.ts): a light wash of the accent on the paper, and a deeper one on
 * the dark ground, so a tile reads as "this site's" in both schemes without
 * shouting. brand.config.json `studio.icons.tile` can set either square; the
 * icon colour is then picked from the accent scale to keep TILE_MIN_CONTRAST.
 */
export function iconTileColors(
  colors: { accent: Scale; white: string; black: string },
  tile?: BrandIconsConfig['tile'],
): TileColors {
  const lightBg =
    tile?.light && HEX6.test(tile.light)
      ? tile.light
      : mix(colors.white, colors.accent['500'], 0.14);
  const darkBg =
    tile?.dark && HEX6.test(tile.dark) ? tile.dark : mix(colors.black, colors.accent['400'], 0.3);
  return {
    light: { bg: lightBg, fg: readableStep(colors.accent, lightBg, ['600', '700', '800', '900']) },
    dark: {
      bg: darkBg,
      // A light tile set in brand.config.json takes a deep step instead.
      fg: readableStep(colors.accent, darkBg, ['300', '200', '100', '50', '700', '800', '900']),
    },
  };
}

function readableStep(scale: Scale, bg: string, steps: (keyof Scale)[]): string {
  for (const step of steps) {
    if (contrastRatio(scale[step], bg) >= TILE_MIN_CONTRAST) return scale[step];
  }
  // Nothing in the scale reads: fall back to plain ink for the ground.
  return contrastRatio('#000000', bg) >= contrastRatio('#ffffff', bg) ? '#000000' : '#ffffff';
}

// -----------------------------------------------------------------------------
// Decorating the schema
// -----------------------------------------------------------------------------

/** The part of a Sanity schema type this file reads and writes. */
interface SchemaTypeLike {
  name: string;
  type: string;
  icon?: unknown;
  groups?: { name: string; icon?: unknown; [k: string]: unknown }[];
  preview?: {
    select?: Record<string, string>;
    prepare?: (value: Record<string, unknown>, viewOptions?: unknown) => Record<string, unknown>;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface BrandPreviewHooks<Icon> {
  maps: IconMaps;
  /** The drawn icon for a meaning. */
  icon: (key: BrandIconKey) => Icon;
  /** The tile shown as a row's picture when the document has none of its own. */
  tile: (key: BrandIconKey) => unknown;
}

const DECORATED = Symbol.for('ncs.brandPreviews');

/** The meaning a document type is drawn with ('document' when nobody said). */
export function typeIconKey(type: string, maps: IconMaps): BrandIconKey {
  return maps.types[type] ?? 'document';
}

/**
 * Every document type: its meaning's icon (a type nobody mapped keeps the icon
 * it declares, else 'document'), icons on its field groups, and a preview that
 * always returns `media`. The type's own `prepare` still runs; only a missing
 * `media` is filled. A type with no preview gets Sanity's usual title guess.
 * Object types are passed through untouched. Idempotent.
 */
export function applyBrandPreviews<T, Icon>(types: T[], hooks: BrandPreviewHooks<Icon>): T[] {
  return types.map((raw) => {
    const t = raw as unknown as SchemaTypeLike;
    if (!t || t.type !== 'document' || (t as unknown as Record<symbol, unknown>)[DECORATED])
      return raw;
    const mapped = hooks.maps.types[t.name];
    const key = typeIconKey(t.name, hooks.maps);
    const icon = mapped || !t.icon ? hooks.icon(key) : t.icon;
    const tile = hooks.tile(key);

    const groups = t.groups?.map((g) => {
      const gk = hooks.maps.groups[g.name];
      return g.icon || !gk ? g : { ...g, icon: hooks.icon(gk) };
    });

    const preview = t.preview ?? {
      select: { title: 'title', name: 'name', headline: 'heading' },
      prepare: (v: Record<string, unknown>): Record<string, unknown> => ({
        title: v.title ?? v.name ?? v.headline,
      }),
    };
    const own = preview.prepare;
    const wrapped = {
      ...preview,
      prepare: (value: Record<string, unknown>, viewOptions?: unknown) => {
        const out = own ? own(value, viewOptions) : { ...value };
        return out && out.media ? out : { ...(out ?? {}), media: tile };
      },
    };

    const next = { ...t, icon, preview: wrapped, ...(groups ? { groups } : {}) };
    Object.defineProperty(next, DECORATED, { value: true, enumerable: false });
    return next as unknown as T;
  });
}

// -----------------------------------------------------------------------------
// Subtitles
// -----------------------------------------------------------------------------

/** "Sun, Nov 9, 2026" from an ISO date or datetime; '' for nothing or nonsense. */
export function previewDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  // A bare date is a calendar day, not midnight UTC: keep it on its own day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** The parts of a list row's subtitle, empty ones dropped, joined with " · ". */
export function previewSubtitle(...parts: unknown[]): string {
  return parts
    .filter(
      (p): p is string | number =>
        (typeof p === 'string' && p.trim() !== '') || typeof p === 'number',
    )
    .map(String)
    .join(' · ');
}
