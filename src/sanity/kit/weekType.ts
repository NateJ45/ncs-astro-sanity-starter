// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The weekly tick document (Studio kit, PORTS.md card 111)
// =============================================================================
// Home's "This week" card keeps the jobs an editor ticks BY HAND (the ones the
// data cannot prove, like "checked the events in the church calendar") on one
// small document per week, id `studioWeek-<first day of the week>`. A new week
// has a new id, so the list starts fresh with nothing to reset, and last week's
// document is a harmless record.
//
// It is bookkeeping, not content: Home writes it straight to the dataset (no
// draft), Home's lists and the "is it live?" check skip the type, the Checkup
// ignores it, and it is offered nowhere in the desk or the New document menu.
// A site's Sanity publish webhook should leave it out too (its filter), or a
// tick would rebuild the website for nothing; docs/agent/studio-kit.md.
// =============================================================================

import { defineField, defineType } from 'sanity';
import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle';
import { WEEK_TYPE } from '../../lib/studio-kit';

export const studioWeekType = defineType({
  name: WEEK_TYPE,
  title: 'Weekly checklist',
  type: 'document',
  icon: CheckmarkCircleIcon,
  readOnly: true,
  fields: [
    defineField({
      name: 'weekOf',
      title: 'Week starting',
      type: 'date',
    }),
    defineField({
      name: 'ticked',
      title: 'Jobs ticked by hand',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
  preview: {
    select: { weekOf: 'weekOf', ticked: 'ticked' },
    prepare: ({ weekOf, ticked }: { weekOf?: string; ticked?: string[] }) => ({
      title: `Week starting ${weekOf ?? '?'}`,
      subtitle: `${ticked?.length ?? 0} ticked by hand`,
    }),
  },
});
