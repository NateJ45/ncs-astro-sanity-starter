#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// public-data-audit.mjs - what can a stranger read out of our dataset?
// =============================================================================
// WHY THIS EXISTS
//
// Sanity's free plan offers "2 datasets (public only)". A public dataset is
// readable by ANYONE over a plain URL, with no token:
//
//   https://<projectId>.api.sanity.io/<version>/data/query/<dataset>?query=*
//
// and the project id is not a secret - it ships in every image URL in the
// page source. On wcp-website (2026-09-06) that meant 37 family directory
// entries, 40 children's names, 71 parents and 33 home addresses were world
// readable, behind a Family Hub login that was itself correctly built. The
// login protects the PAGE. The Content Lake API is a second door, and it was
// open. Nothing in the checklist said "a public dataset is public", so nothing
// caught it for months.
//
// This is that check. It queries the dataset the way a stranger would - NO
// TOKEN, deliberately - and fails when personal data comes back.
//
// USAGE
//   node scripts/public-data-audit.mjs            # exits 1 on a violation
//   node scripts/public-data-audit.mjs --explain  # also list what it allowed
//
// Policy lives in public-data-policy.json next to it. Every exception must
// carry a reason, because "we looked at it and it is fine" is exactly the
// judgement that needs to be written down once rather than remade under time
// pressure by whoever is on call.
//
// IT NEVER PRINTS VALUES. The report names types, fields and counts only. This
// runs in CI on PUBLIC repositories, where the log is as public as the dataset:
// a checker that pasted the exposed personal data into a world readable build
// log would be a worse leak than the one it is reporting.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/loadEnv.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const env = loadEnv(process.cwd());
const EXPLAIN = process.argv.includes('--explain');

// Sites do not all keep the project id in the same place: some read an env var,
// wcp-website hardcodes it in src/sanity/env.ts. Look in the source too, because
// the alternative is skipping - and a check that skips reports success. This one
// skipped on wcp-website and printed a pass over 37 exposed families.
const fromSource = () => {
  for (const rel of [
    'src/sanity/env.ts',
    'sanity.cli.ts',
    'sanity.config.ts',
    'astro.config.mjs',
  ]) {
    const p = resolve(process.cwd(), rel);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/projectId\s*[:=]\s*['"]([a-z0-9]{6,})['"]/i);
    if (m && m[1] !== 'placeholder-project-id') return m[1];
  }
  return null;
};

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------
const policyPath = join(HERE, '..', 'public-data-policy.json');
const policy = existsSync(policyPath)
  ? JSON.parse(readFileSync(policyPath, 'utf8'))
  : { allowedTypes: {}, blockedTypes: [] };

const PROJECT =
  env.PUBLIC_SANITY_PROJECT_ID ||
  env.SANITY_STUDIO_PROJECT_ID ||
  env.SANITY_PROJECT_ID ||
  fromSource();
const DATASET = env.PUBLIC_SANITY_DATASET || env.SANITY_STUDIO_DATASET || 'production';
const API_VERSION = '2025-08-15';

if (!PROJECT || PROJECT === 'placeholder-project-id') {
  // Only a repo with no Sanity at all may skip. If the project depends on
  // Sanity but we could not find its id, that is a broken check rather than a
  // clean site, and it must fail loudly: the whole point is to not hand back a
  // pass we did not earn.
  // The one legitimate exception is THIS repo: a template ships the Sanity
  // dependencies and no project of its own, so "uses Sanity but has no id" is
  // its normal state rather than a broken check. It has to be declared in the
  // policy file, not inferred, so a real site cannot fall into it by accident.
  if (policy.noDataset === true) {
    console.log(
      'public-data-audit: policy says this repo has no dataset of its own; nothing to audit.',
    );
    process.exit(0);
  }
  const pkgPath = resolve(process.cwd(), 'package.json');
  const usesSanity =
    existsSync(pkgPath) && /"(sanity|@sanity\/[a-z-]+)"\s*:/.test(readFileSync(pkgPath, 'utf8'));
  if (usesSanity) {
    console.log(
      '::error::public-data-audit: this project uses Sanity but no project id could be found in the environment, .env, or src/sanity/env.ts. Refusing to report a pass it did not verify.',
    );
    process.exit(1);
  }
  console.log('::warning::public-data-audit: no Sanity project here; nothing to audit.');
  process.exit(0);
}

// Field names that are personal data almost wherever they appear. Matched on
// the field NAME, case-insensitively, anywhere in the document tree - a nested
// `parents[].phone` is as exposed as a top level one.
// NOTE `children` is here but is special-cased below: it is also Portable
// Text's own field name for the spans inside a block, so a naive match fires on
// every rich text field on every site. A check that cries wolf everywhere gets
// blanket-allowed and then protects nothing, which is worse than not having it.
const PERSONAL_FIELDS = [
  'address',
  'streetaddress',
  'homeaddress',
  'phone',
  'mobile',
  'telephone',
  'children',
  'child',
  'parents',
  'guardian',
  'dob',
  'dateofbirth',
  'birthday',
  'ssn',
  'nationalid',
  'emergencycontact',
  'medical',
  'allergy',
  'allergies',
];

// `children` is the most overloaded name in a CMS: Portable Text spans, nav
// submenus, and actual children all use it. Flag it only when the contents look
// like people - a bare list of names, or objects carrying person-ish fields.
// Portable Text spans (text/_type span) and nav items (title/href) are not.
const PERSONISH = [
  'name',
  'firstname',
  'lastname',
  'age',
  'grade',
  'dob',
  'birthday',
  'classroom',
  'class',
];
const looksLikePeople = (value) => {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some((v) => {
    if (typeof v === 'string') return v.trim().length > 0; // a plain list of names
    if (!v || typeof v !== 'object') return false;
    if (v._type === 'span' || typeof v.text === 'string') return false; // Portable Text
    const keys = Object.keys(v).map((k) => k.toLowerCase());
    if (keys.includes('href') || keys.includes('url') || keys.includes('link')) return false; // navigation
    return keys.some((k) => PERSONISH.includes(k));
  });
};

// Values that look personal regardless of what the field is called. Deliberately
// loose on addresses and conservative on phones: a false positive costs a line
// in the policy file, a false negative costs a family's address.
const VALUE_PATTERNS = [
  { name: 'email', re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  {
    name: 'street-address',
    re: /\b\d+\s+[A-Za-z][A-Za-z\s.]{2,30}\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|way|circle|cir|boulevard|blvd)\b/i,
  },
];

// ---------------------------------------------------------------------------
// Fetch, anonymously. The absence of a token here is the entire point of the
// script; do not "fix" this by adding one.
// ---------------------------------------------------------------------------
const query = async (groq) => {
  const url = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // A private dataset answers 401/403 here, which is a PASS: a stranger got
    // nothing. Anything else is a real failure to report.
    if (res.status === 401 || res.status === 403) return { private: true };
    throw new Error(`Sanity returned ${res.status} for an anonymous query`);
  }
  return { result: (await res.json()).result };
};

const walk = (node, path, hits) => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const v of node) walk(v, path, hits);
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue;
      const key = k.toLowerCase();
      const structuralChildren = (key === 'children' || key === 'child') && !looksLikePeople(v);
      if (!structuralChildren && PERSONAL_FIELDS.includes(key)) hits.fields.add(k);
      walk(v, path ? `${path}.${k}` : k, hits);
    }
    return;
  }
  if (typeof node === 'string') {
    for (const p of VALUE_PATTERNS) if (p.re.test(node)) hits.values.add(p.name);
  }
};

const main = async () => {
  const probe = await query('count(*)');
  if (probe.private) {
    console.log(
      `public-data-audit: ${PROJECT}/${DATASET} is NOT publicly readable. Nothing to audit.`,
    );
    return 0;
  }

  const total = probe.result ?? 0;
  const types = (await query('array::unique(*._type)')).result || [];
  console.log(
    `public-data-audit: ${PROJECT}/${DATASET} is PUBLIC - ${total} documents readable by anyone.`,
  );

  const violations = [];
  const notices = [];
  const allowed = [];

  for (const type of types.filter(
    (t) => !String(t).startsWith('sanity.') && !String(t).startsWith('system.'),
  )) {
    if (policy.blockedTypes?.includes(type)) {
      // Count documents that actually CARRY something, not documents that
      // exist. After wcp-website's directory moved to KV its 37 documents were
      // emptied rather than deleted (four roleHolder references would have
      // blocked a delete), leaving shells with no fields at all. Failing on
      // those would be measuring the schema instead of the exposure - and a
      // gate that stays red after the fix is a gate people learn to ignore.
      const docs = (await query(`*[_type=="${type}"][0..99]`)).result || [];
      const carrying = docs.filter((d) =>
        Object.keys(d || {}).some((k) => !k.startsWith('_')),
      ).length;
      if (carrying > 0)
        violations.push({
          type,
          count: `${carrying} of ${docs.length} documents still carry fields`,
          why: 'type is listed in blockedTypes and must never be public',
        });
      continue;
    }

    // Sample rather than pull everything: enough to find a personal field
    // without dragging the whole dataset through a CI runner.
    const docs = (await query(`*[_type=="${type}"][0..24]`)).result || [];
    if (!docs.length) continue;
    const hits = { fields: new Set(), values: new Set() };
    for (const d of docs) walk(d, '', hits);
    if (!hits.fields.size && !hits.values.size) continue;

    const allowList = policy.allowedTypes?.[type];
    const allowedFields = allowList?.fields || [];

    // A personal FIELD NAME is a hard failure: someone modelled people here.
    const badFields = [...hits.fields].filter((f) => !allowedFields.includes(f));
    // A personal-looking VALUE in free text is a notice, not a failure. An email
    // in a privacy policy is intentional publishing, and failing builds over it
    // teaches everyone to add blanket allows - which is how this check would
    // quietly stop protecting anything.
    const badValues = [...hits.values]
      .map((v) => `<${v}>`)
      .filter((v) => !allowedFields.includes(v));

    if (badFields.length) {
      violations.push({
        type,
        found: badFields,
        why: 'personal field names on a publicly readable type',
      });
    } else if (allowList) {
      allowed.push({ type, found: [...hits.fields, ...badValues], reason: allowList.reason });
    }
    if (badValues.length) notices.push({ type, found: badValues });
  }

  if (EXPLAIN && allowed.length) {
    console.log('\nAllowed by policy:');
    for (const a of allowed) console.log(`  ${a.type}: ${a.found.join(', ')}  - ${a.reason}`);
  }

  if (notices.length) {
    console.log('\nWorth a look (not a failure) - personal-looking values in public text:');
    for (const n of notices) console.log(`  ${n.type}: ${n.found.join(', ')}`);
    console.log('  These are usually deliberate (a contact address on a legal page).');
  }

  if (!violations.length) {
    console.log('\npublic-data-audit: no personal data is publicly readable.');
    return 0;
  }

  console.log('\n::error::public-data-audit: personal data is readable by anyone, with no token.');
  for (const v of violations) {
    const what = v.count !== undefined ? String(v.count) : v.found.join(', ');
    console.log(`  ${v.type}: ${what}  (${v.why})`);
  }
  console.log(
    [
      '',
      'This dataset is public, so a login in front of the page does not protect it:',
      `  https://${PROJECT}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=*`,
      'returns everything to anyone, and the project id ships in the page source.',
      '',
      'Fix it by moving the data out of the CMS (Workers KV or D1, read server-side),',
      'not by hiding the page. If a field is genuinely fine to publish - a staff',
      'contact email on a public About page - add it to public-data-policy.json with',
      'a reason.',
    ].join('\n'),
  );
  return 1;
};

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // Never fail open on a network blip in a way that reads like a pass.
    console.log(`::error::public-data-audit could not complete: ${err.message}`);
    process.exit(1);
  });
