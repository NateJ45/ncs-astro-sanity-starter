// Registers every schema type with the Studio.
// Order doesn't affect runtime; alphabetical here for readability.

import { aboutPage } from './aboutPage';
import { businessInfo } from './businessInfo';
import { contactPage } from './contactPage';
import { ctaBlock } from './ctaBlock';
import { faqItem } from './faqItem';
import { faqPage } from './faqPage';
import { homePage } from './homePage';
import { journalCategory } from './journalCategory';
import { journalEntry } from './journalEntry';
import { journalPage } from './journalPage';
import { page } from './page';
import { pageSectionSchemas } from './sections';
import { notFoundPage } from './notFoundPage';
import { philosophyPoint } from './philosophyPoint';
import { privacyPage } from './privacyPage';
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
  // Page-builder section blocks (objects). Registered before the documents
  // whose pageBuilder arrays reference them.
  ...pageSectionSchemas,

  // Singletons
  siteSettings,
  businessInfo, // Content-side singleton: service areas, travel fees, availability, geo
  homePage,
  aboutPage,
  servicesPage,
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
  testimonial,
  faqItem,
  philosophyPoint,
  service,
  journalCategory,
  journalEntry,
  // Custom pages built from the section library (multi-instance, not a singleton)
  page,
];
