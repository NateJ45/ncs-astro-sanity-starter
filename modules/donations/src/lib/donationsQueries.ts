// Co-located query functions for the donations module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Donations module --------------------------------------------------------

export async function getDonationsPage() {
  return sanityFetch(`*[_type == "donationsPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    mission,
    impactStats[]{_key, value, label},
    donateUrl,
    donateCtaLabel,
    faqRefs[]->{_id, question, answer, category},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaButtonLabel
  }`, {}, null);
}
