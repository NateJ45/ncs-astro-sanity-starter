// Co-located query functions for the e-design module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION, CTA_PROJECTION } from '@/lib/queries';

// ---- E-Design module ---------------------------------------------------------

export async function getEDesignPage() {
  return sanityFetch(`*[_type == "eDesignPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    howItWorks[]{_key, stepNumber, title, body},
    whatsIncluded,
    tiers[]{_key, name, price, priceNumeric, features, bestFor, ctaLabel},
    faqRefs[]->{_id, question, answer, category},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`, {}, null);
}
