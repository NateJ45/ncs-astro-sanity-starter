// Foundation, edit with care
// Custom page — the document an editor creates to build a new page from the
// section block library, without touching code.
//
// Routed by src/pages/[slug].astro at /<slug>. Built-in route names are
// reserved so a custom page can never collide with a real page. NOT a singleton
// (editors make as many as they like), so it is deliberately kept out of the
// SINGLETON_TYPES sets in sanity.config.ts and structure.ts.
//
// Keep RESERVED_SLUGS in sync with src/lib/reservedSlugs.ts (both lists guard
// the same invariant; the Studio list shows a validation error, the Astro list
// filters getStaticPaths).

import { defineType, defineField } from 'sanity';
import { DocumentsIcon } from '@sanity/icons';
import { SECTION_TYPES } from './sections';

// Every built-in route segment. A custom page slug may not match any of these.
// Keep in sync with src/lib/reservedSlugs.ts.
const RESERVED_SLUGS = new Set([
  'about', 'services', 'process', 'portfolio', 'faq', 'contact', 'journal',
  'e-design', 'shop', 'gift-certificates', 'quiz', 'calculator', 'resources',
  'guides', 'press', 'privacy', '404', 'sitemap-index.xml', 'og', '_astro',
]);

export const page = defineType({
  name: 'page',
  title: 'Custom page',
  type: 'document',
  icon: DocumentsIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'extra', title: 'Extra sections' },
    { name: 'menu', title: 'Menu placement' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'content',
      description: 'The name of this page (used for the menu link and the browser tab unless you set an SEO title).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'content',
      description: 'The end of the address, like "studio-tour" for example.com/studio-tour. Click Generate to make one from the title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          const v = slug?.current;
          if (!v) return 'Add a web address (click Generate).';
          if (RESERVED_SLUGS.has(v)) return `"${v}" is already used by a built-in page. Pick a different address.`;
          if (!/^[a-z0-9-]+$/.test(v)) return 'Use only lowercase letters, numbers, and dashes.';
          return true;
        }),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'array',
      group: 'content',
      description: 'Build the page by adding sections. Drag to reorder. Add as many as you like.',
      of: SECTION_TYPES,
    }),

    // ── Menu placement ────────────────────────────────────────────────────────
    defineField({
      name: 'addToMainNav',
      title: 'Show in the top menu',
      type: 'boolean',
      group: 'menu',
      initialValue: false,
      description: 'Off by default, so you can build and preview privately. Turn on when you want visitors to find it in the menu.',
    }),
    defineField({
      name: 'navGroup',
      title: 'Where in the top menu',
      type: 'string',
      group: 'menu',
      initialValue: 'top',
      hidden: ({ parent }) => !parent?.addToMainNav,
      options: {
        list: [
          { title: 'Its own menu item', value: 'top' },
          { title: 'Under "Services"', value: 'services' },
          { title: 'Under "Resources"', value: 'resources' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'navLabel',
      title: 'Menu label (optional)',
      type: 'string',
      group: 'menu',
      hidden: ({ parent }) => !parent?.addToMainNav,
      description: 'Shorter text for the menu, if the page title is long. Leave blank to use the title.',
    }),
    defineField({
      name: 'addToFooter',
      title: 'Show in the footer',
      type: 'boolean',
      group: 'menu',
      initialValue: false,
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and search result title. Aim for 50 to 60 characters. Leave blank to use the page title.',
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The sentence under the title in search results. Aim for 150 to 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in search results.'),
    }),
    defineField({
      name: 'seoImage',
      title: 'Social share image',
      type: 'image',
      group: 'seo',
      description: 'Optional. Shown when this page is shared. Use a wide image, about 1200 by 630 pixels. Leave blank to use the site default.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', inNav: 'addToMainNav' },
    prepare: ({ title, slug, inNav }) => ({
      title: title || 'Untitled page',
      subtitle: `/${slug ?? '...'}${inNav ? '  ·  in menu' : ''}`,
    }),
  },
});
