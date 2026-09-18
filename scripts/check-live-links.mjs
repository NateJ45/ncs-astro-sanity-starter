// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
//
// Checks every EXTERNAL link the website carries, by reading them out of the
// DATASET rather than out of the source. Run weekly by
// .github/workflows/link-health.yml, or by hand:
//
//   node scripts/check-live-links.mjs
//   node scripts/check-live-links.mjs --verbose
//
// Ported from stonesteps-50k 2026-09-18 (PORTS.md card 42).
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
// shop, a social profile, a supplier. If one of those hosts reorganises a URL,
// the button, the footer and the CTA all point at a 404 and nothing in the
// build would notice. The business finds out from a customer.
//
// So this runs on its own schedule, away from the build, and is allowed to be
// noisy: a red weekly run mails the owner and nothing is blocked.
//
// NO TOKEN, and no hardcoded project. It reads the public dataset over the
// plain query API, so it runs anywhere without a secret. With no project id
// configured it skips cleanly rather than failing: a fresh clone of this
// starter has no dataset to check.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
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
 * output. Checking them here would double-report and, worse, would go red
 * whenever the production host is briefly down, which is uptime.yml's job.
 *
 * Read by regex rather than by import, exactly as scripts/worker-name.mjs
 * reads wrangler.jsonc: this script is dependency-free on purpose, and site.ts
 * is TypeScript. apply-brand rewrites the quoted string on `const _domain =`,
 * so that one line is a stable contract.
 */
function readOwnDomain() {
  try {
    const src = readFileSync(resolve(root, 'src/data/site.ts'), 'utf8');
    const m = src.match(/const\s+_domain\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

const OWN_DOMAIN = readOwnDomain();

/**
 * Everything in the dataset that can hold an outside URL.
 *
 * The first three are structural and exist in every site built from this
 * starter. The fourth is deliberately a SWEEP rather than a list of document
 * types: any document carrying a `url` or `externalUrl` field is caught, so a
 * project that adds sponsors, partners, venues or suppliers gets them checked
 * without editing this file. A site with a link somewhere stranger than that
 * adds a key here; nothing else in the script needs to change.
 */
const QUERY = `{
  "nav": *[_type == "siteSettings"][0].headerNav[]{ label, externalUrl, href },
  "footer": *[_type == "siteSettings"][0].footerColumns[].links[]{ label, href, externalUrl },
  "social": *[_type == "siteSettings"][0].socialLinks[]{ "label": platform, url },
  "ctas": *[defined(pageBuilder)].pageBuilder[]{
    "label": coalesce(cta.label, primaryCta.label, secondaryCta.label),
    "url": coalesce(cta.externalUrl, primaryCta.externalUrl, secondaryCta.externalUrl)
  },
  "docs": *[defined(url) || defined(externalUrl)]{
    _type,
    "label": coalesce(name, title, label, _type),
    "url": coalesce(url, externalUrl)
  }
}`;

async function readDataset() {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const { result } = await res.json();
  return result ?? {};
}

/** Only absolute http(s) links leave this site; everything else is internal. */
function isExternal(u) {
  if (typeof u !== 'string' || !/^https?:\/\//i.test(u)) return false;
  if (!OWN_DOMAIN) return true;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host !== OWN_DOMAIN && !host.endsWith(`.${OWN_DOMAIN}`);
  } catch {
    return false;
  }
}

function collect(data) {
  const found = new Map(); // url -> Set of labels, so one URL is checked once
  const add = (label, url) => {
    if (!isExternal(url)) return;
    const key = url.trim();
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(label || '(no label)');
  };

  for (const n of data.nav ?? []) add(`Header: ${n.label}`, n.externalUrl ?? n.href);
  for (const f of data.footer ?? []) add(`Footer: ${f.label}`, f.externalUrl ?? f.href);
  for (const s of data.social ?? []) add(`Social: ${s.label}`, s.url);
  for (const c of data.ctas ?? []) add(`Button: ${c.label}`, c.url);
  for (const d of data.docs ?? []) add(`${d._type}: ${d.label}`, d.url);
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

async function main() {
  if (!PROJECT_ID) {
    // A fork with no Sanity project cannot answer the question, and must not
    // go red for it. Same rule the deploy gate follows.
    console.log('PUBLIC_SANITY_PROJECT_ID not set; nothing to check.');
    return;
  }

  const data = await readDataset();
  const targets = collect(data);
  if (targets.size === 0) {
    console.log('No external links found in the dataset. Nothing to check.');
    return;
  }

  console.log(`Checking ${targets.size} external links from ${PROJECT_ID}/${DATASET}`);
  if (OWN_DOMAIN) console.log(`Links to ${OWN_DOMAIN} are internal and skipped.`);
  console.log('');

  const failures = [];
  const unverified = [];

  // Sequential on purpose: a handful of links, and hammering someone else's
  // server in parallel to check they are up is poor manners.
  for (const [url, labels] of targets) {
    const res = await probe(url);
    const where = [...labels].join(', ');
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
