// Safe to edit by hand
// A popup: a short message in a box over the page, with one button (PORTS.md card 170). Different
// from an Announcement (announcement.ts), which is a quiet line across the top of every page: a
// popup interrupts, so it carries guard rails.
//
//   - One at a time. The site shows only one (src/lib/popup.ts, pickPopup), and the Studio warns
//     here when two switched-on popups share any dates.
//   - Never straight away. It waits until the visitor has been on the page at least 4 seconds AND
//     has scrolled a little (src/components/SitePopup.astro has the reasons).
//   - Shown once per visitor or once per visit, then remembered in the visitor's browser.
//   - Short: a heading of 60 characters, a message of 200, one button.
//
// The site reads it at build time (BaseLayout), so a change goes live after the publish rebuild;
// the start and end dates are also checked in the visitor's browser, so they are exact.
// With no popup documents nothing renders and no script ships. docs/agent/popups.md.

import { defineField, defineType } from 'sanity';
import { BellIcon } from '@sanity/icons/Bell';
import { previewDate, previewSubtitle } from '../../lib/studio-icons';
import { POPUP_PAGE_TYPES, popupsOverlap, type PopupDoc } from '../../lib/popup';

export const popup = defineType({
  name: 'popup',
  title: 'Popup',
  type: 'document',
  icon: BellIcon,
  // Overlap check: only one popup shows at a time, so two switched on for the same days means one
  // of them will not be seen. A warning, not an error: the newer one simply wins.
  validation: (Rule) =>
    Rule.custom(async (doc, context) => {
      const d = doc as (PopupDoc & { enabled?: boolean }) | undefined;
      if (!d?._id || d.enabled === false) return true;
      const id = d._id.replace(/^drafts\./, '');
      const others = await context
        .getClient({ apiVersion: '2026-05-01' })
        .fetch<{ _id: string; title?: string; startDate?: string; endDate?: string }[]>(
          `*[_type == "popup" && enabled == true && !(_id in [$id, $draft]) && !(_id in path("drafts.**"))]{ _id, title, startDate, endDate }`,
          { id, draft: `drafts.${id}` },
        )
        .catch(() => []);
      const clash = others.find((o) => popupsOverlap(d, o));
      return clash
        ? `"${clash.title || 'Another popup'}" is also switched on for some of these dates. Only one popup shows at a time (the one that started most recently), so change the dates or switch one off.`
        : true;
    }).warning(),
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      description: 'The big line at the top of the popup. Keep it short, like "Holiday hours".',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'text',
      title: 'Message',
      type: 'text',
      rows: 3,
      description:
        'One or two sentences. Example: "We are open late every Thursday in December. Drop by and say hello."',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'button',
      title: 'Button (optional)',
      type: 'object',
      description: 'One button that takes people somewhere, like the page with the details.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'label',
          title: 'Button text',
          type: 'string',
          description: 'A few words, like "See the details" or "Book a time".',
          validation: (Rule) => Rule.max(30),
        }),
        defineField({
          name: 'link',
          title: 'Where it goes',
          type: 'url',
          description:
            'A page on this site, like /contact/, or a full address starting with https://.',
          // A relative uri rule lifts Sanity's default "absolute address only" rule for a url
          // field; the custom half then asks a relative link to start with a slash.
          validation: (Rule) =>
            Rule.uri({ allowRelative: true, scheme: ['http', 'https'] }).custom((value) =>
              !value || /^(\/|https?:\/\/)/i.test(String(value))
                ? true
                : 'Start with a slash for a page on this site (like /contact/), or with https:// for another website.',
            ),
        }),
      ],
      validation: (Rule) =>
        Rule.custom((v: { label?: string; link?: string } | undefined) =>
          (v?.label && !v?.link) || (!v?.label && v?.link)
            ? 'Fill in both the button text and where it goes, or leave both empty.'
            : true,
        ),
    }),
    defineField({
      name: 'image',
      title: 'Picture (optional)',
      type: 'image',
      description:
        'A picture across the top of the popup. A wide photo works best. Leave it empty for a simpler popup.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the photo in a few words, for screen readers and search engines.',
          validation: (R) =>
            R.custom((alt, ctx) =>
              (ctx.parent as { asset?: unknown } | undefined)?.asset && !alt?.trim()
                ? 'Describe the picture in a few words.'
                : true,
            ),
        }),
      ],
    }),
    defineField({
      name: 'startDate',
      title: 'Show from (optional)',
      type: 'datetime',
      description: 'Leave empty to start as soon as you publish.',
    }),
    defineField({
      name: 'endDate',
      title: 'Show until',
      type: 'datetime',
      description:
        'The popup takes itself down after this. A popup should not stay up forever, so pick the day after the event.',
      validation: (Rule) =>
        Rule.required()
          .error('Pick the last day for this popup, so it takes itself down.')
          .custom((end, ctx) => {
            const start = (ctx.document as { startDate?: string } | undefined)?.startDate;
            return start && end && Date.parse(String(end)) <= Date.parse(start)
              ? '"Show until" must be after "Show from".'
              : true;
          }),
    }),
    defineField({
      name: 'where',
      title: 'Which pages',
      type: 'string',
      options: {
        list: [
          { title: 'Every page', value: 'all' },
          { title: 'Home page only', value: 'home' },
          { title: 'Only the pages I choose', value: 'chosen' },
        ],
        layout: 'radio',
      },
      initialValue: 'all',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'pages',
      title: 'Show it on these pages',
      type: 'array',
      of: [{ type: 'reference', to: POPUP_PAGE_TYPES.map((type) => ({ type })) }],
      hidden: ({ parent }) => (parent as { where?: string } | undefined)?.where !== 'chosen',
      validation: (Rule) =>
        Rule.custom((v, ctx) =>
          (ctx.parent as { where?: string } | undefined)?.where === 'chosen' &&
          !(Array.isArray(v) && v.length)
            ? 'Choose at least one page, or pick "Every page".'
            : true,
        ),
    }),
    defineField({
      name: 'frequency',
      title: 'How often',
      type: 'string',
      description:
        'Once per visitor: someone who closes it does not see it again on that phone or computer. Once per visit: it comes back the next time they visit the website.',
      options: {
        list: [
          { title: 'Once per visitor', value: 'visitor' },
          { title: 'Once per visit', value: 'visit' },
        ],
        layout: 'radio',
      },
      initialValue: 'visitor',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'enabled',
      title: 'Switched on',
      type: 'boolean',
      description: 'The on/off switch. When off, this popup never shows, whatever the dates say.',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      enabled: 'enabled',
      start: 'startDate',
      end: 'endDate',
      where: 'where',
    },
    prepare: ({ title, enabled, start, end, where }) => {
      const now = new Date().toISOString();
      const when = !enabled
        ? 'Off'
        : start && start > now
          ? `Starts ${previewDate(start)}`
          : end && end < now
            ? 'Ended'
            : end
              ? `Showing until ${previewDate(end)}`
              : 'Showing';
      const pages =
        where === 'home' ? 'Home page' : where === 'chosen' ? 'Chosen pages' : 'Every page';
      return { title: title || 'Popup', subtitle: previewSubtitle(when, pages) };
    },
  },
  orderings: [
    { title: 'Soonest to end', name: 'endAsc', by: [{ field: 'endDate', direction: 'asc' }] },
    { title: 'Newest', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
});
