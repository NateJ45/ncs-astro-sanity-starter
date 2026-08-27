// studioPlaybook singleton — drives the "Grow your studio" Start Here panel.
// Four professional-development guides (photograph your work, build your
// toolkit, offer e-design, get set up with trade sourcing). Each guide is a
// title + summary + a list of plain-text sections. No Portable Text — same
// deliberate simplicity as studioGuide, so editing stays dead-simple and the
// Studio needs no extra renderer dependency.
import { defineType, defineField, defineArrayMember } from 'sanity';

const TONES = [
  { title: 'Default (plain section)', value: 'default' },
  { title: 'Primary (highlight)', value: 'primary' },
  { title: 'Positive (green)', value: 'positive' },
  { title: 'Caution (amber)', value: 'caution' },
];

export const studioPlaybook = defineType({
  name: 'studioPlaybook',
  title: 'Grow Your Studio Guides',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'title',
      title: 'Panel title',
      type: 'string',
      initialValue: 'Grow your studio',
    }),
    defineField({
      name: 'intro',
      title: 'Welcome line',
      type: 'text',
      rows: 3,
      description: 'The friendly intro under the title.',
    }),
    defineField({
      name: 'guides',
      title: 'Guides',
      type: 'array',
      description: 'Each guide becomes a tab in the panel.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'playbookGuide',
          fields: [
            defineField({ name: 'title', title: 'Guide title', type: 'string', validation: (R) => R.required() }),
            defineField({
              name: 'summary',
              title: 'Short summary',
              type: 'text',
              rows: 3,
              description: 'One or two lines shown at the top of the guide.',
            }),
            defineField({
              name: 'sections',
              title: 'Sections',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'playbookSection',
                  fields: [
                    defineField({ name: 'heading', title: 'Heading', type: 'string', validation: (R) => R.required() }),
                    defineField({
                      name: 'tone',
                      title: 'Style',
                      type: 'string',
                      options: { list: TONES },
                      initialValue: 'default',
                      description: 'Default is a plain section. The colored options turn it into a highlighted callout box.',
                    }),
                    defineField({
                      name: 'body',
                      title: 'Body',
                      type: 'text',
                      rows: 5,
                      description: 'Paragraphs. Leave a blank line between paragraphs.',
                    }),
                    defineField({
                      name: 'bullets',
                      title: 'Bullet points',
                      type: 'array',
                      of: [defineArrayMember({ type: 'string' })],
                    }),
                    defineField({
                      name: 'links',
                      title: 'Links',
                      type: 'array',
                      description: 'Optional clickable links (for example, where to apply).',
                      of: [
                        defineArrayMember({
                          type: 'object',
                          name: 'playbookLink',
                          fields: [
                            defineField({ name: 'label', title: 'Label', type: 'string', validation: (R) => R.required() }),
                            defineField({ name: 'url', title: 'URL', type: 'url', validation: (R) => R.required() }),
                          ],
                          preview: { select: { title: 'label', subtitle: 'url' } },
                        }),
                      ],
                    }),
                  ],
                  preview: { select: { title: 'heading', subtitle: 'tone' } },
                }),
              ],
            }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Grow Your Studio Guides' }) },
});
