// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// check-live-links - is every link that leaves this website still alive?
// =============================================================================
// Ported from stonesteps-50k 2026-09-18 (PORTS.md card 42). Rewritten
// 2026-09-29 from reid-design-site's fork, which found the fixed field list
// blind: against a real dataset it probed 222 cdn.sanity.io image assets and
// never saw the affiliate links, review links or menus the check is for. It now
// WALKS every published document instead of naming fields (see collect()), and
// writes its result to the Actions run's Summary page.
//
// Checks every EXTERNAL link the website carries, by reading them out of the
// DATASET rather than out of the source. Run weekly by
// .github/workflows/link-health.yml, or by hand:
//
//   node scripts/check-live-links.mjs
//   node scripts/check-live-links.mjs --verbose
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// `npm run check:links` walks the BUILT SITE and only ever sees internal
// routes; it is explicitly configured to skip external hosts, because a link
// checker that fails the build every time a third party has a bad minute is a
// link checker everyone learns to ignore.
//
// But the links that send a visitor somewhere else are exactly the ones an
// EDITOR changes, in the Studio, long after the last deploy: a booking page, a
// shop item, a social profile, a supplier. If one of those hosts reorganises a
// URL, the button, the footer and the CTA all point at a 404 and nothing in the
// build would notice. Affiliate links are the worst case: retailers retire
// products constantly. The business finds out from a customer.
//
// So this runs on its own schedule, away from the build, and is allowed to be
// noisy: a red weekly run mails the owner and nothing is blocked.
//
// NO TOKEN, and no hardcoded project. It reads the public dataset over the
// plain query API, so it runs anywhere without a secret. With no project id
// configured it skips cleanly rather than failing: a fresh clone of this
// starter has no dataset to check.
// ---------------------------------------------------------------------------

import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const API_VERSION = process.env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const VERBOSE = process.argv.includes('--verbose');
const TIMEOUT_MS = 15000;

/**
 * The site's own domain, read out of src/data/site.ts.
 *
 * An absolute link to the site's OWN pages is an internal link wearing an
 * external coat, and `check:links` already covers those against the built
 * output. Going red because the production host had a bad minute is
 * uptime.yml's job, not this one's.
 *
 * Read by regex rather than by import: this script is dependency-free on
 * purpose, and site.ts is TypeScript. Two shapes are accepted, because the
 * family has both: the starter's `const _domain = '...'` (the line apply-brand
 * rewrites, so a stable contract) and a literal `domain: '...'`.
 */
function readOwnDomain() {
  try {
    const src = readFileSync(resolve(root, 'src/data/site.ts'), 'utf8');
    const m =
      src.match(/const\s+_domain\s*=\s*['"]([^'"]+)['"]/) ??
      src.match(/\bdomain:\s*['"]([^'"]+)['"]/);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

const OWN_DOMAIN = readOwnDomain();

/**
 * Hosts that are not "a link to somewhere else": the Sanity image/file CDN
 * (every asset document carries a `url`), and endpoints a visitor never opens.
 */
const SKIP_HOSTS = new Set(['cdn.sanity.io', 'api.web3forms.com']);

/**
 * Field names that hold an address a script must not GET: the contact form's
 * POST endpoint. Skipped by name, wherever they appear.
 */
const SKIP_KEYS = new Set(['formActionUrl']);

/**
 * Every published document that is not Sanity's own bookkeeping. Drafts are left
 * out (an unpublished link is not live), and so is anything archived: an
 * archived page (card 21) is not built, and a `trashedItem` (the soft-delete
 * some sites carry) is a snapshot of something already removed from the site.
 * A type a given dataset does not have simply matches nothing.
 */
const QUERY = `*[
  !(_id in path("drafts.**")) &&
  !(_type match "sanity.*") &&
  !(_type match "system.*") &&
  _type != "trashedItem" &&
  _type != "media.tag" &&
  archived != true
]`;

async function readDataset() {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const { result } = await res.json();
  return result ?? [];
}

/** Only absolute http(s) links leave this site; everything else is internal. */
function isExternal(u) {
  if (typeof u !== 'string' || !/^https?:\/\/\S+$/i.test(u.trim())) return false;
  try {
    const host = new URL(u.trim()).hostname.toLowerCase();
    if (SKIP_HOSTS.has(host)) return false;
    if (OWN_DOMAIN && (host === OWN_DOMAIN || host.endsWith(`.${OWN_DOMAIN}`))) return false;
    return true;
  } catch {
    return false;
  }
}

/** A human label for a document: its own title, else its type. */
function docLabel(doc) {
  const name =
    doc.title ??
    doc.name ??
    doc.headline ??
    doc.outlet ??
    doc.internalTitle ??
    doc.label ??
    doc.author ??
    doc.reviewerName ??
    doc._id;
  return `${doc._type}: ${typeof name === 'string' ? name : doc._id}`;
}

/**
 * Walk one document and yield [path, value] for every whole-string http(s) URL.
 * `path` is the field trail (e.g. "navItems[2].externalUrl") so a report can say
 * WHERE in the Studio the dead link lives.
 */
function* urlsIn(node, path = '') {
  if (typeof node === 'string') {
    if (isExternal(node)) yield [path, node.trim()];
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* urlsIn(node[i], `${path}[${i}]`);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_') || SKIP_KEYS.has(key)) continue; // _type, _ref, _key, ...
      yield* urlsIn(value, path ? `${path}.${key}` : key);
    }
  }
}

function collect(docs) {
  const found = new Map(); // url -> Set of labels, so one URL is checked once
  for (const doc of docs) {
    const label = docLabel(doc);
    for (const [path, url] of urlsIn(doc)) {
      if (!found.has(url)) found.set(url, new Set());
      found.get(url).add(`${label} (${path})`);
    }
  }
  return found;
}

/**
 * HEAD first, then GET on anything that looks like a method objection.
 *
 * Plenty of sites answer HEAD with 403/405 while serving GET perfectly well,
 * and reporting those as broken is how a checker earns its reputation for
 * crying wolf. A redirect is a pass: it resolved to something.
 */
async function probe(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          // Some hosts serve a bot wall to a default fetch agent. This is a
          // real browser string because the question is "does a visitor get a
          // page", not "does a script".
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
          accept: 'text/html,*/*',
        },
      });
      return { status: res.status, ok: res.ok };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const head = await attempt('HEAD');
    if (head.ok) return head;
    if ([403, 405, 404, 501].includes(head.status)) return await attempt('GET');
    return head;
  } catch (err) {
    try {
      return await attempt('GET');
    } catch (err2) {
      return { status: 0, ok: false, error: String(err2.message || err.message || err) };
    }
  }
}

/** Write the run report to the Actions summary page when running in CI. */
function writeSummary(total, failures, unverified) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [`## Link health: ${total} outbound links checked`, ''];
  if (failures.length === 0) lines.push('No dead links.', '');
  else {
    lines.push(`### ${failures.length} dead link${failures.length === 1 ? '' : 's'}`, '');
    lines.push('| Link | Result | Where it lives in the Studio |', '| --- | --- | --- |');
    for (const f of failures) lines.push(`| ${f.url} | ${f.detail} | ${f.where} |`);
    lines.push('');
  }
  if (unverified.length > 0) {
    lines.push(
      `### ${unverified.length} the host would not let a script check`,
      '',
      'These answered, but refused an automated request (a bot wall). Open them by hand now and then.',
      '',
      '| Link | Result | Where it lives in the Studio |',
      '| --- | --- | --- |',
    );
    for (const u of unverified) lines.push(`| ${u.url} | ${u.detail} | ${u.where} |`);
    lines.push('');
  }
  try {
    appendFileSync(file, lines.join('\n') + '\n');
  } catch {
    // The summary is a courtesy; never fail the run over it.
  }
}

async function main() {
  if (!PROJECT_ID) {
    // A fork with no Sanity project cannot answer the question, and must not
    // go red for it. Same rule the deploy gate follows.
    console.log('PUBLIC_SANITY_PROJECT_ID not set; nothing to check.');
    return;
  }

  const docs = await readDataset();
  const targets = collect(docs);
  if (targets.size === 0) {
    console.log(`Read ${docs.length} documents. No external links found. Nothing to check.`);
    return;
  }

  console.log(
    `Checking ${targets.size} external links across ${docs.length} documents in ${PROJECT_ID}/${DATASET}`,
  );
  if (OWN_DOMAIN) console.log(`Links to ${OWN_DOMAIN} are internal and skipped.`);
  console.log('');

  const failures = [];
  const unverified = [];

  // Sequential on purpose: a handful of links, and hammering someone else's
  // server in parallel to check they are up is poor manners.
  for (const [url, labels] of targets) {
    const res = await probe(url);
    const where = [...labels].join('; ');
    const detail = res.error ? String(res.error) : `HTTP ${res.status}`;

    if (res.ok) {
      if (VERBOSE) console.log(`  ok   ${res.status}  ${url}  (${where})`);
      continue;
    }

    // A DEAD LINK AND A REFUSED ONE ARE NOT THE SAME THING, and conflating them
    // is how a checker teaches people to ignore it. 404 or 410 means the page
    // is gone. No status at all means the host did not answer. Anything else,
    // typically a 400/403/429 bot wall, means the server answered and declined
    // to talk to a script; Facebook does exactly this on group URLs, which a
    // browser opens perfectly well. Those are reported and do NOT fail the run.
    if (res.status === 404 || res.status === 410 || res.status === 0) {
      console.log(`  GONE ${detail}  ${url}`);
      console.log(`       used by: ${where}`);
      failures.push({ url, detail, where });
    } else {
      console.log(`  ??   ${detail}  ${url}`);
      console.log(`       used by: ${where}  (server answered but refused a script)`);
      unverified.push({ url, detail, where });
    }
  }

  console.log('');
  if (unverified.length > 0) {
    console.log(
      `${unverified.length} link${unverified.length === 1 ? '' : 's'} could not be checked ` +
        'automatically (the host refuses scripted requests). Open them by hand now and then.',
    );
  }
  writeSummary(targets.size, failures, unverified);
  if (failures.length === 0) {
    console.log(`No broken links. ${targets.size} checked.`);
    return;
  }
  console.log(`${failures.length} of ${targets.size} external links are GONE.`);
  console.log('These are links a visitor would click. Fix them in the Studio, or ask the owner.');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
