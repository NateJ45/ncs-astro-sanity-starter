// Safe to edit by hand
// =============================================================================
// pageBuilderAuthoring - what every page-builder field gets from the kit
// =============================================================================
// The authoring kit (PORTS.md card 109) in one object, spread into each
// `pageBuilder` field definition (page.ts, _pageSingleton.ts and the page
// singletons that define their own):
//
//   defineField({ name: 'pageBuilder', type: 'array', ..., ...pageBuilderAuthoring })
//
//   - the input: Sanity's own list plus "Insert a saved section"
//     (components/PageBuilderInput.tsx);
//   - the guardrails: gentle WARNINGS for empty sections, leftover example
//     text, synced sections with nothing picked, and the site's own rules from
//     `pageRules` in kit.config.ts (src/lib/page-guardrails.ts). Warnings never
//     block Publish, so content that was valid before the kit stays publishable.
// =============================================================================

import type { ArrayRule, ValidationError } from 'sanity';
import { PageBuilderInput } from './components/PageBuilderInput';
import { pageWarnings } from '../lib/page-guardrails';
import { PAGE_CHECK_CONFIG } from './pageBuilderConfig';
import { pageRules } from './kit.config';

export const pageBuilderAuthoring = {
  components: { input: PageBuilderInput },
  validation: (Rule: ArrayRule<unknown[]>) =>
    Rule.custom((value, context) => {
      const warnings = pageWarnings(value, context.document?._type, pageRules, PAGE_CHECK_CONFIG);
      if (warnings.length === 0) return true;
      return warnings.map((w): ValidationError => ({ message: w.message, path: w.path }));
    }).warning(),
};
