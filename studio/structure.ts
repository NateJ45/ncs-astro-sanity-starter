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
// Preview pane: singletons explicitly attach a form + preview iframe view via the
// singletonWithPreview helper. Other types pick up preview from defaultDocumentNode
// in sanity.config.ts.

import type { StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import { Iframe, urlForDoc } from './sanity.config';
import {
  CogIcon,
  HomeIcon,
  UserIcon,
  PackageIcon,
  HelpCircleIcon,
  InfoOutlineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  StarIcon,
  HeartIcon,
  ThListIcon,
  EditIcon,
  TagIcon,
  BookIcon,
  LockIcon,
  PresentationIcon,
  ThumbsUpIcon,
  ColorWheelIcon,
  RocketIcon,
} from '@sanity/icons';
import StudioGuide from './components/StudioGuide';
import BusinessOverview from './components/BusinessOverview';
import BrandKit from './components/BrandKit';
import StudioPlaybook from './components/StudioPlaybook';

const SINGLETON_TYPES = [
  'siteSettings',
  // Core pages
  'homePage',
  'aboutPage',
  'servicesPage',
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
] as const;

const HIDDEN_FROM_DEFAULT = new Set<string>([
  ...SINGLETON_TYPES,
  ...ORDERABLE_TYPES,
  'testimonial',
  'faqItem',
  'journalEntry',
  'journalCategory',
  // sanity-plugin-media registers this tag type; keep it out of the desk root
  // (the "Media" tool in the top sidebar is where tags belong).
  'media.tag',
]);

/**
 * Build a singleton list item whose editor pane includes both the form view
 * and an iframe preview view (when the doc type has a viewable page).
 *
 * S.editor() and S.document().views([S.view.form()]) both pre-set views and
 * thereby bypass the defaultDocumentNode in sanity.config.ts. So we attach
 * views explicitly here for the singletons that need them.
 */
function singletonWithPreview(
  S: StructureBuilder,
  schemaType: string,
  title: string,
  icon: any,
) {
  const hasPreview = urlForDoc(schemaType, {}) !== null;
  const views = [
    S.view.form(),
    ...(hasPreview
      ? [
          S.view
            .component(Iframe)
            .options({
              url: (doc: any) => urlForDoc(schemaType, doc) ?? '',
              reload: { button: true },
              defaultSize: 'desktop',
            })
            .title('Preview'),
        ]
      : []),
  ];

  return S.listItem()
    .title(title)
    .icon(icon)
    .child(
      S.document()
        .schemaType(schemaType)
        .documentId(schemaType)
        .views(views),
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
              singletonWithPreview(S, 'faqPage', 'FAQ', HelpCircleIcon),
              singletonWithPreview(S, 'contactPage', 'Contact', EnvelopeIcon),
              singletonWithPreview(S, 'journalPage', 'Journal (index page)', BookIcon),
              singletonWithPreview(S, 'notFoundPage', '404 Page', DocumentTextIcon),

              S.divider(),

              singletonWithPreview(S, 'privacyPage', 'Privacy Policy Page', LockIcon),
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
              S.documentTypeListItem('testimonial').title('Testimonials').icon(StarIcon),
              S.documentTypeListItem('faqItem').title('FAQ Items').icon(HelpCircleIcon),
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
