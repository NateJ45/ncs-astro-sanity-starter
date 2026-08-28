// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// formQuestion - one question an editor writes for a form section
// =============================================================================
// A form section normally asks the fixed set of questions a developer wrote.
// Add rows here and the form asks YOUR questions instead, after the standard
// name, email, and phone boxes. Those standard boxes always come first, so a
// reply address is guaranteed no matter what the editor writes.
//
// The shared shaping and the caps live in src/lib/custom-form-fields.ts. The
// parent field caps the list at 12 questions.
//
// Brand-lock still holds: a question controls the WORDS and the answer type,
// never the design. There is no width, color, or layout field here on purpose.
//
// The type is named `formQuestion`, not `formField`, because some repos in the
// family already register a `formField` object of their own. Keep this name.
// =============================================================================
import { defineType, defineField } from 'sanity';

export const formQuestion = defineType({
  name: 'formQuestion',
  title: 'Question',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Question',
      type: 'string',
      description: 'What you ask, e.g. "Which day works best?".',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'kind',
      title: 'Answer type',
      type: 'string',
      options: {
        list: [
          { title: 'Short text', value: 'text' },
          { title: 'Email address', value: 'email' },
          { title: 'Phone number', value: 'phone' },
          { title: 'Long text (a paragraph)', value: 'textarea' },
          { title: 'Choose one from a list', value: 'select' },
          { title: 'Yes / no tick box', value: 'checkbox' },
        ],
        layout: 'radio',
      },
      initialValue: 'text',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'options',
      title: 'Choices',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'The options in the list. Add at least one.',
      hidden: ({ parent }) => parent?.kind !== 'select',
      validation: (R) =>
        R.custom((value, context) => {
          const parent = context.parent as { kind?: string } | undefined;
          if (parent?.kind !== 'select') return true;
          const list = Array.isArray(value) ? value.filter(Boolean) : [];
          return list.length > 0 || 'Add at least one choice.';
        }),
    }),
    defineField({
      name: 'required',
      title: 'Must be answered?',
      type: 'boolean',
      description: 'On: the visitor cannot send the form until they answer this.',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'label', kind: 'kind', required: 'required' },
    prepare({ title, kind, required }) {
      const KINDS: Record<string, string> = {
        text: 'Short text',
        email: 'Email address',
        phone: 'Phone number',
        textarea: 'Long text',
        select: 'Choose one',
        checkbox: 'Tick box',
      };
      const type = KINDS[kind as string] ?? 'Short text';
      return {
        title: title || '(no question yet)',
        subtitle: required ? `${type} · must be answered` : type,
      };
    },
  },
});
