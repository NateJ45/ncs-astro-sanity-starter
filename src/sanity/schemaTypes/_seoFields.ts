// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// _seoFields - the shared "Search & sharing" panel for a page-like document
// =============================================================================
// One helper builds the whole group, in one order, for every document type that
// can appear in Google. It puts a live snippet preview at the TOP of the group,
// then the fields that control that snippet.
//
// REUSE, DO NOT RENAME. A document type that already has an SEO field keeps it,
// under its own name, with its own wording. Pass that definition in `reuse` and
// the helper puts it in the right place instead of making a second field. A
// rename would move the data to a new path and lose it, and every page in the
// dataset would quietly go back to a default title.
//
// So the helper contributes exactly two new things to a type that already had
// SEO fields:
//   - `seoPreview`, a value-less field whose custom input draws the previews;
//   - `hideFromSearch`, the "keep this page out of Google" switch.
//
// hideFromSearch has to be honoured in TWO places by the site, or it is a dead
// control: a `<meta name="robots" content="noindex, follow">` on the page, and
// the page dropped from the sitemap. See astro.config.mjs.
// =============================================================================

import { defineField, type FieldDefinition } from 'sanity';
import { SeoSnippetInput } from '../components/SeoSnippetInput';

export interface SeoFieldsOptions {
  /** The field group the panel belongs to (must exist on the document type). */
  group: string;
  /** Fields this document ALREADY has. Each one is used in place of the default. */
  reuse?: {
    title?: FieldDefinition;
    description?: FieldDefinition;
    image?: FieldDefinition;
  };
}

/** The "Search & sharing" fields, in display order, for one document type. */
export function seoFields(opts: SeoFieldsOptions): FieldDefinition[] {
  const { group, reuse } = opts;

  // A value-less field: the custom input draws the previews and writes nothing.
  const snippet = defineField({
    name: 'seoPreview',
    title: 'How this page looks',
    type: 'string',
    group,
    readOnly: true,
    components: { input: SeoSnippetInput },
  });

  const title =
    reuse?.title ??
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group,
      description:
        'Browser tab and search result title. Aim for 50 to 60 characters. Leave blank to use the page title.',
      validation: (Rule) =>
        Rule.max(60).warning(
          'Titles longer than about 60 characters get cut off in search results.',
        ),
    });

  const description =
    reuse?.description ??
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group,
      description: 'The sentence under the title in search results. Aim for 150 to 160 characters.',
      validation: (Rule) =>
        Rule.max(160).warning(
          'Descriptions longer than about 160 characters get cut off in search results.',
        ),
    });

  const image =
    reuse?.image ??
    defineField({
      name: 'seoImage',
      title: 'Social share image',
      type: 'image',
      group,
      options: { hotspot: true },
      description:
        'Optional. Shown when this page is shared. Use a wide image, about 1200 by 630 pixels. Leave blank to use the site default.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    });

  const hideFromSearch = defineField({
    name: 'hideFromSearch',
    title: 'Keep this page out of Google',
    type: 'boolean',
    group,
    description:
      'Turn this on to ask search engines to skip this page. The page stays on the site and anyone with the address can still open it.',
  });

  return [snippet, title, description, image, hideFromSearch];
}
