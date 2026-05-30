// Journal category taxonomy. Lightweight — a category is just a name + slug
// + optional description. Posts can have multiple categories; the first one
// shows on the card.
//
// Common categories for an interior designer's journal:
//   Project Stories · Style Notes · Behind the Scenes · Source Roundups ·
//   Process · Q&A · Announcements
//
// Editors create new categories as they need them. The journal index page
// renders category chips automatically based on what's been used.

import { defineType, defineField } from 'sanity';

export const journalCategory = defineType({
  name: 'journalCategory',
  title: 'Journal Category',
  type: 'document',
  // Taxonomy, not content — exclude from Canvas's free-form writing UI.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Display name. Examples: "Project Stories", "Style Notes".',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in URLs and as an HTML id. Auto-generated from title.',
      options: { source: 'title', maxLength: 64 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional. A one-line description of what this category covers. Surfaces as a tooltip on the chip.',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'description' },
  },
});
