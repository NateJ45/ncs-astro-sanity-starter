// studioGuide singleton — drives the "How the website works" Start Here panel.
// Plain text + simple arrays (no Portable Text) so editing stays dead-simple
// and the Studio needs no extra renderer dependency.
import { defineType, defineField, defineArrayMember } from 'sanity';

const TONES = [
  { title: 'Default', value: 'default' },
  { title: 'Primary (highlight)', value: 'primary' },
  { title: 'Caution (amber)', value: 'caution' },
  { title: 'Positive (green)', value: 'positive' },
];

export const studioGuide = defineType({
  name: 'studioGuide',
  title: 'Start Here Guide',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({ name: 'guideTitle', title: 'Guide title', type: 'string', initialValue: 'How the website works' }),
    defineField({
      name: 'guideIntro',
      title: 'Welcome line',
      type: 'text',
      rows: 3,
      description: 'The friendly intro under the title.',
    }),
    defineField({
      name: 'studioMap',
      title: 'The map: where everything lives',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'mapRow',
          fields: [
            defineField({ name: 'area', title: 'Area', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'description', title: 'What lives here', type: 'text', rows: 3, validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'area', subtitle: 'description' } },
        }),
      ],
    }),
    defineField({
      name: 'howTos',
      title: 'Step-by-step how-tos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'howTo',
          fields: [
            defineField({ name: 'title', title: 'Task title', type: 'string', validation: (R) => R.required() }),
            defineField({
              name: 'steps',
              title: 'Steps',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              validation: (R) => R.required().min(1),
            }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
    defineField({
      name: 'tips',
      title: 'Tip cards',
      type: 'array',
      description: 'The colored callout cards: the most-important note, photo tips, launching in stages, scheduling, comments, SEO hints, and "stuck?".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tip',
          fields: [
            defineField({ name: 'heading', title: 'Heading', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'tone', title: 'Color tone', type: 'string', options: { list: TONES }, initialValue: 'default' }),
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 5, validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'heading', subtitle: 'tone' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Start Here Guide' }) },
});
