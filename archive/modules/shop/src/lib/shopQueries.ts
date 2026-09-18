// Co-located query functions for the shop module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Shop module -------------------------------------------------------------

export async function getShopPage() {
  return sanityFetch(`*[_type == "shopPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    enabled,
    disclosure,
    intro,
    "collections": collections[]->{
      _id, title, blurb,
      "items": *[_type == "shopItem" && collection._ref == ^._id] | order(orderRank asc){
        _id, title, vendor, note, affiliateUrl,
        image${IMAGE_PROJECTION}
      }
    }
  }`, {}, null);
}
