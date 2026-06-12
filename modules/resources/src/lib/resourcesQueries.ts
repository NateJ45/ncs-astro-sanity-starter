// Co-located query functions for the resources module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Resources module --------------------------------------------------------

export async function getResourcesPage() {
  return sanityFetch(`*[_type == "resourcesPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    cards[]{
      title, blurb, link,
      icon${IMAGE_PROJECTION}
    }
  }`, {}, null);
}
