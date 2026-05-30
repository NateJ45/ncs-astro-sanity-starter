// Registers every schema type with the Studio.
// Order doesn't affect runtime; alphabetical here for readability.

import { aboutPage } from './aboutPage';
import { budgetCalculator } from './budgetCalculator';
import { contactPage } from './contactPage';
import { ctaBlock } from './ctaBlock';
import { eDesignPage } from './eDesignPage';
import { faqItem } from './faqItem';
import { faqPage } from './faqPage';
import { giftPage } from './giftPage';
import { homePage } from './homePage';
import { journalCategory } from './journalCategory';
import { journalEntry } from './journalEntry';
import { journalPage } from './journalPage';
import { leadMagnet } from './leadMagnet';
import { notFoundPage } from './notFoundPage';
import { philosophyPoint } from './philosophyPoint';
import { portfolioPage } from './portfolioPage';
import { pressItem } from './pressItem';
import { pressPage } from './pressPage';
import { privacyPage } from './privacyPage';
import { processPage } from './processPage';
import { processStep } from './processStep';
import { project } from './project';
import { resourcesPage } from './resourcesPage';
import { service } from './service';
import { servicesPage } from './servicesPage';
import { shopCollection } from './shopCollection';
import { shopItem } from './shopItem';
import { shopPage } from './shopPage';
import { siteSettings } from './siteSettings';
import { studioGuide } from './studioGuide';
import { studioNotes } from './studioNotes';
import { studioPlaybook } from './studioPlaybook';
import { styleQuiz } from './styleQuiz';
import { testimonial } from './testimonial';

export const schemaTypes = [
  // Object types (embedded) first so they're defined before docs that reference them
  ctaBlock,

  // Singletons
  siteSettings,
  homePage,
  aboutPage,
  processPage,
  servicesPage,
  portfolioPage,
  faqPage,
  contactPage,
  journalPage,
  notFoundPage,
  // New singletons (Phase 1)
  eDesignPage,
  shopPage,
  giftPage,
  resourcesPage,
  privacyPage,
  pressPage,
  styleQuiz,
  budgetCalculator,
  // Start Here editable singletons
  studioGuide,
  studioNotes,
  studioPlaybook,

  // Reusable content collections
  testimonial,
  faqItem,
  philosophyPoint,
  service,
  processStep,
  project,
  journalCategory,
  journalEntry,
  // New collections (Phase 1)
  leadMagnet,
  pressItem,
  shopCollection,
  shopItem,
];
