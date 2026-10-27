// Safe to edit by hand
// =============================================================================
// mainPageSections - the blocks that hold a main page's fixed piece (card 190)
// =============================================================================
// Ported from FBC Auburn (2026-10-26, "every main page a page builder"). Contact and Privacy
// were bespoke pages: a hero, then one piece drawn in code (the form, the policy). Each now has
// a Page layout like About, and the piece became a block, so the editor can put a photo or a
// note above or below it, or reorder the page.
//
// These two are offered ONLY on their own page (CONTACT_ and PRIVACY_SECTION_TYPES in
// richSections.ts), not in the general library or the saved sections: a second contact form or
// a second policy would be a mistake. Registered in schemaTypes/index.ts. The Journal's block
// lives in journalPostsSection.ts, because the journal is a removable capability.
//
// Neither carries a colour or surface (rule 9). They are SELF_CONTAINED in sectionCadence.ts:
// each draws the band its page drew.
// =============================================================================

import { defineType, defineField, defineArrayMember, type Rule } from 'sanity';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { LockIcon } from '@sanity/icons/Lock';

// The policy's Portable Text, shared with the privacyPage.body it began as.
export const policyBodyMembers = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Paragraph', value: 'normal' },
      { title: 'Heading 2', value: 'h2' },
      { title: 'Heading 3', value: 'h3' },
    ],
    lists: [
      { title: 'Bullet', value: 'bullet' },
      { title: 'Numbered', value: 'number' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            {
              name: 'href',
              type: 'url',
              title: 'Link to',
              description:
                'A page on this website, like /contact/, or a full address starting https://. Email and phone links work too (mailto:, tel:).',
              validation: (R: Rule) =>
                R.uri({ allowRelative: true, scheme: ['https', 'http', 'mailto', 'tel'] }),
            },
            {
              name: 'openInNewTab',
              type: 'boolean',
              title: 'Open in new tab',
              initialValue: false,
            },
          ],
        },
      ],
    },
  }),
];

// ── Contact form ─────────────────────────────────────────────────────────────
export const contactFormSection = defineType({
  name: 'contactFormSection',
  title: 'Contact form',
  type: 'object',
  icon: EnvelopeIcon,
  description:
    'The contact form with the email, phone and map beside it. Its questions and the "What happens next" words are on this page\'s "The form" tab.',
  fields: [
    defineField({
      name: 'sidebar',
      title: 'Show the email, phone and map beside the form',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Contact form', subtitle: 'Questions on the "The form" tab' }),
  },
});

// ── Privacy policy text ──────────────────────────────────────────────────────
export const privacyPolicySection = defineType({
  name: 'privacyPolicySection',
  title: 'Privacy policy text',
  type: 'object',
  icon: LockIcon,
  fields: [
    defineField({
      name: 'lastUpdated',
      title: 'Last updated date',
      type: 'date',
      description: 'Shown at the top of the policy. Update whenever the policy changes.',
    }),
    defineField({
      name: 'body',
      title: 'Policy text',
      type: 'array',
      description:
        'The full privacy policy. Use headings to organize it. Leave empty to show the built-in policy.',
      of: policyBodyMembers,
    }),
  ],
  preview: {
    select: { date: 'lastUpdated' },
    prepare: ({ date }) => ({
      title: 'Privacy policy text',
      subtitle: date ? `Last updated ${date}` : 'The built-in policy',
    }),
  },
});

export const mainPageSectionSchemas = [contactFormSection, privacyPolicySection];
