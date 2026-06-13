// Foundation, edit with care
// Site-wide announcement banner collection.
//
// Editors can queue several notices ahead of time (a sale, a closure, a
// seasonal promotion) and let them switch on and off by date. The active
// announcement shows at the top of every page above the header. BaseLayout
// picks the most urgent entry that is currently within its date window.
//
// "Active" = enabled AND (no startDate or startDate has passed) AND
//            (no endDate or endDate is still in the future).
//
// Build-time note: date-window logic is evaluated at BUILD TIME. This is a
// static site -- a banner only appears or disappears after a rebuild. Set up a
// Cloudflare deploy hook on a daily schedule (docs/agent/deployment.md) if you
// need banners to auto-expire without a manual publish.
//
// Style tokens map to existing semantic color tokens -- no new tokens are
// introduced here:
//   info      -> bg-muted (calm, informational)
//   highlight -> bg-primary / text-primary-foreground (brand accent, good news)
//   urgent    -> bg-destructive / text-destructive-foreground (red, closures)

import { defineType, defineField } from 'sanity';
import { BellIcon } from '@sanity/icons';

export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'internalTitle',
      title: 'Internal name',
      type: 'string',
      description: 'For your reference in the Studio only. Not shown on the site. Example: "Summer hours notice".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
      description: 'The text shown in the banner. Keep it short (under 160 characters). Example: "We are closed 26 Dec through 1 Jan. Replies will be slower than usual."',
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      description: 'Info = calm muted background (neutral updates). Highlight = brand primary (good news, promotions). Urgent = red (closures, important warnings).',
      options: {
        list: [
          { title: 'Info (neutral, muted background)', value: 'info' },
          { title: 'Highlight (brand primary, good news)', value: 'highlight' },
          { title: 'Urgent (red, closures or warnings)', value: 'urgent' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({
      name: 'link',
      title: 'Link (optional)',
      type: 'object',
      description: 'Optional. Adds a clickable link at the end of the message.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'label',
          title: 'Link label',
          type: 'string',
          description: 'The clickable text. Example: "See our holiday schedule".',
        }),
        defineField({
          name: 'url',
          title: 'URL',
          type: 'string',
          description: 'A page on this site like /contact, or a full https:// address.',
        }),
      ],
    }),
    defineField({
      name: 'startDate',
      title: 'Show from (optional)',
      type: 'datetime',
      description: 'Leave blank to show immediately when enabled. Set a date to schedule the banner ahead of time. Evaluated at build time -- set up a scheduled rebuild if you need precise timing.',
    }),
    defineField({
      name: 'endDate',
      title: 'Hide after (optional)',
      type: 'datetime',
      description: 'Leave blank to keep showing until you disable it. Set a date to auto-expire the banner. Evaluated at build time -- a rebuild is needed for the banner to disappear.',
    }),
    defineField({
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      description: 'Master on/off switch. When off, this announcement never shows regardless of dates.',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      message: 'message',
      style: 'style',
      enabled: 'enabled',
      start: 'startDate',
      end: 'endDate',
    },
    prepare: ({ message, style, enabled, start, end }) => {
      const window = [
        start ? new Date(start).toLocaleDateString() : null,
        end ? new Date(end).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' to ');
      return {
        title: message || 'Announcement',
        subtitle: `${enabled ? '' : 'OFF: '}${style ?? 'info'}${window ? ` (${window})` : ''}`,
      };
    },
  },
  orderings: [
    { title: 'Soonest to end', name: 'endAsc', by: [{ field: 'endDate', direction: 'asc' }] },
    { title: 'Newest', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
});
