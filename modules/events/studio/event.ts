// Event document. One document per event (workshop, webinar, open house, etc.).
// Upcoming events and past events are separated on the /events page.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  // Configuration document -- exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'title',
      title: 'Event title',
      type: 'string',
      description: 'Name of the event as it will appear on the page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier. Not used for routing by default, but useful as a stable key.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start date and time',
      type: 'datetime',
      description: 'When the event begins. Used to sort upcoming vs. past events.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End date and time (optional)',
      type: 'datetime',
      description: 'When the event ends. If left blank, only the start time is shown.',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Where the event takes place. Example: "Studio, 123 Main St" or "Online via Zoom".',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      description: 'What visitors need to know about the event. Keep it concise.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }],
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
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: true },
                ],
              },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'image',
      title: 'Event image (optional)',
      type: 'image',
      description: 'A featured image for the event card.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (R) => R.required(),
        }),
      ],
    }),
    defineField({
      name: 'registrationUrl',
      title: 'Registration URL (optional)',
      type: 'url',
      description: 'Link to an external registration page (Eventbrite, Luma, etc.). If provided, a "Register" button appears on the card.',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order (optional)',
      type: 'number',
      description: 'Within the upcoming or past section, lower numbers show first. Leave blank to sort by start date.',
    }),
  ],
  preview: {
    select: { title: 'title', startDate: 'startDate', media: 'image' },
    prepare: ({ title, startDate, media }) => {
      const dateStr = startDate
        ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      return {
        title: title ?? '(untitled event)',
        subtitle: dateStr,
        media,
      };
    },
  },
  orderings: [
    {
      title: 'Start date, soonest first',
      name: 'startDateAsc',
      by: [{ field: 'startDate', direction: 'asc' }],
    },
    {
      title: 'Start date, most recent first',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
});
