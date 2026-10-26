// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The "Simple view" marks document (Studio kit, PORTS.md card 175)
// =============================================================================
// One small document, id `kit.studioStaff` (an id path, so a public dataset
// never serves it), holding the Sanity user ids an administrator ticked
// "Simple view" for in the People tool (card 176). Those accounts get the
// staff view whatever their role: on Sanity's Free plan, which has only
// Administrator and Viewer, a helper invited as an Administrator gets the
// simple Studio this way. The rules are in src/lib/studio-kit.ts.
//
// Bookkeeping, not content, like the weekly tick document (weekType.ts): the
// People tool writes it straight to the dataset (no draft), Home's lists, the
// Checkup and "is it live?" skip the type, and it is offered nowhere in the
// desk or the New document menu. A site's publish webhook filter should leave
// it out too, or a tick would rebuild the website for nothing.
// =============================================================================

import { defineField, defineType } from 'sanity';
import { UsersIcon } from '@sanity/icons/Users';
import { STAFF_TYPE } from '../../lib/studio-kit';

export const studioStaffType = defineType({
  name: STAFF_TYPE,
  title: 'Simple view accounts',
  type: 'document',
  icon: UsersIcon,
  readOnly: true,
  fields: [
    defineField({
      name: 'ids',
      title: 'Sanity user ids with the simple view',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
  preview: {
    select: { ids: 'ids' },
    prepare: ({ ids }: { ids?: string[] }) => ({
      title: 'Simple view accounts',
      subtitle: `${ids?.length ?? 0} marked`,
    }),
  },
});
