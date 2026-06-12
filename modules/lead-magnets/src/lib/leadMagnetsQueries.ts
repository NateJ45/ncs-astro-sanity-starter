// Co-located query functions for the lead-magnets module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Lead Magnets module -----------------------------------------------------

export async function getLeadMagnets() {
  return sanityFetch(`*[_type == "leadMagnet" && published == true] | order(orderRank asc){
    _id, title, "slug": slug.current, summary,
    coverImage${IMAGE_PROJECTION}
  }`, {}, []);
}

export async function getLeadMagnet(slug: string) {
  return sanityFetch(
    `*[_type == "leadMagnet" && slug.current == $slug][0]{
      _id, title, slug, summary,
      seoTitle, seoDescription,
      coverImage${IMAGE_PROJECTION},
      file{ asset->{ url } },
      gateHeading, gateBlurb, buttonLabel, successMessage, espTag
    }`,
    { slug },
    null,
  );
}

export async function getAllLeadMagnetSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await sanityFetch(
    `*[_type == "leadMagnet" && published == true && defined(slug.current)]{ slug }`,
    {},
    [],
  );
  return list.map((m) => m.slug?.current).filter(Boolean);
}
