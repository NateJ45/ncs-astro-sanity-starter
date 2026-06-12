// Co-located query functions for the style-quiz module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Style Quiz module ------------------------------------------------------

export async function getStyleQuiz() {
  return sanityFetch(`*[_type == "styleQuiz"][0]{
    seoTitle, seoDescription,
    heroEyebrow, heroHeadline, heroSubhead,
    heroScriptAccent,
    questions[]{
      _key, question, answers[]{_key, label, value, image${IMAGE_PROJECTION}}
    },
    qualifierQuestions[]{
      _key, question, field, answers[]{_key, label, value}
    },
    archetypes[]{
      _key, id, name, description,
      images[]${IMAGE_PROJECTION},
      ctaLabel, ctaHref,
      secondaryCtaLabel, secondaryCtaHref
    },
    emailGateMode,
    emailGateHeading, emailGateBlurb, emailGateButtonLabel,
    emailGateSkipLabel
  }`, {}, null);
}
