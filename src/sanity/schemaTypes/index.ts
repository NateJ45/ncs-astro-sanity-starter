// Registers every schema type with the Studio.
// Order doesn't affect runtime; alphabetical here for readability.

import { aboutPage } from './aboutPage';
import { announcement } from './announcement';
import { businessInfo } from './businessInfo';
import { contactPage } from './contactPage';
import { ctaBlock } from './ctaBlock';
import { faqCategory } from './faqCategory';
import { faqItem } from './faqItem';
import { faqPage } from './faqPage';
import { formQuestion } from './formQuestion';
import { homePage } from './homePage';
import { journalCategory } from './journalCategory';
import { journalEntry } from './journalEntry';
import { journalPage } from './journalPage';
import { navLink } from './navLink';
import { page } from './page';
import { pageSectionSchemas } from './sections';
import { richSectionSchemas } from './richSections';
import { notFoundPage } from './notFoundPage';
import { philosophyPoint } from './philosophyPoint';
import { privacyPage } from './privacyPage';
import { processPage } from './processPage';
import { processStep } from './processStep';
import { redirect } from './redirect';
import { service } from './service';
import { servicesPage } from './servicesPage';
import { siteSettings } from './siteSettings';
import { studioGuide } from './studioGuide';
import { studioNotes } from './studioNotes';
import { studioPlaybook } from './studioPlaybook';
import { testimonial } from './testimonial';

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
  ...richSectionSchemas,

  // Singletons
  siteSettings,
  businessInfo, // Content-side singleton: service areas, travel fees, availability, geo
  homePage,
  aboutPage,
  servicesPage,
  processPage,
  faqPage,
  contactPage,
  journalPage,
  notFoundPage,
  privacyPage,
  // Start Here editable singletons
  studioGuide,
  studioNotes,
  studioPlaybook,

  // Reusable content collections
  announcement, // site-wide banner collection (enabled + date-windowed)
  testimonial,
  faqCategory,
  faqItem,
  philosophyPoint,
  service,
  processStep,
  journalCategory,
  journalEntry,
  // Custom pages built from the section library (multi-instance, not a singleton)
  page,
  // Old address -> new address forwards, filed by hand or automatically on a
  // web-address change (see components/slugRedirect.tsx).
  redirect,
];
