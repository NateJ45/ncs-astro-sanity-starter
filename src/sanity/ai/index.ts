// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// ncsWritingHelp(): writing suggestions in the Studio (PORTS.md card 122)
// =============================================================================
// Adds a "Suggest" button under the Google description, photo description and
// summary fields, and "Improve this paragraph" in rich text. The words come
// from /api/studio/ai/ (src/pages/api/studio/ai.ts), which asks the Claude API
// in the site's own voice. Nothing is written until the editor presses "Use
// this", and nothing is ever published by it. Without the ANTHROPIC_API_KEY
// secret on the Worker the buttons simply do not appear.
//
// Register it in sanity.config.ts's plugins. Field names can be changed per
// site: ncsWritingHelp({ fields: { summary: ['excerpt', 'teaser'] } }).
// Detail: docs/agent/studio-kit.md, "Writing help".
// =============================================================================

import { definePlugin } from 'sanity';
import {
  DEFAULT_WRITING_HELP,
  makeWritingHelpBlock,
  makeWritingHelpInput,
  type WritingHelpOptions,
} from './WritingHelp';

export interface WritingHelpConfig {
  fields?: Partial<WritingHelpOptions['fields']>;
  paragraphs?: boolean;
}

export const ncsWritingHelp = definePlugin<WritingHelpConfig | void>((config) => {
  const options: WritingHelpOptions = {
    fields: { ...DEFAULT_WRITING_HELP.fields, ...(config?.fields ?? {}) },
    paragraphs: config?.paragraphs ?? DEFAULT_WRITING_HELP.paragraphs,
  };
  return {
    name: 'ncs-writing-help',
    form: {
      components: {
        input: makeWritingHelpInput(options),
        ...(options.paragraphs ? { block: makeWritingHelpBlock() } : {}),
      },
    },
  };
});
