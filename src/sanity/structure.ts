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
import {
  BellIcon,
  CogIcon,
  HomeIcon,
  UserIcon,
  PackageIcon,
  HelpCircleIcon,
  InfoOutlineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  DocumentsIcon,
  StarIcon,
  HeartIcon,
  ThListIcon,
  EditIcon,
  TagIcon,
  BookIcon,
  LockIcon,
  PinIcon,
  PresentationIcon,
  ThumbsUpIcon,
  ColorWheelIcon,
  RocketIcon,
  OlistIcon,
} from '@sanity/icons';
import StudioGuide from './components/StudioGuide';
import BusinessOverview from './components/BusinessOverview';
import BrandKit from './components/BrandKit';
import StudioPlaybook from './components/StudioPlaybook';

const SINGLETON_TYPES = [
  'siteSettings',
  'businessInfo',
  // Core pages
  'homePage',
  'aboutPage',
  'servicesPage',
  'processPage',
  'faqPage',
  'contactPage',
  'journalPage',
  'notFoundPage',
  'privacyPage',
  'studioGuide',
  'studioNotes',
  'studioPlaybook',
] as const;

const ORDERABLE_TYPES = [
  'service',
  'philosophyPoint',
  'processStep',
] as const;

const HIDDEN_FROM_DEFAULT = new Set<string>([
  ...SINGLETON_TYPES,
  ...ORDERABLE_TYPES,
  'announcement', // placed explicitly under Content → Announcements
  'testimonial',
  'faqItem',
  'faqCategory',
  'journalEntry',
  'journalCategory',
  'page', // custom pages, placed explicitly under "Pages"
  // sanity-plugin-media registers this tag type; keep it out of the desk root
  // (the "Media" tool in the top sidebar is where tags belong).
  'media.tag',
  // processStep is placed explicitly under Content → Process Steps
  'processStep',
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
  icon: any,
) {
  return S.listItem()
    .title(title)
    .icon(icon)
    .child(
      S.document()
        .schemaType(schemaType)
        .documentId(schemaType)
        .views([S.view.form()]),
    );
}

export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Studio Starter')
    .items([
      // Start Here — three-panel handbook for the editor. First item so it is always visible.
      // Panel 1: how the Studio works and step-by-step how-tos (static).
      // Panel 2: live business overview (services + site settings fetched from Sanity).
      // Panel 3: brand kit — colors + fonts for Canva (static).
      S.listItem()
        .title('Start Here')
        .icon(InfoOutlineIcon)
        .child(
          S.list()
            .title('Start Here')
            .items([
              S.listItem()
                .title('How the website works')
                .icon(PresentationIcon)
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
                .icon(ThumbsUpIcon)
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
                .icon(ColorWheelIcon)
                .child(S.component(BrandKit).title('Brand kit')),
              S.listItem()
                .title('Grow your studio')
                .icon(RocketIcon)
                .child(
                  S.document()
                    .schemaType('studioPlaybook')
                    .documentId('studioPlaybook')
                    .views([
                      S.view.component(StudioPlaybook).title('Guides'),
                      S.view.form().title('Edit'),
                    ]),
                ),
            ])
        ),

      S.divider(),

      // Site Settings — pinned singleton (no preview; not a page)
      singletonWithPreview(S, 'siteSettings', 'Site Settings', CogIcon),

      S.divider(),

      // Pages — every page singleton lives here.
      S.listItem()
        .title('Pages')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('Pages')
            .items([
              singletonWithPreview(S, 'homePage', 'Home', HomeIcon),
              singletonWithPreview(S, 'aboutPage', 'About', UserIcon),
              singletonWithPreview(S, 'servicesPage', 'Services', PackageIcon),
              singletonWithPreview(S, 'processPage', 'Process', OlistIcon),
              singletonWithPreview(S, 'faqPage', 'FAQ', HelpCircleIcon),
              singletonWithPreview(S, 'contactPage', 'Contact', EnvelopeIcon),
              singletonWithPreview(S, 'journalPage', 'Journal (index page)', BookIcon),
              singletonWithPreview(S, 'notFoundPage', '404 Page', DocumentTextIcon),

              S.divider(),

              singletonWithPreview(S, 'privacyPage', 'Privacy Policy Page', LockIcon),

              S.divider(),

              // Custom pages: editors build these themselves from the section library.
              // Multi-instance (not a singleton), so it is a normal document list.
              S.documentTypeListItem('page').title('Custom pages (build your own)').icon(DocumentsIcon),
            ]),
        ),

      S.divider(),

      // Content — reusable collections. Orderable types get drag-and-drop;
      // non-orderable use standard lists.
      S.listItem()
        .title('Content')
        .icon(ThListIcon)
        .child(
          S.list()
            .title('Content')
            .items([
              // Business info: service areas, travel fees, availability, geo.
              // Moved here from Site Settings so Settings is identity + infrastructure only.
              singletonWithPreview(S, 'businessInfo', 'Business info', PinIcon),

              S.divider(),

              orderableDocumentListDeskItem({
                type: 'service',
                title: 'Services',
                icon: PackageIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'philosophyPoint',
                title: 'Philosophy Values',
                icon: HeartIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'processStep',
                title: 'Process Steps',
                icon: OlistIcon,
                S,
                context,
              }),
              S.documentTypeListItem('testimonial').title('Testimonials').icon(StarIcon),
              S.documentTypeListItem('faqCategory').title('FAQ Categories').icon(TagIcon),
              S.documentTypeListItem('faqItem').title('FAQ Items').icon(HelpCircleIcon),

              S.divider(),

              // Announcement banners: queued notices that appear above the header.
              // Each one has a date window (startDate / endDate) and an on/off toggle.
              // The active announcement is picked at build time; a rebuild is required
              // for the banner to appear or disappear on the live site.
              S.documentTypeListItem('announcement').title('Announcements').icon(BellIcon),
            ]),
        ),

      S.divider(),

      // Journal — its own section so the editor can find posts + categories at a glance
      S.listItem()
        .title('Journal')
        .icon(BookIcon)
        .child(
          S.list()
            .title('Journal')
            .items([
              S.documentTypeListItem('journalEntry').title('Posts').icon(EditIcon),
              S.documentTypeListItem('journalCategory').title('Categories').icon(TagIcon),
            ]),
        ),

      // Safety net: surface any document type we have NOT explicitly placed above
      // (and keep the hidden set, including media.tag, out of the desk root).
      ...S.documentTypeListItems().filter((item) => !HIDDEN_FROM_DEFAULT.has(item.getId() as string)),
    ]);
