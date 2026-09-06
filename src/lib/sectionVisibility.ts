// Safe to edit by hand
// Normalizes the sectionVisibility object from siteSettings into a flat set of
// booleans. Two rules, one per kind of route: a CORE route (journal) is visible
// unless an editor sets its toggle to false, and a MODULE route is hidden
// unless an editor sets its toggle to true. See the doc comment on
// getSectionVisibility below for why they differ.
//
// Usage:
//   import { getSectionVisibility } from '@/lib/sectionVisibility';
//   const visible = getSectionVisibility(siteSettings?.sectionVisibility);
//   if (!visible.portfolio) return Astro.redirect('/');

/** The raw sectionVisibility object as fetched from Sanity. */
interface RawSectionVisibility {
  showPortfolio?: boolean | null;
  showJournal?: boolean | null;
  showShop?: boolean | null;
  showEDesign?: boolean | null;
  showGiftCertificates?: boolean | null;
  showPress?: boolean | null;
  showResources?: boolean | null;
  showGuides?: boolean | null;
  showStyleQuiz?: boolean | null;
  showBudgetCalculator?: boolean | null;
}

/** Normalized visibility map — all values are plain booleans. */
export interface SectionVisibility {
  portfolio: boolean;
  journal: boolean;
  shop: boolean;
  eDesign: boolean;
  giftCertificates: boolean;
  press: boolean;
  resources: boolean;
  guides: boolean;
  styleQuiz: boolean;
  budgetCalculator: boolean;
}

/**
 * Convert the raw Sanity sectionVisibility object into a normalized map.
 * Pass `siteSettings?.sectionVisibility` directly.
 *
 * TWO DEFAULTS, because this starter has two kinds of route.
 *
 * CORE routes ship in src/pages and always build, so they follow the original
 * rule: `value !== false` means visible, and only an explicit `false` hides
 * one. The live site is unaffected until an editor turns something off.
 *
 * MODULE routes come from the staged `modules/` folder and are OFF by default
 * (CLAUDE.md, "Routes summary"). A fresh clone builds none of them, so `unset`
 * has to mean HIDDEN there: `value === true` is what turns one on. Under the
 * old single rule the footer and the nav rendered a link to all nine of them
 * on a fresh clone, and `npm run check:links` found 135 broken internal links
 * across ten pages the first time it ran here (2026-09-06). Turning a module
 * on is a two-part act anyway, copy the folder into src/ AND flip the toggle;
 * this makes the toggle mean the same thing the folder does.
 */
export function getSectionVisibility(raw?: RawSectionVisibility | null): SectionVisibility {
  return {
    // Core route: on unless switched off.
    journal: raw?.showJournal !== false,
    // Module routes: off unless switched on.
    portfolio: raw?.showPortfolio === true,
    shop: raw?.showShop === true,
    eDesign: raw?.showEDesign === true,
    giftCertificates: raw?.showGiftCertificates === true,
    press: raw?.showPress === true,
    resources: raw?.showResources === true,
    guides: raw?.showGuides === true,
    styleQuiz: raw?.showStyleQuiz === true,
    budgetCalculator: raw?.showBudgetCalculator === true,
  };
}
