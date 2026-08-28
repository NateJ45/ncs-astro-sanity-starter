// =============================================================================
// pageBuilderConfig - what this repo's pages are shaped like
// =============================================================================
// Three canonical Studio files need to know where a page keeps its sections and
// which addresses the site code owns: the "Check this page" action, the "Save a
// section as preset" action, and the Saved-sections panel in the navigator.
// Those files are byte-identical across every repo in the family, so the
// repo-specific answers arrive from HERE, at a path every repo shares.
//
// NOT canonical on purpose. Editing this file is how a fork adapts the feature;
// editing the canonical files is drift.
// =============================================================================

import type { PageCheckConfig } from '../lib/page-checks';
import { RESERVED_SLUGS } from '../lib/reservedSlugs';

/**
 * Every document type that carries a page-builder array, and the field a new
 * section is appended to. The "Save a section as preset" action is offered on
 * these types, and the navigator adds a saved section to whichever of them the
 * preview is showing.
 *
 * The page singletons all use `pageBuilder`. `additionalSections` is an append
 * zone some pages carry as well; it is read by the checks (see below) but is
 * never the target of an "add this here", because the main builder is.
 */
export const SECTION_HOST_TYPES: Readonly<Record<string, string>> = {
  page: 'pageBuilder',
  homePage: 'pageBuilder',
  aboutPage: 'pageBuilder',
  servicesPage: 'pageBuilder',
  processPage: 'pageBuilder',
};

/** The same list as a set, for the document-actions resolver. */
export const PAGE_BUILDER_TYPES = new Set<string>(Object.keys(SECTION_HOST_TYPES));

/**
 * Sections that fill THEMSELVES from a collection or from Business info. A
 * services grid with no headline is not an empty section: its words are the
 * Services list. `spacerSection` is here because it is deliberately wordless.
 *
 * Keep roughly in step with src/sanity/schemaTypes/sections.ts and
 * richSections.ts. A name that drifts off the list only costs a false "worth a
 * look", never a wrong page.
 */
const SELF_FILLING_SECTIONS = [
  'dynamicListSection',
  'faqSection',
  'guaranteeSection',
  'logoStripSection',
  'processSection',
  'serviceAreaSection',
  'servicesGridSection',
  'spacerSection',
  'testimonialsSection',
  'valuesSection',
];

export const PAGE_CHECK_CONFIG: PageCheckConfig = {
  // Both builder arrays, in the order they render. A page singleton that has
  // only one of them simply contributes the one.
  sectionArrays: ['pageBuilder', 'additionalSections'],
  // Pages here open with a `heroSection` inside the builder rather than a
  // separate hero object, so there is no header unit to walk.
  selfFillingSections: SELF_FILLING_SECTIONS,
  // Keys that hold a SETTING rather than words, on top of the built-in
  // SETTING_KEYS list in src/lib/page-checks.ts. Each arrives with an
  // initialValue, so a completely empty section already carries it: counted as
  // content, the "nothing typed here" check would go permanently silent.
  // `columns` and `width` are already built in; these two are not.
  extraSettingKeys: ['imageSide', 'surface'],
  // Every built-in route, plus the folders the build writes into. RESERVED_SLUGS
  // is the same list the slug validation uses, so a new route is added once.
  codeOwnedPaths: [...RESERVED_SLUGS, 'api', 'preview', 'studio', 'robots.txt'],
};
