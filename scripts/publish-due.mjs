// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// publish-due.mjs - free-tier scheduled publishing
// =============================================================================
// Sanity's Scheduled Drafts is a Growth-plan feature. This is the free version:
// an editor sets `publishAt` on a DRAFT (see src/sanity/schemaTypes/_publishAt.ts)
// and this script, run every half hour by .github/workflows/publish-due.yml,
// publishes anything whose time has come.
//
// WHY THIS SCRIPT HAS NO IMPORTS FROM node_modules
// It runs 48 times a day. `npm ci` on each run would spend a couple of minutes
// of Actions time installing several hundred megabytes in order to make three
// HTTP calls. So it talks to Sanity's HTTP API directly with global fetch, and
// the workflow is checkout + setup-node + node. The only local import is
// scripts/lib/loadEnv.mjs, which is itself dependency-free and only used for
// local runs (in CI the values come from the workflow env).
//
// ENDPOINTS USED (api version pinned in API_VERSION below)
//   POST https://<projectId>.api.sanity.io/v<ver>/data/query/<dataset>
//        body {query, params}. Reads. `perspective=raw` is required: the
//        default perspective hides `drafts.*` documents, which are the only
//        ones this script cares about.
//   POST https://<projectId>.api.sanity.io/v<ver>/data/mutate/<dataset>
//        ?returnIds=true  body {mutations:[...]}. Writes. One request per
//        document carrying BOTH mutations, so a publish is atomic: it is not
//        possible to delete the draft and fail to create the published doc.
// Both take `Authorization: Bearer <SANITY_AUTH_TOKEN>`. The token is never
// printed, not even in an error.
//
// WHAT "PUBLISH" MEANS HERE
// Sanity's own publish action is exactly two mutations: createOrReplace the
// document at the id without the `drafts.` prefix, then delete the draft. This
// mirrors it, with one addition: `publishAt` is stripped on the way through, so
// the published document does not carry a stale schedule and cannot be picked
// up again on the next run. (The field is not merely cleared afterwards. It is
// never written to the published document in the first place, which means there
// is no window where a crash between two writes leaves a doc that republishes
// itself every half hour.)
//
// SAFETY: DRY RUN BY DEFAULT
// Running it bare prints what it would publish and writes nothing. Pass
// --apply to actually publish. The workflow passes --apply. This is the same
// gate every other Sanity script in scripts/ uses.
//
// USAGE
//   node scripts/publish-due.mjs             # dry run, prints the queue
//   node scripts/publish-due.mjs --apply     # publish them
// ENV (from the repo .env locally, from workflow env in CI)
//   SANITY_AUTH_TOKEN   required, needs write access to the dataset
//   SANITY_PROJECT_ID   (or PUBLIC_SANITY_PROJECT_ID / SANITY_STUDIO_PROJECT_ID)
//   SANITY_DATASET      (or PUBLIC_SANITY_DATASET / SANITY_STUDIO_DATASET), default 'production'
//
// EXIT CODES
//   0  nothing was due, or everything due was handled (dry run included)
//   1  misconfigured (no token / no project id) or a mutation failed
// =============================================================================
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/loadEnv.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnv(ROOT);

// Pinned rather than floating: `path()` and the `raw` perspective both behave
// the same across recent versions, and a pinned date means a future API default
// cannot change what this script sees.
const API_VERSION = '2025-02-19';

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

const token = env.SANITY_AUTH_TOKEN || env.SANITY_API_WRITE_TOKEN;
const projectId =
  env.SANITY_PROJECT_ID || env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID;
const dataset =
  env.SANITY_DATASET || env.PUBLIC_SANITY_DATASET || env.SANITY_STUDIO_DATASET || 'production';

if (!projectId) {
  console.error('publish-due: no Sanity project id (SANITY_PROJECT_ID). Nothing to do.');
  process.exit(1);
}
if (!token) {
  console.error('publish-due: no SANITY_AUTH_TOKEN. A write token is required to publish.');
  process.exit(1);
}

const base = `https://${projectId}.api.sanity.io/v${API_VERSION}/data`;
const authHeaders = {
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
};

/** POST a JSON body and fail loudly, but never echo the token. */
async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${new URL(url).pathname}: ${text}`);
  }
  return JSON.parse(text);
}

// Every draft whose scheduled moment has passed. `now()` is evaluated by
// Sanity, so the comparison is UTC on both sides and the runner's own clock
// and timezone are irrelevant.
const QUERY = `*[_id in path("drafts.**") && defined(publishAt) && publishAt <= now()]`;

async function main() {
  const { result: due } = await post(`${base}/query/${dataset}?perspective=raw`, {
    query: QUERY,
  });

  if (!Array.isArray(due) || due.length === 0) {
    console.log('publish-due: nothing scheduled is due. Exiting 0.');
    return;
  }

  console.log(
    `publish-due: ${due.length} document(s) due${DRY ? ' (DRY RUN, nothing will be written)' : ''}:`,
  );

  let published = 0;
  for (const draft of due) {
    const publishedId = draft._id.replace(/^drafts\./, '');
    const label = `${draft._type} ${publishedId}`;
    console.log(`  - ${label}  (was scheduled for ${draft.publishAt})`);

    if (DRY) continue;

    // Strip the fields the API assigns itself, plus the schedule (see the
    // header: the published document must never carry publishAt).
    const { _rev, _createdAt, _updatedAt, publishAt, ...content } = draft;
    void _rev;
    void _createdAt;
    void _updatedAt;
    void publishAt;

    try {
      await post(`${base}/mutate/${dataset}?returnIds=true`, {
        mutations: [
          { createOrReplace: { ...content, _id: publishedId } },
          { delete: { id: draft._id } },
        ],
      });
      published += 1;
      console.log(`    published`);
    } catch (err) {
      // Keep going: one bad document should not strand the rest of the queue.
      // The non-zero exit at the end is what makes the run visibly red.
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (DRY) {
    console.log('publish-due: dry run complete. Re-run with --apply to publish.');
    return;
  }

  console.log(`publish-due: published ${published} of ${due.length}.`);
  if (published !== due.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`publish-due: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
