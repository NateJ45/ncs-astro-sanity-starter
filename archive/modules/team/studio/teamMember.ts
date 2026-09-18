// Team member document. One document per person.
// Displayed as a grid on the /team page, ordered by displayOrder.
// No detail pages by default; see the enable doc for how to add them as a
// custom extension if the client needs per-member pages.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  // Configuration document -- exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      description: 'The person\'s full name as it will appear on the page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier. Not used for routing by default (no detail pages), but useful as a stable key and for future custom extensions.',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role or title',
      type: 'string',
      description: 'Displayed under the name. Example: "Creative Director" or "Project Manager".',
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot photo',
      type: 'image',
      description: 'Profile photo. Displays as a square or circle crop on the grid. Prefer a clean, consistent background across all team photos.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the photo for screen readers. Example: "Alex Morgan smiling in a studio setting".',
          validation: (R) => R.required(),
        }),
      ],
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      description: 'Short biography. One to three paragraphs. Shown in the member card on hover or below the photo depending on the layout.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
    }),
    defineField({
      name: 'email',
      title: 'Email address (optional)',
      type: 'string',
      description: 'If provided, a mailto link is shown on the member card.',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email address.';
        }),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links (optional)',
      type: 'array',
      description: 'Up to three social profile links shown as labelled inline links on the card.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'Example: "LinkedIn" or "Instagram".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'url', title: 'URL', type: 'url', validation: (Rule) => Rule.required() }),
          ],
          preview: {
            select: { label: 'label', url: 'url' },
            prepare: ({ label, url }) => ({ title: label ?? '(no label)', subtitle: url ?? '' }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers appear first in the grid. Members with the same number or no number are sorted alphabetically by name.',
    }),
  ],
  preview: {
    select: { name: 'name', role: 'role', media: 'headshot' },
    prepare: ({ name, role, media }) => ({
      title: name ?? '(unnamed)',
      subtitle: role ?? '',
      media,
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'displayOrderAsc',
      by: [
        { field: 'displayOrder', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    },
    {
      title: 'Name A to Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
});
