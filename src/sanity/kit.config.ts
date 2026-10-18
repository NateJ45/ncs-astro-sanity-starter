// Safe to edit by hand
// =============================================================================
// The Studio kit's settings for this site (PORTS.md card 106)
// =============================================================================
// The ONE site-specific file for the kit in src/sanity/kit/ (which is PORTABLE
// and names no site). Everything the editor reads in Home, the Checkup and the
// tour that is about THIS site lives here. NOT marked PORTABLE: every fork
// rewrites it. Detail: docs/agent/studio-kit.md.
//
// The starter's values are neutral defaults. A fork sets the site's name, the
// helper's name, its staff ids, its weekly jobs and any site rules.
//
// Repos are public: no email addresses or other private contacts here. The
// help address comes from PUBLIC_STUDIO_HELP_EMAIL at build time (unset means
// the Ask card shows its words without an email button).
// =============================================================================

import type { KitConfig } from './kit/types';
import { genericRules, unconfirmedRule } from '../lib/studio-checkup';
import { guides, GUIDE_CATEGORIES, GUIDES_FOR_TYPE } from './guides/content';
import { makeGuideView } from './components/GuideView';
import { envVal } from './urls';
import type { PageRules } from '../lib/page-guardrails';
import { AddDocumentIcon } from '@sanity/icons/AddDocument';
import { BellIcon } from '@sanity/icons/Bell';
import { EditIcon } from '@sanity/icons/Edit';
import { PinIcon } from '@sanity/icons/Pin';
import { runPageCheck } from './actions/checkPage';
import { PAGE_BUILDER_TYPES } from './pageBuilderConfig';

/**
 * Page types with a Google description (seoDescription). Not journalEntry: a
 * post's excerpt is its description when the SEO box is empty. Not
 * notFoundPage: search engines never list it.
 */
const SEO_TYPES = [
  'homePage',
  'aboutPage', // scaffold: about
  'servicesPage', // scaffold: services
  'processPage', // scaffold: process
  'faqPage', // scaffold: faq
  'contactPage',
  'journalPage', // scaffold: journal
  'privacyPage',
  'page',
];

export const kitConfig: KitConfig = {
  siteName: 'the website',

  helper: {
    name: 'your web designer',
    email: envVal('PUBLIC_STUDIO_HELP_EMAIL'),
  },

  // Sanity user ids of the people who get the staff view (sanity.io/manage,
  // Members). Ids, not emails: the repo is public. Until the list has an
  // entry, anyone who is not a Sanity administrator gets the staff view.
  staff: [],

  staffTools: ['home', 'structure', 'presentation', 'messages', 'site-guide', 'checkup'],
  toolOrder: ['home', 'structure', 'presentation', 'messages', 'site-guide', 'checkup', 'media'],
  toolTitles: { structure: 'Content', presentation: 'Live preview' },

  // Desk item ids only a developer needs (ids from src/sanity/structure.ts,
  // for example 'start-here' or 'content'). None by default.
  staffHiddenPanes: [],

  // Everyday lists whose Delete becomes "Move to Trash". Pages keep their own
  // Archive (pageActions.tsx); singletons cannot be deleted at all.
  trashTypes: {
    announcement: 'Announcement',
    testimonial: 'Testimonial', // scaffold: testimonials
    faqItem: 'Question and answer', // scaffold: faq
    faqCategory: 'Question group', // scaffold: faq
    journalEntry: 'Journal post', // scaffold: journal
    journalCategory: 'Journal category', // scaffold: journal
    service: 'Service', // scaffold: services
    philosophyPoint: 'Value', // scaffold: philosophy
    processStep: 'Process step', // scaffold: process
  },

  weekStartsOn: 1,
  // The site's recurring jobs, each ticked by a GROQ check (see the KitConfig
  // type in src/sanity/kit/types.ts). Empty hides Home's "This week" card.
  thisWeek: [],

  checkup: {
    rules: [
      ...genericRules({
        seoTypes: SEO_TYPES,
        altExemptFields: ['logo', 'favicon', 'icon', 'logoImage', 'seoImage'],
      }),
      // Flags text marked "to be confirmed" or "[confirm]" and unticked
      // `confirmed` boxes. Harmless when nothing carries them.
      unconfirmedRule(),
    ],
    ignoreTypes: ['sectionPreset', 'studioGuide', 'studioNotes', 'redirect'],
  },

  guide: {
    guides,
    categories: GUIDE_CATEGORIES,
    view: makeGuideView,
    // "Help for this page" (card 110): which guides each document type shows.
    forType: GUIDES_FOR_TYPE,
  },

  // Home's "Your pages" card (card 115): every page the editor can change, in
  // groups, each one click away. Links are StudioTargets (a document, a field
  // of one, a desk pane). `listType: 'page'` lists every custom page by name, so
  // a page built tomorrow shows up without touching this file. A fork regroups
  // these in its own words (a church: Main pages, Sermons and people, Settings).
  pages: [
    {
      title: 'Main pages',
      links: [
        { title: 'Home', target: { doc: 'homePage' } },
        { title: 'About', target: { doc: 'aboutPage' } }, // scaffold: about
        { title: 'Services', target: { doc: 'servicesPage' } }, // scaffold: services
        { title: 'Process', target: { doc: 'processPage' } }, // scaffold: process
        { title: 'Questions', target: { doc: 'faqPage' } }, // scaffold: faq
        { title: 'Journal (the list page)', target: { doc: 'journalPage' } }, // scaffold: journal
        { title: 'Contact', target: { doc: 'contactPage' } },
        { title: 'Privacy policy', target: { doc: 'privacyPage' } },
      ],
    },
    { title: 'Pages you built', listType: 'page' },
    {
      title: 'Lists',
      links: [
        { title: 'Announcements', target: { pane: 'content;announcement' } },
        { title: 'Journal posts', target: { pane: 'journal;journalEntry' } }, // scaffold: journal
        { title: 'Questions and answers', target: { pane: 'content;faqItem' } }, // scaffold: faq
        { title: 'Testimonials', target: { pane: 'content;testimonial' } }, // scaffold: testimonials
      ],
    },
    {
      title: 'Site-wide',
      links: [
        { title: 'Contact details and hours', target: { doc: 'businessInfo' } },
        { title: 'Menus', target: { doc: 'siteSettings', field: 'navItems' } },
        { title: 'Footer', target: { doc: 'siteSettings', field: 'footerColumns' } },
        { title: 'Site settings', target: { doc: 'siteSettings' } },
      ],
    },
  ],

  // Home's big buttons (card 110): this site's most common jobs, as intent
  // links. Keep it to four. A church might use "Add this week's sermon",
  // "Change service times", "Post an announcement", "Edit the homepage".
  quickActions: [
    {
      title: 'Edit the homepage',
      detail: 'Words, photos and sections.',
      target: { doc: 'homePage' },
      icon: EditIcon,
    },
    {
      title: 'Post an announcement',
      detail: 'The banner across the top of every page.',
      target: { create: 'announcement' },
      icon: BellIcon,
    },
    {
      title: 'Add a page',
      detail: 'A new page with its own address.',
      target: { create: 'page' },
      icon: AddDocumentIcon,
    },
    {
      title: 'Change contact details',
      detail: 'Phone, email, address and hours.',
      target: { doc: 'businessInfo' },
      icon: PinIcon,
    },
  ],

  // The page check inside "Help for this page" (card 110): the same three
  // checks as the "Check this page..." action, on the page-builder types.
  pageCheck: { types: [...PAGE_BUILDER_TYPES], run: (doc, client) => runPageCheck(client, doc) },

  tourSteps: [
    {
      title: 'This is Home',
      body: 'Home opens first every time. It shows what to do this week, whether your last change is on the website yet, and anything that needs fixing.',
    },
    {
      title: 'Content is where you edit',
      body: 'Click Content in the top bar to change the words and pictures on any page or add something new.',
    },
    {
      title: 'Live preview shows the real page',
      body: 'Live preview shows the website as visitors will see it, with your unpublished changes in place. Click any words on it to edit them right there.',
    },
    {
      title: 'Nothing is public until you press Publish',
      body: 'Your changes are private until you press the green Publish button. After that the website updates itself in a few minutes. Changed your mind? Use Undo, or move a thing to the Trash and bring it back later.',
    },
    {
      title: 'Help is always one click away',
      body: 'Site Guide in the top bar has step-by-step help for every job, and you can print any of it. Stuck? Home has a card for asking for help.',
    },
  ],

  liveSlowAfterMinutes: 15,

  features: {
    home: true,
    guide: true,
    checkup: true,
    tour: true,
    trash: true,
    publishNote: true,
    // The Visitors card (card 115) asks /api/studio/visitors/, which says "not
    // set up yet" until the Worker has CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID and
    // CF_WEB_ANALYTICS_SITE_TAG (OPERATIONS.md, "Visitor numbers").
    visitors: true,
    // Card 110: the status line under the top bar, and the help panel.
    navbarStatus: true,
    helpPanel: true,
  },
};

/**
 * The site's own page-builder rules (the authoring kit, PORTS.md card 109).
 * Each one shows as a yellow WARNING beside a page's sections, never an error,
 * so nothing here can stop Publish or break content that is already live. The
 * built-in warnings (empty sections, leftover template example text, a synced
 * section with nothing picked) apply everywhere whatever this says. Logic and
 * tests: src/lib/page-guardrails.ts.
 *
 * The starter's defaults suit a custom page: open with a hero, one hero only,
 * and a nudge past twenty sections. A fork tunes these, or empties them.
 */
export const pageRules: PageRules = {
  // Document types the rules below apply to ('page' is a Custom page). The
  // built-in pages often open with something else on purpose, so they are off.
  appliesTo: ['page'],
  mustStartWith: ['heroSection'],
  atMostOnce: ['heroSection'],
  maxSections: 20,
};
