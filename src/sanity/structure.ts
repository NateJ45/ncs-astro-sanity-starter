// Studio Desk structure. Pins Site Settings at the top, then ALL page singletons
// (one document each) under "Pages", then the reusable content collections under
// "Content", then "Journal". Every document type is placed explicitly so nothing
// floats loose at the desk root. The trailing default-list filter is a safety net
// for any future type that hasn't been placed (and hides sanity-plugin-media's
// media.tag type, which would otherwise show at the root).
//
// "Pages" is one list (so the rule for editors is simple: every page lives here).
//
// Orderable lists: service / philosophyPoint use the orderable-document-list plugin.
// Editors drag rows to reorder; the plugin writes an `orderRank` string. GROQ
// queries order by orderRank (with displayOrder fallback) so the site mirrors Studio.
//
// Preview: 2026-08-28 the per-document iframe tab (sanity-plugin-iframe-pane)
// was retired in favour of the Presentation tool, which renders the SSR
// /preview/* routes with click-to-edit and in-canvas section controls. The
// singleton list items below therefore carry the plain form view, and
// "see it on the page" is the Presentation tool in the navbar.

import type { StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import { makeGuideView } from './components/GuideView';
import { guides, GUIDE_CATEGORIES } from './guides/content';
import StudioGuide from './components/StudioGuide';
import BusinessOverview from './components/BusinessOverview';
import BrandKit from './components/BrandKit';
import { staffDesk } from './kit/shared';
import { trashListItem } from './kit/trash';
import { brandIcon, typeIcon, type BrandIcon } from './brandIcons';
import { guideMeaning } from '../lib/studio-look';
import { kitConfig } from './kit.config';
import { TRASH_TYPE } from '../lib/studio-trash';
import { privateDocId } from '../lib/private-pages';
import { WEEK_TYPE } from '../lib/studio-kit';
import { tableListItem } from './workflow';
import { TABLES } from './tables.config';

const SINGLETON_TYPES = [
  'siteSettings',
  'businessInfo',
  // Core pages
  'homePage',
  'aboutPage', // scaffold: about
  'servicesPage', // scaffold: services
  'processPage', // scaffold: process
  'faqPage', // scaffold: faq
  'contactPage',
  'journalPage', // scaffold: journal
  'notFoundPage',
  'privacyPage',
  'studioGuide',
  'studioNotes',
] as const;

const ORDERABLE_TYPES = [
  'service', // scaffold: services
  'philosophyPoint', // scaffold: philosophy
  'processStep', // scaffold: process
] as const;

const HIDDEN_FROM_DEFAULT = new Set<string>([
  ...SINGLETON_TYPES,
  ...ORDERABLE_TYPES,
  'announcement', // placed explicitly under Content → Announcements
  'popup', // placed explicitly under Content → Popups, after Announcements
  'testimonial', // scaffold: testimonials
  'faqItem', // scaffold: faq
  'faqCategory', // scaffold: faq
  'journalEntry', // scaffold: journal
  'journalCategory', // scaffold: journal
  'page', // custom pages, placed explicitly under "Pages"
  'privatePage', // private pages (card 122), placed explicitly under "Pages"
  'sectionPreset', // saved sections, placed explicitly under "Pages"
  'redirect', // placed explicitly under "Pages" -> Redirects
  TRASH_TYPE, // the Studio kit's Trash, placed explicitly at the bottom
  // sanity-plugin-media registers this tag type; keep it out of the desk root
  // (the "Media" tool in the top sidebar is where tags belong).
  'media.tag',
  // The Studio kit's weekly tick document (card 111): Home's bookkeeping, never edited here.
  WEEK_TYPE,
  // Private preview link records (card 117): managed from "Share a preview" only.
  'previewShare',
  // processStep is placed explicitly under Content → Process Steps
  'processStep', // scaffold: process
]);

/**
 * Build a singleton list item pinned to one document id.
 *
 * The name is historical: it used to attach an iframe preview view alongside
 * the form. Since 2026-08-28 the live draft preview is the Presentation tool
 * (src/sanity/resolve.ts maps every one of these types to a /preview path), so
 * the editor pane is the form. Views are still set explicitly because
 * S.document().views([...]) bypasses defaultDocumentNode in sanity.config.ts,
 * and that is where the per-type extra tabs are added.
 */
function singletonWithPreview(
  S: StructureBuilder,
  schemaType: string,
  title: string,
  icon: BrandIcon = typeIcon(schemaType),
) {
  // The id is the document id ON PURPOSE: an intent link ("open the About
  // page", from the Studio kit's Home and Checkup) resolves to the path
  // pages;aboutPage, and a title-derived id ("about") left that pane blank
  // (PORTS.md card 106).
  return S.listItem()
    .id(schemaType)
    .title(title)
    .icon(icon)
    .child(
      S.document()
        .schemaType(schemaType)
        .documentId(schemaType)
        .views([S.view.form().title('Edit')]),
    );
}

// The Studio kit's staff view hides kitConfig.staffHiddenPanes from this desk
// (src/sanity/kit/shared.tsx, staffDesk); everyone else sees all of it.
export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  staffDesk(fullDesk(S, context), context, kitConfig);

const fullDesk = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Studio Starter')
    .items([
      // HELP & GUIDE — the handbook, first so it is always in reach.
      //
      // PORTS.md card 41. The guides are DATA in src/sanity/guides/content.ts,
      // held in the repo rather than in Sanity, so they cannot be deleted by
      // the person who most needs them and every fork inherits them with the
      // code. THE SHIPPED SET IS GENERIC ON PURPOSE and is meant to be
      // rewritten per project; see that file's header.
      //
      // It sits ABOVE "Start Here" rather than replacing it. Start Here is
      // three editable singletons and works well when a project seeds them,
      // but a fork that skips `npm run seed` gets four panes that open EMPTY,
      // which is what happened in stonesteps-50k. A repo-data handbook cannot
      // do that. A project that wants only one of the two should delete the
      // other rather than ship both.
      S.listItem()
        .id('help-and-guide')
        .title('Help & Guide')
        .icon(brandIcon('guide'))
        .child(
          S.list()
            .id('help-and-guide-list')
            .title('Help & Guide')
            .items(
              GUIDE_CATEGORIES.flatMap((category) => {
                const mine = guides.filter((g) => g.category === category);
                return mine.length === 0
                  ? []
                  : [
                      S.divider().title(category),
                      ...mine.map((g) =>
                        S.listItem()
                          .id(`guide-${g.slug}`)
                          .title(g.title)
                          .icon(brandIcon(guideMeaning(g.icon)))
                          .child(
                            S.component(makeGuideView(g.slug) as never)
                              .id(`guide-view-${g.slug}`)
                              .title(g.title),
                          ),
                      ),
                    ];
              }),
            ),
        ),

      S.divider(),

      // Start Here — three-panel handbook for the editor.
      // Panel 1: how the Studio works and step-by-step how-tos (static).
      // Panel 2: live business overview (services + site settings fetched from Sanity).
      // Panel 3: brand kit — colors + fonts for Canva (static).
      S.listItem()
        .id('start-here')
        .title('Start Here')
        .icon(brandIcon('guide'))
        .child(
          S.list()
            .title('Start Here')
            .items([
              S.listItem()
                .title('How the website works')
                .icon(brandIcon('guide'))
                .child(
                  S.document()
                    .schemaType('studioGuide')
                    .documentId('studioGuide')
                    .views([
                      S.view.component(StudioGuide).title('Guide'),
                      S.view.form().title('Edit'),
                    ]),
                ),
              S.listItem()
                .title('Your business at a glance')
                .icon(typeIcon('studioNotes'))
                .child(
                  S.document()
                    .schemaType('studioNotes')
                    .documentId('studioNotes')
                    .views([
                      S.view.component(BusinessOverview).title('Overview'),
                      S.view.form().title('Edit notes'),
                    ]),
                ),
              S.listItem()
                .title('Brand kit')
                .icon(brandIcon('brandKit'))
                .child(S.component(BrandKit).title('Brand kit')),
            ]),
        ),

      S.divider(),

      // Site Settings — pinned singleton (no preview; not a page)
      singletonWithPreview(S, 'siteSettings', 'Site Settings'),

      S.divider(),

      // Pages — every page singleton lives here.
      S.listItem()
        .title('Pages')
        .icon(brandIcon('pages'))
        .child(
          S.list()
            .title('Pages')
            .items([
              singletonWithPreview(S, 'homePage', 'Home'),
              singletonWithPreview(S, 'aboutPage', 'About'), // scaffold: about
              singletonWithPreview(S, 'servicesPage', 'Services'), // scaffold: services
              singletonWithPreview(S, 'processPage', 'Process'), // scaffold: process
              singletonWithPreview(S, 'faqPage', 'FAQ'), // scaffold: faq
              singletonWithPreview(S, 'contactPage', 'Contact'),
              singletonWithPreview(S, 'journalPage', 'Journal (index page)'), // scaffold: journal
              singletonWithPreview(S, 'notFoundPage', '404 Page'),

              S.divider(),

              singletonWithPreview(S, 'privacyPage', 'Privacy Policy Page'),

              S.divider(),

              // Custom pages: editors build these themselves from the section library.
              // Multi-instance (not a singleton), so it is a normal document list.
              S.documentTypeListItem('page')
                .title('Custom pages (build your own)')
                .icon(typeIcon('page')),

              // Private pages (PORTS.md card 122): only people with the
              // password can open them. EVERY ONE IS STORED UNDER THE
              // privatePage. ID PATH, which Sanity never serves to the public
              // API, and this child resolver is what does it: a new page made
              // from this list gets a fresh id, and the editor opens it as
              // privatePage.<that id>. Existing rows already carry the prefix.
              // The global "Create" menu and Duplicate are switched off for
              // this type in sanity.config.ts so nothing makes one elsewhere.
              S.listItem()
                .id('privatePage')
                .title('Private pages (password)')
                .icon(typeIcon('privatePage'))
                .schemaType('privatePage')
                .child(
                  S.documentTypeList('privatePage')
                    .title('Private pages')
                    .child((id: string) =>
                      S.document().schemaType('privatePage').documentId(privateDocId(id)),
                    ),
                ),

              S.divider(),

              // Saved sections: one band of a page, kept for reuse. Made from a
              // page's publish menu ("Save a section as preset..."), added to a
              // page from the Saved sections group in the Presentation
              // navigator. Ordered by name, because the name is the only way
              // you find one again.
              S.documentTypeListItem('sectionPreset')
                .title('Saved sections')
                .icon(typeIcon('sectionPreset')),

              S.divider(),

              // Redirects: old address -> new address. Most entries are filed
              // automatically when a page's web address changes on publish
              // (src/sanity/components/slugRedirect.tsx); the editor adds one by
              // hand for an address that never existed on this site.
              S.documentTypeListItem('redirect')
                .title('Redirects (old links)')
                .icon(typeIcon('redirect')),
            ]),
        ),

      S.divider(),

      // Content — reusable collections. Orderable types get drag-and-drop;
      // non-orderable use standard lists.
      S.listItem()
        .id('content')
        .title('Content')
        .icon(brandIcon('content'))
        .child(
          S.list()
            .title('Content')
            .items([
              // Business info: service areas, travel fees, availability, geo.
              // Moved here from Site Settings so Settings is identity + infrastructure only.
              singletonWithPreview(S, 'businessInfo', 'Business info'),

              S.divider(),

              // scaffold: services
              orderableDocumentListDeskItem({
                type: 'service',
                title: 'Services',
                icon: typeIcon('service'),
                S,
                context,
              }),
              // scaffold:end
              // scaffold: philosophy
              orderableDocumentListDeskItem({
                type: 'philosophyPoint',
                title: 'Philosophy Values',
                icon: typeIcon('philosophyPoint'),
                S,
                context,
              }),
              // scaffold:end
              // scaffold: process
              orderableDocumentListDeskItem({
                type: 'processStep',
                title: 'Process Steps',
                icon: typeIcon('processStep'),
                S,
                context,
              }),
              // scaffold:end
              S.documentTypeListItem('testimonial')
                .title('Testimonials')
                .icon(typeIcon('testimonial')), // scaffold: testimonials
              S.documentTypeListItem('faqCategory')
                .title('FAQ Categories')
                .icon(typeIcon('faqCategory')), // scaffold: faq
              S.documentTypeListItem('faqItem').title('FAQ Items').icon(typeIcon('faqItem')), // scaffold: faq

              S.divider(),

              // Announcement banners: queued notices that appear above the header.
              // Each one has a date window (startDate / endDate) and an on/off toggle.
              // The active announcement is picked at build time; a rebuild is required
              // for the banner to appear or disappear on the live site.
              S.documentTypeListItem('announcement')
                .title('Announcements')
                .icon(typeIcon('announcement')),
              // Popups (card 170, schemaTypes/popup.ts): a box over the page, one at a time,
              // with dates. Also built into the site at build time.
              S.documentTypeListItem('popup').title('Popups').icon(typeIcon('popup')),
            ]),
        ),

      S.divider(),

      // scaffold: journal
      // Journal — its own section so the editor can find posts + categories at a glance
      S.listItem()
        .title('Journal')
        .icon(brandIcon('journal'))
        .child(
          S.list()
            .title('Journal')
            .items([
              S.documentTypeListItem('journalEntry').title('Posts').icon(typeIcon('journalEntry')),
              // The same posts as a sortable table (card 117, tables.config.ts).
              ...TABLES.filter((c) => c.type === 'journalEntry').map((c) => tableListItem(S, c)),
              S.documentTypeListItem('journalCategory')
                .title('Categories')
                .icon(typeIcon('journalCategory')),
            ]),
        ),
      // scaffold:end

      S.divider(),

      // The Studio kit's Trash: "Move to Trash" keeps a copy here, and "Bring
      // it back" puts it where it was (src/sanity/kit/trash.tsx). The id is
      // load-bearing: the Checkup's "Open the Trash" links to it.
      trashListItem(S, context, brandIcon('trash')),

      // Safety net: surface any document type we have NOT explicitly placed above
      // (and keep the hidden set out of the desk root). Every media.* type
      // belongs to sanity-plugin-media's own tool: newer versions add more than
      // media.tag (a "Media Folder" list leaked into the desk on 2026-10-17).
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() as string;
        return !HIDDEN_FROM_DEFAULT.has(id) && !id.startsWith('media.');
      }),
    ]);
