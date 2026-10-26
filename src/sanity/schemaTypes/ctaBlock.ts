// Reusable object type: a CTA button + link.
// Embedded by page singletons wherever a primary/secondary CTA appears.

import { defineType, defineField } from 'sanity';

// A button is in use once any part of it is filled in. Only then are its words and its link
// type required: an optional button left empty must never block Publish.
const inUse = (p: Record<string, unknown> | undefined): boolean =>
  !!(
    p &&
    (p.label || p.linkType || p.internalLink || p.externalUrl || p.emailAddress || p.phoneNumber)
  );

export const ctaBlock = defineType({
  name: 'ctaBlock',
  title: 'CTA Block',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Button text',
      type: 'string',
      validation: (Rule) =>
        Rule.max(40).custom((value, ctx) =>
          inUse(ctx.parent as Record<string, unknown>) && !value
            ? 'Add the button words, or clear the button to leave it off.'
            : true,
        ),
    }),
    defineField({
      name: 'linkType',
      title: 'Link type',
      type: 'string',
      options: {
        list: [
          { title: 'Internal page', value: 'internal' },
          { title: 'External URL', value: 'external' },
          { title: 'Email', value: 'email' },
          { title: 'Phone', value: 'phone' },
        ],
        layout: 'radio',
      },
      validation: (Rule) =>
        Rule.custom((value, ctx) =>
          inUse(ctx.parent as Record<string, unknown>) && !value
            ? 'Pick where the button goes.'
            : true,
        ),
    }),
    defineField({
      name: 'internalLink',
      title: 'Page to link to',
      type: 'reference',
      to: [
        { type: 'homePage' },
        { type: 'aboutPage' }, // scaffold: about
        { type: 'servicesPage' }, // scaffold: services
        { type: 'processPage' }, // scaffold: process
        { type: 'faqPage' }, // scaffold: faq
        { type: 'contactPage' },
        { type: 'journalPage' }, // scaffold: journal
        { type: 'journalEntry' }, // scaffold: journal
        { type: 'page' },
      ],
      hidden: ({ parent }) => parent?.linkType !== 'internal',
    }),
    defineField({
      name: 'externalUrl',
      title: 'Full URL',
      type: 'url',
      hidden: ({ parent }) => parent?.linkType !== 'external',
    }),
    defineField({
      name: 'emailAddress',
      title: 'Email address',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((value, ctx: any) => {
          if (ctx.parent?.linkType !== 'email') return true;
          if (!value) return 'Email is required';
          return /.+@.+\..+/.test(value) ? true : 'Must be a valid email';
        }),
      hidden: ({ parent }) => parent?.linkType !== 'email',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone number',
      type: 'string',
      hidden: ({ parent }) => parent?.linkType !== 'phone',
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      // No initialValue: one would create a half-filled button on every new block.
    }),
  ],
  preview: {
    select: { label: 'label', linkType: 'linkType' },
    prepare: ({ label, linkType }) => ({ title: label || '(no label)', subtitle: linkType }),
  },
});
