// Foundation, edit with care
// =============================================================================
// Private page - a page only people with the password can see (PORTS.md card 122)
// =============================================================================
// Built like a Custom page (the same section library), with a password instead
// of menu and Google settings. Shown at /private/<address>/ by the
// server-rendered route src/pages/private/[slug].astro, never built into the
// static site.
//
// WHY A SEPARATE TYPE, NOT A SWITCH ON A CUSTOM PAGE. The dataset is public: an
// ordinary document's words can be read by anyone over the plain API, so a
// password on an ordinary page would lock the door and leave the window open.
// Private pages are stored under the `privatePage.` id path instead
// (structure.ts gives every new one that id), which Sanity serves to signed-in
// requests only. Full argument: docs/agent/private-pages.md.
//
// Never in a menu, a sitemap, Google or site search: there is nothing to set.
// =============================================================================

import { defineType, defineField } from 'sanity';
import { LockIcon } from '@sanity/icons/Lock';
import { SECTION_TYPES, sectionArrayOptions } from './sections';
import { pageBuilderAuthoring } from '../pageBuilderAuthoring';
import { PrivatePasswordInput } from '../components/PrivatePasswordInput';
import { isPasswordRecord } from '../../lib/private-pages';

export const privatePage = defineType({
  // The literal, not PRIVATE_TYPE: studio-icons.test.ts reads type names off disk.
  name: 'privatePage',
  title: 'Private page',
  type: 'document',
  icon: LockIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'access', title: 'Password' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'content',
      description:
        'The name of this page. Only people with the password see it, on the page and in the browser tab.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: ['content', 'access'],
      description:
        'The end of the address. "members" makes the page /private/members/. Click Generate to make one from the title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          const v = slug?.current;
          if (!v) return 'Add a web address (click Generate).';
          if (!/^[a-z0-9-]+$/.test(v)) return 'Use only lowercase letters, numbers, and dashes.';
          return true;
        }),
    }),
    defineField({
      name: 'password',
      title: 'Only people with the password can see this',
      type: 'object',
      group: ['content', 'access'],
      description:
        'Anyone who opens the address is asked for this password first. Pictures on a private page are not as private as its words: someone determined could find them, so keep anything truly sensitive as text.',
      components: { input: PrivatePasswordInput },
      // The hash, its salt and its rounds. Written by the input above; never
      // typed, never the password itself.
      fields: [
        defineField({ name: 'alg', type: 'string', readOnly: true }),
        defineField({ name: 'iterations', type: 'number', readOnly: true }),
        defineField({ name: 'salt', type: 'string', readOnly: true }),
        defineField({ name: 'hash', type: 'string', readOnly: true }),
        defineField({ name: 'setAt', type: 'datetime', readOnly: true }),
      ],
      validation: (Rule) =>
        Rule.custom((value) =>
          isPasswordRecord(value) ? true : 'Set a password, or nobody can open this page.',
        ).warning(),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'array',
      group: 'content',
      description: 'Build the page by adding sections, the same way as any other page.',
      of: SECTION_TYPES,
      options: sectionArrayOptions,
      ...pageBuilderAuthoring,
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', hash: 'password.hash' },
    prepare: ({ title, slug, hash }) => ({
      title: title || 'Untitled private page',
      subtitle: `/private/${slug ?? '...'}/${hash ? '' : '  ·  no password yet'}`,
    }),
  },
});
