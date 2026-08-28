// Reusable object type: one link in a menu (header, footer column, legal row).
//
// Two ways to point a link somewhere:
//   - "internal": pick a real page document. The address is worked out from the
//     document, so renaming a page's slug can never leave a dead menu link.
//   - "external": paste a full web address.
//
// `href` is the ORIGINAL hand-typed address field. Every menu item written
// before the picker existed carries one. It is kept, and it still WINS over the
// other two, so every existing menu keeps rendering exactly as it did. It hides
// itself on new links, which start out as page pickers.
//
// Internal link targets: every document type listed in `internalPage.to[]` must
// have an entry in SINGLETON_LIVE_PATHS in src/lib/nav-href.ts (or a slug-based
// case there), or the link resolves to nothing and is skipped rather than
// rendered dead. Keep the two in sync.
//
// Module routes (/portfolio, /shop, /quiz, ...) have no singleton document of
// their own, so they are reached with the "Another website" box or the legacy
// typed address, exactly as before.

import { defineType, defineField } from 'sanity';
import { LinkIcon } from '@sanity/icons';

export const navLink = defineType({
  name: 'navLink',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'What visitors see, e.g. "Services".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'linkType',
      title: 'Where does it go?',
      type: 'string',
      options: {
        list: [
          { title: 'A page on this site', value: 'internal' },
          { title: 'Another website', value: 'external' },
        ],
        layout: 'radio',
      },
      initialValue: 'internal',
    }),
    defineField({
      name: 'internalPage',
      title: 'Page to link to',
      type: 'reference',
      description: 'Pick the page. The web address follows the page, so it can never go stale.',
      to: [
        // Page singletons — each resolves to a fixed route.
        { type: 'homePage' },
        { type: 'aboutPage' },
        { type: 'servicesPage' },
        { type: 'processPage' },
        { type: 'faqPage' },
        { type: 'contactPage' },
        { type: 'journalPage' },
        { type: 'privacyPage' },
        // Pages built by the editor (slug-based route /[slug]).
        { type: 'page' },
      ],
      hidden: ({ parent }) => parent?.linkType !== 'internal',
    }),
    defineField({
      name: 'externalUrl',
      title: 'Web address',
      type: 'url',
      description: 'A full address like https://example.com. It opens in a new tab.',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
      hidden: ({ parent }) => parent?.linkType !== 'external',
    }),
    defineField({
      name: 'href',
      title: 'Address (typed by hand)',
      type: 'string',
      description:
        'An older-style address like /services. It still works and it wins over the choices above. Clear it to use the page picker instead.',
      // Shown on links that already carry one and on links with no choice made
      // yet; hidden once a link uses the picker.
      hidden: ({ parent }) => Boolean(parent?.linkType) && !parent?.href,
    }),
  ],
  preview: {
    select: {
      title: 'label',
      href: 'href',
      externalUrl: 'externalUrl',
      linkType: 'linkType',
      pageTitle: 'internalPage.title',
    },
    prepare: ({ title, href, externalUrl, linkType, pageTitle }) => ({
      title: title || '(no label)',
      subtitle: href || (linkType === 'external' ? externalUrl : pageTitle) || 'No destination yet',
    }),
  },
});
