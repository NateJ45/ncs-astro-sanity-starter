// Safe to edit by hand
// Reusable factory for page-singleton document types.
//
// A "page singleton" is a document type of which only ONE instance ever exists
// in the dataset (enforced by singleton wiring in sanity.config.ts + structure.ts).
// Each core page (home, about, services, process ...) and many secondary pages
// follow this pattern: they share an identical outer shape (hero fields + SEO
// fields + a pageBuilder array) but each page can grow its own field groups.
//
// Usage: call `definePageSingleton(name, title, defaults?, extra?)` and register
// the result in:
//   1. studio/schemaTypes/index.ts  (schemaTypes array)
//   2. studio/structure.ts          (SINGLETON_TYPES set + a Pages list item)
//
// Example:
//
//   import { definePageSingleton } from './_pageSingleton';
//
//   export const teamPage = definePageSingleton(
//     'teamPage',
//     'Team',
//     { heroEyebrow: 'Our team', heroHeadline: 'The people behind the work' },
//   );
//
// The resulting schema gives editors:
//   - A hero group: background image, eyebrow, headline, subhead, script accent
//   - A page-builder group: the full SECTION_TYPES (general blocks) + additionalSections
//   - A SEO group: seoTitle, seoDescription, seoImage
//   - Any extra groups / fields you append via the `extra` argument
//
// IMPORTANT: after adding a new singleton you must run `npm run typegen` and
// `npm run studio:deploy`. Do NOT refactor existing singletons onto this factory
// without a planned session -- each existing singleton has hand-authored field
// variations that would be lost if blindly replaced.

import { defineType, defineField } from 'sanity';
import { SECTION_TYPES, additionalSectionsField } from './sections';

interface PageDefaults {
  heroEyebrow?: string;
  heroHeadline?: string;
  heroSubhead?: string;
}

interface PageExtras {
  /** Additional field groups appended after the standard hero/builder/seo set. */
  groups?: Array<{ name: string; title: string }>;
  /** Additional fields appended after the standard field set. */
  fields?: ReturnType<typeof defineField>[];
}

/**
 * Build a standard page-singleton schema.
 *
 * @param name      The Sanity document type name (camelCase, e.g. 'teamPage').
 * @param title     Human-readable title shown in Studio (e.g. 'Team').
 * @param defaults  Optional initial-value overrides for the hero fields.
 * @param extra     Optional extra field groups and fields appended to the schema.
 */
export function definePageSingleton(
  name: string,
  title: string,
  defaults: PageDefaults = {},
  extra: PageExtras = {},
) {
  return defineType({
    name,
    title,
    type: 'document',
    // Configuration-style document -- keep Canvas AI writing tools away from it.
    options: { canvasApp: { exclude: true } },
    groups: [
      { name: 'hero',     title: 'Hero' },
      { name: 'builder',  title: 'Page sections' },
      { name: 'seo',      title: 'SEO' },
      ...(extra.groups ?? []),
    ],
    fields: [
      // ── Hero ─────────────────────────────────────────────────────────────
      defineField({
        name: 'heroImage',
        title: 'Hero background image (optional)',
        type: 'image',
        group: 'hero',
        description:
          'Full-bleed photo behind the hero text. Landscape orientation works best. Leave empty to use a solid brand-color hero.',
        options: { hotspot: true },
        fields: [
          defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
        ],
      }),
      defineField({
        name: 'heroEyebrow',
        title: 'Eyebrow (small line above headline)',
        type: 'string',
        group: 'hero',
        description: 'Short label above the headline. Leave empty to hide.',
        initialValue: defaults.heroEyebrow,
      }),
      defineField({
        name: 'heroHeadline',
        title: 'Headline',
        type: 'string',
        group: 'hero',
        description: 'The big heading on this page.',
        initialValue: defaults.heroHeadline,
      }),
      defineField({
        name: 'heroScriptAccent',
        title: 'Handwritten accent word (optional)',
        type: 'string',
        group: 'hero',
        description:
          'One word from the headline to render in the script font. Must match the headline exactly. Leave blank to skip.',
      }),
      defineField({
        name: 'heroSubhead',
        title: 'Subhead (optional)',
        type: 'text',
        rows: 2,
        group: 'hero',
        description: 'One or two sentences under the headline. Leave empty to hide.',
        initialValue: defaults.heroSubhead,
      }),

      // ── Page builder ──────────────────────────────────────────────────────
      defineField({
        name: 'pageBuilder',
        title: 'Page sections',
        type: 'array',
        group: 'builder',
        description:
          'Add, remove, and reorder sections on this page. Each section is a block from the library.',
        of: SECTION_TYPES,
      }),
      {
        ...additionalSectionsField,
        group: 'builder',
      },

      // ── SEO ───────────────────────────────────────────────────────────────
      defineField({
        name: 'seoTitle',
        title: 'SEO title',
        type: 'string',
        group: 'seo',
        description:
          'Browser tab + search result title. Aim for 50 to 60 characters. If left blank the page title is used.',
        validation: (Rule) =>
          Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google.'),
      }),
      defineField({
        name: 'seoDescription',
        title: 'SEO description',
        type: 'text',
        rows: 3,
        group: 'seo',
        description:
          'The sentence under your title in Google results. Aim for 150 to 160 characters.',
        validation: (Rule) =>
          Rule.max(160).warning(
            'Descriptions longer than about 160 characters get cut off in Google.',
          ),
      }),
      defineField({
        name: 'seoImage',
        title: 'Social share image (this page)',
        type: 'image',
        group: 'seo',
        description:
          'Optional. Shown when this page is shared on social media. About 1200 x 630 px. Overrides the site-wide default.',
        options: { hotspot: true },
        fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
      }),

      // ── Per-page extras ───────────────────────────────────────────────────
      ...(extra.fields ?? []),
    ],
    preview: { prepare: () => ({ title }) },
  });
}
