// Safe to edit by hand
// Every main page a page builder (PORTS.md card 190, ported from FBC Auburn 2026-10-26).
// Contact, Privacy and Journal each gained a Page layout: the page's fixed piece became a block
// (Contact form, Privacy policy text, Journal posts) and the hero and closing fields became an
// opening banner and a closing band. This seeds each page's Page layout from its old fields:
//
//   contactPage  Page layout = opening banner (the old hero fields), Contact form.
//   privacyPage  Page layout = opening banner, Privacy policy text (the old body and date).
//   journalPage  Page layout = opening banner, Journal posts, then the closing band (the old
//                final-CTA fields) when the page had one.
//
// YOU DO NOT HAVE TO RUN THIS for the site to keep working. A page with an EMPTY Page layout
// renders exactly as it did before the card (the same banner, the same piece), so existing
// content is safe the moment the code deploys. Run it when the editor should be able to move
// sections around, which needs the layout filled. The old fields are NOT deleted (rule 16): they
// stay in the schema, so a rollback needs no restore. A site that wants them hidden once the
// layout is filled adds `hidden: true, readOnly: true` to them (FBC Auburn did).
//
// Dry by default. Production needs --apply AND NCS_PRODUCTION_WRITE=yes in the same command
// (rule 16, the write protocol: backup, dry run, apply, verify):
//   node scripts/main-pages-builder.mjs <backup-folder>
//   NCS_PRODUCTION_WRITE=yes node scripts/main-pages-builder.mjs <backup-folder> --apply
// Every touched document is written to <backup-folder>/main-pages-<stamp>.json first (keep it
// outside the repo). Safe to run twice: a page whose Page layout is already filled is skipped,
// and a page with an unpublished draft stops the run (publish or discard the draft first, or the
// patch would be hidden behind it). Verify with `npm run parity compare` after a build, and
// open each page.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { client, APPLY, apply, done } from './lib/sanity-lib.mjs';
import { plans, PAGE_IDS } from './lib/main-pages-plan.mjs';

const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('Pass a backup folder (outside the repo).');
  process.exit(1);
}

const docs = Object.fromEntries(
  await Promise.all(PAGE_IDS.map(async (id) => [id, await client.getDocument(id)])),
);
for (const id of PAGE_IDS) {
  if (await client.getDocument(`drafts.${id}`))
    throw new Error(`${id} has an unpublished draft; publish or discard it first.`);
}

if (APPLY) {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = join(dir, `main-pages-${stamp}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2));
  console.log(`Backed up ${PAGE_IDS.length} documents (missing ones as null) to ${backup}\n`);
}

let n = 0;
for (const id of PAGE_IDS) {
  const d = docs[id];
  if (!d) {
    console.log(`SKIP ${id}: no published document (the page renders its built-in words)`);
    continue;
  }
  if (d.pageBuilder?.length) {
    console.log(`SKIP ${id}: Page layout already has ${d.pageBuilder.length} section(s)`);
    continue;
  }
  const sections = plans[id](d);
  n++;
  await apply(`${id}: Page layout = ${sections.map((s) => s._type).join(', ')}`, () =>
    client.patch(id).set({ pageBuilder: sections }).commit(),
  );
}

done(n);
