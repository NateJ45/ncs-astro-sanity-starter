// Co-located query functions for the team module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Team module -------------------------------------------------------------

export async function getTeamPage() {
  return sanityFetch(`*[_type == "teamPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro
  }`, {}, null);
}

export async function getTeamMembers() {
  return sanityFetch(`*[_type == "teamMember"] | order(displayOrder asc, name asc){
    _id, name, role,
    headshot${IMAGE_PROJECTION},
    bio,
    email,
    socialLinks[]{_key, label, url},
    displayOrder
  }`, {}, []);
}
