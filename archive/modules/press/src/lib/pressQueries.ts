// Co-located query functions for the press module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.
//
// NOTE: getPressItems is already in the core starter (src/lib/queries.ts) --
// do NOT copy it here. The press page imports getPressPage from
// @/lib/pressQueries and getPressItems from @/lib/queries (two separate imports).

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Press module (page singleton) ------------------------------------------

export async function getPressPage() {
  return sanityFetch(`*[_type == "pressPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro
  }`, {}, null);
}
