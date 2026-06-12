// Co-located query functions for the gift-certificates module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Gift Certificates module ------------------------------------------------

export async function getGiftPage() {
  return sanityFetch(`*[_type == "giftPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    options[]{_key, label, amount, blurb},
    howItWorks[]{_key, stepNumber, title, body},
    finePrint,
    ctaLabel
  }`, {}, null);
}
