// Safe to edit by hand
// =============================================================================
// newsletter - one issue of the email newsletter (PORTS.md card 127)
// =============================================================================
// Written here, sent from here: "Send a test to me" and "Send to everyone" sit
// beside Publish (src/sanity/mail/). Only the PUBLISHED issue is ever sent, and
// each issue goes to the list once.
//
// THE PICKS ARE THIS SITE'S. The starter's issue picks journal posts and
// notices; a fork changes the fields and src/lib/newsletter-content.ts together
// (FBC Auburn picks the week's sermon, notices and Church Trac events). The
// subscribers are never here: they live in the site's own database.
// =============================================================================
import { defineArrayMember, defineField, defineType } from 'sanity';
import { EnvelopeIcon } from '@sanity/icons/Envelope';

export const newsletter = defineType({
  name: 'newsletter',
  title: 'Newsletter',
  type: 'document',
  icon: EnvelopeIcon,
  description:
    'An email to everyone who signed up. Publish it, send yourself a test, then send it.',
  fields: [
    defineField({
      name: 'subject',
      title: 'Subject line',
      type: 'string',
      description: 'What people see in their inbox. Short and specific beats clever.',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'date',
      title: 'Issue date',
      type: 'date',
      description: 'Orders the archive on the website.',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address of this issue',
      type: 'slug',
      options: { source: 'subject', maxLength: 80 },
      description: 'Used for the copy on the website. Press Generate.',
    }),
    defineField({
      name: 'preheader',
      title: 'Preview line (optional)',
      type: 'string',
      description: 'The grey line many inboxes show after the subject.',
      validation: (R) => R.max(140),
    }),
    defineField({
      name: 'intro',
      title: 'Opening words',
      type: 'text',
      rows: 5,
      description: 'A few friendly lines at the top. A blank line starts a new paragraph.',
    }),
    // scaffold: journal
    defineField({
      name: 'posts',
      title: 'Posts to feature (optional)',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'journalEntry' }] })],
      validation: (R) => R.max(3),
    }),
    // scaffold:end
    defineField({
      name: 'notices',
      title: 'Notices',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'notice',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (R) => R.required().max(120),
            }),
            defineField({ name: 'text', title: 'Text', type: 'text', rows: 3 }),
            defineField({
              name: 'link',
              title: 'Link (optional)',
              type: 'url',
              validation: (R) => R.uri({ scheme: ['https', 'http', 'mailto'] }),
            }),
          ],
        }),
      ],
      validation: (R) => R.max(8),
    }),
    defineField({
      name: 'note',
      title: 'A closing note (optional)',
      type: 'object',
      fields: [
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'text', title: 'Text', type: 'text', rows: 4 }),
      ],
    }),
    defineField({
      name: 'showOnWebsite',
      title: 'Show on the website too?',
      type: 'boolean',
      description: 'On: after its date, the issue appears on the website under /newsletter/.',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'subject', date: 'date' },
    prepare: ({ title, date }) => ({
      title: title || 'Untitled issue',
      subtitle: date || 'No date',
    }),
  },
});
