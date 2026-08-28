// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// publishAt - "Publish automatically at", the free-tier scheduled publish
// =============================================================================
// Sanity's own Scheduled Drafts is a Growth-plan feature. Every site in this
// family runs on the free plan, so scheduling is built here instead, out of two
// small parts that cost nothing:
//
//   1. This field. An editor sets a date and time and LEAVES THE PAGE AS A
//      DRAFT. Nothing else about the document changes.
//   2. scripts/publish-due.mjs, run every half hour by
//      .github/workflows/publish-due.yml. It finds drafts whose publishAt has
//      passed, publishes them, and clears the field so they never republish.
//
// The half-hour cron is the honest granularity, and the field description says
// so. "Publishes itself within the half hour" is a promise the schedule can
// keep; "publishes at 9:00 exactly" is not.
//
// TIMEZONE. Sanity's datetime input shows and accepts LOCAL time (the editor's
// browser) and stores UTC. So an editor picking 9:00 AM gets 9:00 AM their own
// morning, which is what they meant, and the script comparing against `now()`
// in the dataset is comparing UTC to UTC. Nobody has to think about it; the
// description says "your time" so nobody worries about it either.
//
// USAGE. Spread the group into a document type's `groups` array and the field
// into its `fields` array, together:
//
//   groups: [ ...existing, PUBLISH_AT_GROUP ],
//   fields: [ ...existing, publishAtField() ],
//
// Both halves or neither: a field naming a group the type never declared is a
// hard crash in Studio 6.4+, not a warning.
//
// The script's query is schema-agnostic (it looks for any draft with a
// publishAt), so adding the pair to a new document type is the whole
// installation. No script change, no workflow change.
// =============================================================================
import { defineField } from 'sanity';

/** Field group that hosts publishAt. Declare it wherever the field is used. */
export const PUBLISH_AT_GROUP = { name: 'publishing', title: 'Publishing' } as const;

/** The scheduling field itself. `group` defaults to PUBLISH_AT_GROUP's name. */
export function publishAtField(group: string = PUBLISH_AT_GROUP.name) {
  return defineField({
    name: 'publishAt',
    title: 'Publish automatically at',
    type: 'datetime',
    group,
    description:
      'Set a date and time, keep the page as a draft, and it publishes itself within the half hour. Times are your own local time. Leave empty to publish by hand as usual. Clearing this before the time arrives cancels it.',
    options: {
      // Quarter-hour steps: a volunteer scheduling a newsletter page does not
      // need minute precision, and the cron cannot honour it anyway.
      timeStep: 15,
    },
  });
}
