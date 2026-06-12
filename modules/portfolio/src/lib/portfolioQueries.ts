// Co-located query functions for the portfolio module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION, sectionsProjection } from '@/lib/queries';

// ---- Portfolio module -------------------------------------------------------

export async function getPortfolioPage() {
  return sanityFetch(`*[_type == "portfolioPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    ${sectionsProjection('additionalSections')}
  }`, {}, null);
}

export async function getProjectsWithBeforeAfter() {
  return sanityFetch(`*[_type == "project" && count(beforeAfters[defined(beforeImage.asset) && defined(afterImage.asset)]) > 0]
    | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
    _id, title, slug, location, roomType,
    "beforeAfters": beforeAfters[]{
      beforeImage${IMAGE_PROJECTION},
      afterImage${IMAGE_PROJECTION},
      caption
    }
  }`, {}, []);
}

export async function getProjectBySlug(slug: string) {
  return sanityFetch(
    `*[_type == "project" && slug.current == $slug][0]{
      _id, title, slug, location, year, roomType, designStyle,
      briefSummary, briefLine, designCall,
      metaTitle, metaDescription,
      stickyCtaLabel,
      heroImage${IMAGE_PROJECTION},
      gallery[]${IMAGE_PROJECTION},
      beforeAfters[]{
        beforeImage${IMAGE_PROJECTION},
        afterImage${IMAGE_PROJECTION},
        caption
      },
      introStory[]{
        ...,
        _type == "image" => ${IMAGE_PROJECTION}
      },
      "servicesUsed": servicesUsed[]->{ _id, name, slug },
      "relatedTestimonial": relatedTestimonial->{ quote, attribution },
      "relatedJournalEntries": *[_type == "journalEntry" && references(^._id)] | order(publishedAt desc)[0..2]{
        _id, title, slug, excerpt, publishedAt, coverImage${IMAGE_PROJECTION},
        "categories": categories[]->{ _id, title, slug }
      }
    }`,
    { slug },
    null,
  );
}
