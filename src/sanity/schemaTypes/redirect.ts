// Safe to edit by hand
// =============================================================================
// redirect - an old address -> new address forward (editor-managed)
// =============================================================================
// When a page is renamed or moved, old links (bookmarks, Google results, other
// sites) would 404. A redirect sends them to the right new place.
//
// Most of these are written FOR the editor, not BY them: renaming the web
// address of a published page files this document automatically at publish time
// (src/sanity/components/slugRedirect.tsx). The editor still adds one by hand
// for an address that never existed here - a link from an old site, or a
// printed card.
//
// They are applied at BUILD time: astro.config.mjs reads the published redirect
// docs and folds them into Astro's `redirects` map, which the Cloudflare adapter
// emits as real 301/302s. So a redirect takes effect on the next deploy, like
// any other content change. The path rules live in src/lib/redirects.ts.

import { defineType, defineField } from 'sanity';
import { ArrowRightIcon } from '@sanity/icons';

export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ArrowRightIcon,
  // Configuration-style document - keep Canvas AI writing tools away from it.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'from',
      title: 'Old address (that should forward)',
      type: 'string',
      description:
        'The address people are still using, starting with a slash, like "/old-page". Just the part after the domain, no https://.',
      validation: (Rule) =>
        Rule.required()
          .custom((value) => {
            if (typeof value !== 'string') return 'Required';
            if (!value.startsWith('/')) return 'Start with a slash, like "/old-page".';
            if (/\s/.test(value)) return 'No spaces. Use dashes, like "/open-house".';
            return true;
          })
          .error('Enter the old address, starting with a slash.'),
    }),
    defineField({
      name: 'to',
      title: 'Send them to',
      type: 'string',
      description:
        'Where to forward: a page on this site like "/contact", or a full web address like "https://example.org".',
      validation: (Rule) =>
        Rule.required()
          .custom((value, context) => {
            if (typeof value !== 'string') return 'Required';
            const ok = value.startsWith('/') || /^https?:\/\//.test(value);
            if (!ok) return 'Use an address like "/contact" or a full https:// link.';
            const from = (context.document as { from?: string } | undefined)?.from;
            if (from && from === value) return 'The old and new addresses are the same.';
            return true;
          })
          .error('Enter where to send people (a page address or a full link).'),
    }),
    defineField({
      name: 'permanent',
      title: 'Permanent move?',
      type: 'boolean',
      initialValue: true,
      description:
        'On (recommended): tells Google the page moved for good, so it carries the ranking over. Turn off only for a temporary forward.',
    }),
    defineField({
      name: 'note',
      title: 'Note (optional)',
      type: 'string',
      description: 'A reminder to yourself of why this redirect exists.',
    }),
  ],
  preview: {
    select: { from: 'from', to: 'to', permanent: 'permanent' },
    prepare: ({ from, to, permanent }) => ({
      title: `${from || '(no old address)'}  ->  ${to || '(no target)'}`,
      subtitle: permanent === false ? 'Temporary' : 'Permanent',
    }),
  },
});
