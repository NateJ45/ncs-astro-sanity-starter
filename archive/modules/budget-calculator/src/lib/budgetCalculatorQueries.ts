// Co-located query functions for the budget-calculator module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Budget Calculator module -----------------------------------------------

export async function getBudgetCalculator() {
  return sanityFetch(`*[_type == "budgetCalculator"][0]{
    seoTitle, seoDescription,
    introEyebrow, introHeadline, introSubhead,
    heroScriptAccent,
    heroImage${IMAGE_PROJECTION},
    rooms[]{_key, label, baseLow, baseHigh},
    scopeOptions[]{_key, label, addLow, addHigh},
    addOns[]{_key, label, low, high},
    resultCopy, disclaimer,
    ctaLabel, consultPriceNote
  }`, {}, null);
}
