// studioNotes singleton — drives the static notes in the "Your business at a
// glance" Start Here panel (the live services/settings come straight from those
// documents and are not duplicated here). Plain text, excluded from Canvas.
import { defineType, defineField, defineArrayMember } from 'sanity';

export const studioNotes = defineType({
  name: 'studioNotes',
  title: 'Business Notes (Start Here)',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({ name: 'businessSummary', title: 'Who you are', type: 'text', rows: 5 }),
    defineField({ name: 'idealClient', title: 'Your ideal client', type: 'text', rows: 5 }),
    defineField({ name: 'voiceSummary', title: 'Your voice', type: 'text', rows: 6 }),
    defineField({
      name: 'wordsToAvoid',
      title: 'Words to skip',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      description: 'Designer-speak to avoid in writing.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Business Notes' }) },
});
