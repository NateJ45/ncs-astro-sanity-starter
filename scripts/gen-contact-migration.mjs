// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
//
// Writes migrations/0001_contact_submissions.sql from the SUBMISSIONS_DDL
// constant in src/lib/contact-submission.ts. Run with `npm run contact:migration`.
//
// WHY GENERATE IT. The endpoint inserts a fixed list of columns and a unit test
// asserts the DDL declares them, so the constant is the single source of truth.
// A hand-written .sql file beside it is a second source of truth that nothing
// checks, and the failure shows up as a runtime error on a real enquiry, which
// is the worst moment to discover a missing column.

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBMISSIONS_DDL } from '../src/lib/contact-submission.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '..', 'migrations', '0001_contact_submissions.sql');

const header = [
  '-- GENERATED FILE. Do not hand-edit.',
  '-- Written by scripts/gen-contact-migration.mjs from SUBMISSIONS_DDL in',
  '-- src/lib/contact-submission.ts, so the schema and the endpoint cannot drift.',
  '--',
  '-- Apply it with:',
  '--   npx wrangler d1 migrations apply <DB_NAME> --remote',
  '',
  '',
].join('\n');

await mkdir(dirname(out), { recursive: true });
await writeFile(out, header + SUBMISSIONS_DDL + '\n');
console.log(`Contact migration written: migrations/0001_contact_submissions.sql`);
