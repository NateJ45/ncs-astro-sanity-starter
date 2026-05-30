// One-shot cleanup for placeholder TODO/NEW values that landed in Sanity during
// the initial migration import and now show as either Studio validation errors
// (string TODOs in image fields) or as raw "[TODO: ...]" / "[NEW per audit] ..."
// text on the live site.
//
// What gets fixed (in order of severity):
//
//   1) homePage.heroImage         — string TODO → field removed (was supposed to be image)
//   2) homePage.meetStaciPhoto    — string TODO → field removed (was supposed to be image)
//   3) aboutPage.staciPhoto       — string TODO → field removed (was supposed to be image)
//   4) contactPage.schedulingLink — string TODO → field removed (was supposed to be URL)
//   5) homePage.serviceAreaCue        — strip "[NEW per audit] " prefix
//   6) aboutPage.serviceAreaMention   — strip "[NEW per audit] " prefix
//   7) aboutPage.backgroundLine       — string TODO → field cleared (Staci writes her own)
//   8) contactPage.formIntroNote      — strip "[NEW per audit] " prefix
//
// Strategy: fetch each affected doc fresh from the dataset (via the read token in
// .env so we get current state, not the stale migration JSON on disk), mutate in
// memory, write NDJSON, hand off to `sanity dataset import --replace` for the
// write (the CLI has the user's auth — we don't need a write token here).
//
// Safe to re-run: cleanup steps are all idempotent. Won't touch fields that
// already look clean (no TODO/NEW markers).

import { createClient } from '@sanity/client';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'fix-bad-values.ndjson');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_READ_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token,
});

// ---- Fetch current docs ----

const ids = ['homePage', 'aboutPage', 'contactPage'];
const docs = await client.fetch('*[_id in $ids]', { ids });
const byId = Object.fromEntries(docs.map((d) => [d._id, d]));

if (!byId.homePage || !byId.aboutPage || !byId.contactPage) {
  console.error('Could not fetch one or more singletons. Got:', Object.keys(byId).join(', '));
  process.exit(1);
}

// ---- Cleanup helpers ----

/** Returns true if val is a string AND starts with "[TODO" — the migration's image-field placeholders. */
function isStringTodo(val) {
  return typeof val === 'string' && /^\[TODO/i.test(val);
}

/** Strips a leading "[NEW per audit] " or "[NEW per audit]" prefix and trims. */
function stripNewPerAudit(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/^\[NEW per audit\]\s*/i, '').trim();
}

let cleanups = 0;
function note(msg) { console.log('  • ' + msg); cleanups++; }

// ---- homePage cleanups ----

const home = byId.homePage;
console.log('\nhomePage:');
if (isStringTodo(home.heroImage)) {
  delete home.heroImage;
  note('removed heroImage (was a TODO string, schema expects image object)');
}
if (isStringTodo(home.meetStaciPhoto)) {
  delete home.meetStaciPhoto;
  note('removed meetStaciPhoto (was a TODO string, schema expects image object)');
}
if (typeof home.serviceAreaCue === 'string' && home.serviceAreaCue.startsWith('[NEW per audit]')) {
  home.serviceAreaCue = stripNewPerAudit(home.serviceAreaCue);
  note('stripped "[NEW per audit] " prefix from serviceAreaCue');
}

// ---- aboutPage cleanups ----

const about = byId.aboutPage;
console.log('\naboutPage:');
if (isStringTodo(about.staciPhoto)) {
  delete about.staciPhoto;
  note('removed staciPhoto (was a TODO string, schema expects image object)');
}
if (isStringTodo(about.backgroundLine)) {
  // Background line is a real string field, but the value is a multi-paragraph TODO.
  // Clear it so the section either hides (when empty) or Staci writes her own.
  delete about.backgroundLine;
  note('removed backgroundLine (was a TODO string — Staci writes her own)');
}
if (typeof about.serviceAreaMention === 'string' && about.serviceAreaMention.startsWith('[NEW per audit]')) {
  about.serviceAreaMention = stripNewPerAudit(about.serviceAreaMention);
  note('stripped "[NEW per audit] " prefix from serviceAreaMention');
}

// ---- contactPage cleanups ----

const contact = byId.contactPage;
console.log('\ncontactPage:');
if (isStringTodo(contact.schedulingLink)) {
  delete contact.schedulingLink;
  note('removed schedulingLink (was a TODO string, schema expects URL)');
}
if (typeof contact.formIntroNote === 'string' && contact.formIntroNote.startsWith('[NEW per audit]')) {
  contact.formIntroNote = stripNewPerAudit(contact.formIntroNote);
  note('stripped "[NEW per audit] " prefix from formIntroNote');
}
// availabilityNote is `null` in the data — that's a value-type mismatch (schema is string).
// Sanity tolerates null but the safest cleanup is to remove the field entirely.
if (contact.availabilityNote === null) {
  delete contact.availabilityNote;
  note('removed availabilityNote (was null — Studio shows it as "missing string"; cleared field instead)');
}

// ---- Write NDJSON ----

if (cleanups === 0) {
  console.log('\nNothing to clean — all bad values already fixed.');
  process.exit(0);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const lines = [home, about, contact].map((d) => JSON.stringify(d));
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${lines.length} patched docs to ${outPath} (${cleanups} cleanups applied)`);

// ---- Import via CLI (--replace overwrites the existing singletons) ----

console.log('\nRunning sanity dataset import...\n');
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['sanity', 'dataset', 'import', outPath, 'production', '--replace'],
  {
    cwd: resolve(root, 'studio'),
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 0);
