// Targeted cleanup for the two editor-meta annotations that the
// strip-editor-annotations.mjs dry-run surfaced. We don't run the generic
// strip directly because one of the matches (faqItem.background) is
// ENTIRELY annotation text — blanket stripping would leave the FAQ answer
// empty, which is worse than leaving the editor note visible. Instead:
//
//   1. servicesPage.builderRealtorSection.description.0.children.0.text
//      — strip the leading "[NEW per audit, softer framing] " prefix only.
//   2. faqItem.background.answer
//      — replace the placeholder with a brand-voice "still in progress"
//        line that keeps the FAQ live until Staci writes the real copy.
//
// Idempotent: re-running matches nothing on the second pass.
//
// Run with: node scripts/patch-editor-annotation-cleanups.mjs

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const writeToken = (process.env.SANITY_API_WRITE_TOKEN ?? '').trim();

if (!projectId || !writeToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token: writeToken,
});

// ---- 1. servicesPage prefix strip --------------------------------------

const services = await client.fetch(
  `*[_id == "servicesPage"][0]{
    _id, _rev, builderRealtorSection
  }`,
);

if (services?.builderRealtorSection?.description) {
  const desc = services.builderRealtorSection.description;
  const next = desc.map((block) => {
    if (block?._type !== 'block' || !Array.isArray(block.children)) return block;
    const nextChildren = block.children.map((child) => {
      if (typeof child?.text !== 'string') return child;
      // Strip the bracketed prefix and any spaces that follow it.
      const cleaned = child.text.replace(
        /^\s*\[NEW[^\]]*\]\s*/,
        '',
      );
      return cleaned !== child.text ? { ...child, text: cleaned } : child;
    });
    return { ...block, children: nextChildren };
  });
  const changed = JSON.stringify(next) !== JSON.stringify(desc);
  if (changed) {
    try {
      await client
        .patch(services._id)
        .set({ 'builderRealtorSection.description': next })
        .commit();
      console.log('✓ servicesPage: stripped "[NEW per audit, softer framing]" prefix from builderRealtorSection.description');
    } catch (err) {
      console.error('✗ servicesPage patch failed:', err.message);
    }
  } else {
    console.log('= servicesPage: nothing to strip');
  }
}

// ---- 2. faqItem.background replacement ---------------------------------

const faq = await client.fetch(
  `*[_id == "faqItem.background"][0]{ _id, _rev, answer }`,
);

if (faq) {
  const isTodoOnly =
    Array.isArray(faq.answer) &&
    faq.answer.length === 1 &&
    faq.answer[0]?.children?.[0]?.text?.startsWith('[TODO');

  if (isTodoOnly) {
    // Brand-voice placeholder. Stops short of fabricating credentials —
    // says "in progress, ask if it matters" so Staci can write the real
    // answer when she's ready, and the FAQ doesn't show TODO copy in the
    // meantime.
    const newAnswer = [
      {
        _key: faq.answer[0]?._key ?? 'replacedBackground01',
        _type: 'block',
        style: 'normal',
        children: [
          {
            _key: faq.answer[0]?.children?.[0]?._key ?? 'replacedBackground01s',
            _type: 'span',
            marks: [],
            text:
              "Staci is still updating this one. The short version: she's a Plainfield-based interior designer running Reid Design as a one-person studio. If background matters for your project, ask in the contact form and she'll get into it personally.",
          },
        ],
        markDefs: [],
      },
    ];
    try {
      await client.patch(faq._id).set({ answer: newAnswer }).commit();
      console.log('✓ faqItem.background: replaced [TODO …] placeholder with a brand-voice "in progress" answer');
    } catch (err) {
      console.error('✗ faqItem.background patch failed:', err.message);
    }
  } else {
    console.log('= faqItem.background: already updated, nothing to do');
  }
}

console.log('\nDone.');
