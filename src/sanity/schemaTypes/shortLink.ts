// Safe to edit by hand
// =============================================================================
// shortLink - a short address like /spring or /signup (PORTS.md card 171)
// =============================================================================
// For a flyer, a card, a slide or a QR code: a short word after the
// website's address that sends people to a page here or to another website.
// Unlike a Redirect (an OLD address kept working), a short link is made on
// purpose, often for one season, so it is temporary by default and can end on a
// day the editor picks.
//
// Served at BUILD time: astro.config.mjs (the short-links integration) writes
// each published one into _redirects. The rules (address shape, clashes,
// expiry, the lines written) are in src/lib/short-links.ts, shared with the
// build so the Studio warns about exactly what the build would skip.
//
// The QR code button sits in this document's menu (src/sanity/actions/qrCode.tsx).
// `linkKind` and `lasting` are logic dropdowns, so they are in NON_STEGA_FIELDS
// (rule 8b), although no preview renders this type.
// =============================================================================

import { defineType, defineField } from 'sanity';
import { LinkIcon } from '@sanity/icons/Link';
import { normalizeShortAddress, shortAddressProblem, shortLinkClash } from '../../lib/short-links';
import { RESERVED_SLUGS } from '../../lib/reservedSlugs';
import { site } from '../../data/site';
import { ShortLinkAddressInput } from '../components/ShortLinkAddressInput';

// Hand-written launch redirects in astro.config.mjs (`redirects`, before the
// editor spread), which the Studio cannot read. List their old addresses here
// when a site adds any; the build checks the real map anyway.
const LAUNCH_FORWARDS: string[] = [];

const API_VERSION = '2026-05-01';

/** The types a short link can point at: every one with a public page of its own. */
// A site with more routed types (an events page, a collection with detail
// pages) adds them here and to pathForDoc() in src/sanity/urls.ts.
const PAGE_TARGETS = [
  { type: 'page' },
  { type: 'homePage' },
  { type: 'aboutPage' }, // scaffold: about
  { type: 'servicesPage' }, // scaffold: services
  { type: 'processPage' }, // scaffold: process
  { type: 'faqPage' }, // scaffold: faq
  { type: 'contactPage' },
  { type: 'journalPage' }, // scaffold: journal
  { type: 'journalEntry' }, // scaffold: journal
  { type: 'privacyPage' },
];

interface ClashData {
  pages: { slug: string; archived?: boolean }[];
  redirects: string[];
  links: string[];
}

export const shortLink = defineType({
  name: 'shortLink',
  title: 'Short link',
  type: 'document',
  icon: LinkIcon,
  // Configuration-style document: keep Canvas AI writing tools away from it.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'address',
      title: 'Short address',
      type: 'string',
      components: { input: ShortLinkAddressInput },
      description: `Just the word that goes after ${site.domain}/, like "spring" or "signup". Letters, numbers and dashes only.`,
      validation: (Rule) => [
        Rule.required().custom((value) => shortAddressProblem(value) ?? true),
        // Clashes with a page, a built-in part of the website, a redirect or
        // another short link. The build skips the same ones (pages win).
        Rule.custom(async (value, context) => {
          const address = normalizeShortAddress(value);
          if (!address || shortAddressProblem(address)) return true;
          const id = String(context.document?._id ?? '').replace(/^drafts\./, '');
          let data: ClashData;
          try {
            data = await context.getClient({ apiVersion: API_VERSION }).fetch<ClashData>(
              `{
                "pages": *[_type == "page" && defined(slug.current) && !(_id in path("drafts.**"))]{
                  "slug": slug.current, archived
                },
                "redirects": *[_type == "redirect" && defined(from) && !(_id in path("drafts.**"))].from,
                "links": *[_type == "shortLink" && defined(address) && !(_id in path("drafts.**")) && _id != $id].address
              }`,
              { id },
            );
          } catch {
            return true; // Offline: the build still checks.
          }
          const clash = shortLinkClash(address, {
            reserved: RESERVED_SLUGS,
            pages: data.pages.filter((p) => p.archived !== true).map((p) => p.slug),
            archivedPages: data.pages.filter((p) => p.archived === true).map((p) => p.slug),
            redirects: [...data.redirects, ...LAUNCH_FORWARDS],
            shortLinks: data.links,
          });
          if (!clash || clash.level !== 'error') return true;
          return clash.message;
        }),
        Rule.custom(async (value, context) => {
          const address = normalizeShortAddress(value);
          if (!address || shortAddressProblem(address)) return true;
          try {
            const pages = await context
              .getClient({ apiVersion: API_VERSION })
              .fetch<string[]>(
                '*[_type == "page" && archived == true && slug.current == $slug].slug.current',
                { slug: address },
              );
            const clash = shortLinkClash(address, {
              reserved: new Set(),
              pages: [],
              archivedPages: pages,
              redirects: [],
              shortLinks: [],
            });
            return clash?.message ?? true;
          } catch {
            return true;
          }
        }).warning(),
      ],
    }),
    defineField({
      name: 'linkKind',
      title: 'Where does it go?',
      type: 'string',
      initialValue: 'page',
      options: {
        list: [
          { title: 'A page on this website', value: 'page' },
          { title: 'Another website', value: 'url' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'page',
      title: 'The page',
      type: 'reference',
      to: PAGE_TARGETS,
      hidden: ({ parent }) => (parent as { linkKind?: string } | undefined)?.linkKind === 'url',
      description: 'Pick the page. If the page’s address changes later, the short link follows it.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const kind = (context.parent as { linkKind?: string } | undefined)?.linkKind;
          if (kind !== 'url' && !value) return 'Pick the page it should open.';
          return true;
        }),
    }),
    defineField({
      name: 'url',
      title: 'The web address',
      type: 'url',
      hidden: ({ parent }) => (parent as { linkKind?: string } | undefined)?.linkKind !== 'url',
      description:
        'Paste the whole address, starting with https://, such as a sign-up form or a booking page.',
      validation: (Rule) => [
        Rule.uri({ scheme: ['http', 'https'] }),
        Rule.custom((value, context) => {
          const kind = (context.parent as { linkKind?: string } | undefined)?.linkKind;
          if (kind === 'url' && !value) return 'Paste the web address it should open.';
          return true;
        }),
        Rule.custom((value) => {
          if (typeof value !== 'string') return true;
          try {
            if (new URL(value).hostname === site.domain) {
              return 'That is a page on this website. Choose "A page on this website" instead, so the link keeps working if the page or the website’s address changes.';
            }
          } catch {
            /* the uri rule above reports it */
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: 'lasting',
      title: 'Is this for now, or for good?',
      type: 'string',
      initialValue: 'temporary',
      options: {
        list: [
          {
            title: 'For now (an event or a season). You can point it somewhere else later.',
            value: 'temporary',
          },
          {
            title: 'For good. It will always go to the same place.',
            value: 'permanent',
          },
        ],
        layout: 'radio',
      },
      description:
        'Pick "For now" unless you are sure. Browsers remember a "For good" link, so changing it later can take a while to reach everyone.',
    }),
    defineField({
      name: 'expires',
      title: 'Last day (optional)',
      type: 'date',
      description:
        'The short link works through this day and stops at the first website update after it. Leave it empty to keep it going.',
    }),
    defineField({
      name: 'note',
      title: 'What is it for? (optional)',
      type: 'string',
      description: 'A reminder for the list, like "Spring flyer, 2027".',
    }),
  ],
  orderings: [
    {
      title: 'Short address, A to Z',
      name: 'addressAsc',
      by: [{ field: 'address', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      address: 'address',
      note: 'note',
      kind: 'linkKind',
      url: 'url',
      pageTitle: 'page.title',
      pageSlug: 'page.slug.current',
      expires: 'expires',
    },
    prepare: ({ address, note, kind, url, pageTitle, pageSlug, expires }) => {
      const where =
        kind === 'url'
          ? String(url ?? 'no address yet')
          : String(pageTitle ?? pageSlug ?? 'no page yet');
      return {
        title: address ? `/${normalizeShortAddress(address)}` : 'New short link',
        subtitle: [`Goes to ${where}`, note, expires ? `until ${expires}` : null]
          .filter(Boolean)
          .join(' · '),
      };
    },
  },
});
