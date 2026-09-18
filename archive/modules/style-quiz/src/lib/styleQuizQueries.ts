// Co-located query functions for the style-quiz module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Style Quiz module ------------------------------------------------------

export async function getStyleQuiz() {
  return sanityFetch(`*[_type == "styleQuiz"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    introEyebrow, introHeadline, introSubhead,
    introImage${IMAGE_PROJECTION},
    questions[]{
      _key, prompt, helpText,
      answers[]{
        _key, label,
        image${IMAGE_PROJECTION},
        archetypeWeights[]{_key, archetypeSlug, weight}
      }
    },
    qualifiers[]{
      _key, prompt, type,
      options[]{_key, label, value}
    },
    archetypes[]{
      _key, name,
      "slug": slug.current,
      description,
      images[]${IMAGE_PROJECTION},
      recommendedServiceRef->{ _id, name, "slug": slug.current },
      resultCtaLabel
    },
    gate{ mode, heading, blurb, consentNote, espTag },
    routing{ highIntentRule, bookCtaLabel, guideCtaLabel, guideRef->{ "slug": slug.current } }
  }`, {}, null);
}
