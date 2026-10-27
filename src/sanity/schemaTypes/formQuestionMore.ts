// Safe to edit by hand
// =============================================================================
// Two more kinds of question for the form builder (PORTS.md card 194)
// =============================================================================
// The shared `formQuestion` (formQuestion.ts) is PORTABLE and keeps its six answer types, so the
// Contact page's questions are untouched. The form builder (form.ts) also offers these two, as
// their own items in the questions list ("+ Add item" shows "A date" and "Tick any that apply"):
//
//   formDateQuestion   a date picker ("Which day works for you?")
//   formTickQuestion   several boxes, tick any that apply ("Which of these interest you?")
//
// src/lib/site-form.ts reads both (normalizeFormQuestions), /api/form/ checks the answers against
// them on the server, and the email and the stored copy carry them in plain words. No file
// uploads, on purpose: the dataset is public and the inbox is the only safe home for a file.
// Brand-lock holds: the words and the answer type only, never the look.
// =============================================================================
import { defineField, defineType } from 'sanity';
import { CalendarIcon } from '@sanity/icons/Calendar';
import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle';

/** The most boxes one "tick any" question offers (site-form.ts holds the same number). */
export const MAX_TICK_CHOICES = 12;

const labelField = (example: string) =>
  defineField({
    name: 'label',
    title: 'Question',
    type: 'string',
    description: `What you ask, like "${example}".`,
    validation: (R) => R.required().max(120),
  });

const requiredField = (title: string, description: string) =>
  defineField({
    name: 'required',
    title,
    type: 'boolean',
    description,
    initialValue: false,
  });

export const formDateQuestion = defineType({
  name: 'formDateQuestion',
  title: 'A date',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    labelField('Which day would you like to come?'),
    defineField({
      name: 'notPast',
      title: 'Only from today on',
      type: 'boolean',
      description: 'On: people cannot pick a day that has already passed. Good for sign-ups.',
      initialValue: true,
    }),
    requiredField('Must be answered?', 'On: the form cannot be sent until a date is picked.'),
  ],
  preview: {
    select: { title: 'label', required: 'required' },
    prepare: ({ title, required }) => ({
      title: title || '(no question yet)',
      subtitle: required ? 'A date · must be answered' : 'A date',
      media: CalendarIcon,
    }),
  },
});

export const formTickQuestion = defineType({
  name: 'formTickQuestion',
  title: 'Tick any that apply',
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    labelField('Which of these would you like to help with?'),
    defineField({
      name: 'options',
      title: 'Choices',
      type: 'array',
      of: [{ type: 'string' }],
      description: `One box for each. People can tick as many as they like. Two to ${MAX_TICK_CHOICES}.`,
      validation: (R) =>
        R.custom((value) => {
          const list = Array.isArray(value) ? value.filter(Boolean) : [];
          if (list.length < 2) return 'Add at least two choices.';
          if (list.length > MAX_TICK_CHOICES) {
            return `Keep it to ${MAX_TICK_CHOICES} choices or fewer; only the first ${MAX_TICK_CHOICES} show.`;
          }
          return true;
        }),
    }),
    requiredField(
      'Must tick at least one?',
      'On: the form cannot be sent until at least one box is ticked.',
    ),
  ],
  preview: {
    select: { title: 'label', options: 'options', required: 'required' },
    prepare: ({ title, options, required }) => ({
      title: title || '(no question yet)',
      subtitle: `Tick any of ${Array.isArray(options) ? options.length : 0}${
        required ? ' · must be answered' : ''
      }`,
      media: CheckmarkCircleIcon,
    }),
  },
});
