// Co-located query functions for the budget-calculator module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Budget Calculator module -----------------------------------------------

export async function getBudgetCalculator() {
  return sanityFetch(`*[_type == "budgetCalculator"][0]{
    seoTitle, seoDescription,
    heroEyebrow, heroHeadline, heroSubhead,
    heroScriptAccent,
    rooms[]{_key, label, baseMin, baseMax},
    scopes[]{_key, label, multiplier},
    addOns[]{_key, label, min, max},
    resultHeading, resultSubhead,
    emailCtaLabel, emailCtaHeading,
    ctaLabel, ctaHref
  }`, {}, null);
}
