// Studio Desk structure. Pins Site Settings at the top, then ALL page singletons
// (one document each) under "Pages", then the reusable content collections under
// "Content", then "Journal". Every document type is placed explicitly so nothing
// floats loose at the desk root. The trailing default-list filter is a safety net
// for any future type that hasn't been placed (and hides sanity-plugin-media's
// media.tag type, which would otherwise show at the root).
//
// "Pages" is one list (so the rule for Staci is simple: every page lives here),
// visually grouped with dividers: core pages, then offerings, then resources +
// interactive tools, then the remaining pages.
//
// Orderable lists: service / processStep / philosophyPoint / project / leadMagnet /
// shopCollection / shopItem / pressItem use the orderable-document-list plugin.
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
  TrendUpwardIcon,
  PackageIcon,
  HelpCircleIcon,
  InfoOutlineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  StarIcon,
  HeartIcon,
  ImagesIcon,
  ThListIcon,
  EditIcon,
  TagIcon,
  BookIcon,
  DesktopIcon,
  BasketIcon,
  CreditCardIcon,
  BillIcon,
  BulbOutlineIcon,
  SearchIcon,
  LockIcon,
  CaseIcon,
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
  'processPage',
  'servicesPage',
  'portfolioPage',
  'faqPage',
  'contactPage',
  'journalPage',
  'notFoundPage',
  // Conversion-build page singletons
  'eDesignPage',
  'shopPage',
  'giftPage',
  'resourcesPage',
  'pressPage',
  'privacyPage',
  'styleQuiz',
  'budgetCalculator',
  'studioGuide',
  'studioNotes',
  'studioPlaybook',
] as const;

const ORDERABLE_TYPES = [
  'service',
  'processStep',
  'philosophyPoint',
  'project',
  // Conversion-build collections (all carry orderRankField)
  'leadMagnet',
  'shopCollection',
  'shopItem',
  'pressItem',
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
    .title('Reid Design')
    .items([
      // Start Here — three-panel handbook for Staci. First item so it is always visible.
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

      // Pages — every page singleton lives here, grouped with dividers so the
      // list stays scannable: core pages, offerings, resources + tools, other.
      S.listItem()
        .title('Pages')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('Pages')
            .items([
              // Core pages
              singletonWithPreview(S, 'homePage', 'Home', HomeIcon),
              singletonWithPreview(S, 'aboutPage', 'About', UserIcon),
              singletonWithPreview(S, 'processPage', 'Process', TrendUpwardIcon),
              singletonWithPreview(S, 'servicesPage', 'Services', PackageIcon),
              singletonWithPreview(S, 'portfolioPage', 'Portfolio (index page)', ImagesIcon),
              singletonWithPreview(S, 'faqPage', 'FAQ', HelpCircleIcon),
              singletonWithPreview(S, 'contactPage', 'Contact', EnvelopeIcon),
              singletonWithPreview(S, 'journalPage', 'Journal (index page)', BookIcon),
              singletonWithPreview(S, 'notFoundPage', '404 Page', DocumentTextIcon),

              S.divider(),

              // Offerings
              singletonWithPreview(S, 'eDesignPage', 'E-Design Page', DesktopIcon),
              singletonWithPreview(S, 'shopPage', 'Shop Page', BasketIcon),
              singletonWithPreview(S, 'giftPage', 'Gift Certificates Page', CreditCardIcon),

              S.divider(),

              // Resources + interactive tools
              singletonWithPreview(S, 'resourcesPage', 'Resources Page', BulbOutlineIcon),
              singletonWithPreview(S, 'styleQuiz', 'Style Quiz', SearchIcon),
              singletonWithPreview(S, 'budgetCalculator', 'Budget Calculator', BillIcon),

              S.divider(),

              // Other
              singletonWithPreview(S, 'pressPage', 'Press Page', CaseIcon),
              singletonWithPreview(S, 'privacyPage', 'Privacy Policy Page', LockIcon),
            ]),
        ),

      S.divider(),

      // Content — reusable collections. Orderable types get drag-and-drop;
      // non-orderable use standard lists. Divider splits the original
      // page-building content from the conversion-build collections.
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
                type: 'processStep',
                title: 'Process Steps',
                icon: TrendUpwardIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'project',
                title: 'Projects',
                icon: ImagesIcon,
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

              S.divider(),

              orderableDocumentListDeskItem({
                type: 'leadMagnet',
                title: 'Guides (lead magnets)',
                icon: BookIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'shopCollection',
                title: 'Shop Collections',
                icon: ThListIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'shopItem',
                title: 'Shop Items',
                icon: BasketIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'pressItem',
                title: 'Press Items',
                icon: CaseIcon,
                S,
                context,
              }),
            ]),
        ),

      S.divider(),

      // Journal — its own section so Staci can find posts + categories at a glance
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
