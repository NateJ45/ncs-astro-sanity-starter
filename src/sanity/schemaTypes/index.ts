// Registers every schema type with the Studio.
// Order doesn't affect runtime; alphabetical here for readability.

import { aboutPage } from './aboutPage'; // scaffold: about
import { announcement } from './announcement';
import { popup } from './popup';
import { businessInfo } from './businessInfo';
import { contactPage } from './contactPage';
import { ctaBlock } from './ctaBlock';
import { faqCategory } from './faqCategory'; // scaffold: faq
import { faqItem } from './faqItem'; // scaffold: faq
import { faqPage } from './faqPage'; // scaffold: faq
import { formQuestion } from './formQuestion';
import { homePage } from './homePage';
import { journalCategory } from './journalCategory'; // scaffold: journal
import { journalEntry } from './journalEntry'; // scaffold: journal
import { journalPage } from './journalPage'; // scaffold: journal
import { navLink } from './navLink';
import { newsletter } from './newsletter';
import { page } from './page';
import { privatePage } from './privatePage';
import { pageSectionSchemas, syncedSection } from './sections';
import { richSectionSchemas } from './richSections';
import { notFoundPage } from './notFoundPage';
import { philosophyPoint } from './philosophyPoint'; // scaffold: philosophy
import { privacyPage } from './privacyPage';
import { processPage } from './processPage'; // scaffold: process
import { processStep } from './processStep'; // scaffold: process
import { redirect } from './redirect';
import { sectionPreset } from './sectionPreset';
import { shortLink } from './shortLink';
import { service } from './service'; // scaffold: services
import { servicesPage } from './servicesPage'; // scaffold: services
import { siteSettings } from './siteSettings';
import { studioGuide } from './studioGuide';
import { studioNotes } from './studioNotes';
import { testimonial } from './testimonial'; // scaffold: testimonials
import { libraryDocument } from './libraryDocument'; // scaffold: documents

export const schemaTypes = [
  // Object types (embedded) first so they're defined before docs that reference them
  ctaBlock,
  // Shared menu link (header menu, footer columns, small print, header button)
  navLink,
  // One editor-written form question (contactPage.formFields).
  formQuestion,
  // Page-builder section blocks (objects). Registered before the documents
  // whose pageBuilder arrays reference them.
  ...pageSectionSchemas,
  syncedSection, // authoring kit, card 109: shows a saved section, edit once everywhere
  ...richSectionSchemas,

  // Singletons
  siteSettings,
  businessInfo, // Content-side singleton: service areas, travel fees, availability, geo
  homePage,
  aboutPage, // scaffold: about
  servicesPage, // scaffold: services
  processPage, // scaffold: process
  faqPage, // scaffold: faq
  contactPage,
  journalPage, // scaffold: journal
  notFoundPage,
  privacyPage,
  // Start Here editable singletons
  studioGuide,
  studioNotes,

  // Reusable content collections
  announcement, // site-wide banner collection (enabled + date-windowed)
  popup, // popups (card 170): one at a time, date-windowed, src/lib/popup.ts
  testimonial, // scaffold: testimonials
  libraryDocument, // scaffold: documents
  faqCategory, // scaffold: faq
  faqItem, // scaffold: faq
  philosophyPoint, // scaffold: philosophy
  service, // scaffold: services
  processStep, // scaffold: process
  journalCategory, // scaffold: journal
  journalEntry, // scaffold: journal
  // One issue of the email newsletter (card 127); subscribers live in D1, never here.
  newsletter,
  // Custom pages built from the section library (multi-instance, not a singleton)
  page,
  // Pages only people with the password can see (card 122). Stored under the
  // privatePage. id path, which the public API never serves.
  privatePage,
  // One saved section, kept for reuse on other pages. Not content: nothing
  // about a preset reaches the live site until it is added to a page.
  sectionPreset,
  // Old address -> new address forwards, filed by hand or automatically on a
  // web-address change (see components/slugRedirect.tsx).
  redirect,
  // Short addresses like /spring for flyers and QR codes (PORTS.md card 171).
  shortLink,
];
