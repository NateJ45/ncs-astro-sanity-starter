// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/cutover.mjs
//
// Added 2026-09-18, the day stonesteps50k.com moved from GoDaddy to Cloudflare.
//
// WHAT THIS IS. One script that takes a site from "the zone is not on
// Cloudflare" to "live on its own domain, with the mail intact". Every step in
// it was done by hand that morning, through the Cloudflare API and wrangler,
// and every step is identical for the next client. A runbook a human follows at
// speed, on the one irreversible morning of a project, is a runbook with a step
// missed in it.
//
// DRY RUN BY DEFAULT. With no flags it makes NO state-changing calls and no
// outside checks: it reads what it can, prints the plan, and stops. `--write`
// is the only thing that lets it act. That default is not politeness. The
// blast radius of this script is a client's live domain and their mail, and a
// plan you can read and disagree with before anything happens is the whole
// safety model.
//
// IDEMPOTENT. Every step checks whether it is already done and prints the
// reason it is skipping. Running it twice is a no-op; running it after a
// partial failure resumes.
//
// WHAT IT DELIBERATELY DOES NOT DO. Two commands stay in human hands and step 4
// prints them with the reason: `wrangler email sending enable` (a beta command
// with no stable API behind it) and `sanity cors add` (needs the interactive
// Sanity login, not an API token).
//
// Usage:
//   node scripts/cutover.mjs                            # the plan, nothing else
//   node scripts/cutover.mjs --zone-file zone.txt       # plan + the zone audit
//   node scripts/cutover.mjs --write --zone-file zone.txt
//   node scripts/cutover.mjs --verify                   # the outside checks only
//
// Flags:
//   --write           actually make the changes
//   --zone-file PATH  a BIND export from the old registrar to audit and import
//   --domain D        override the domain read from src/data/site.ts
//   --worker NAME     override the Worker name read from wrangler.jsonc
//   --verify          run the outside verification even without --write
//
// Credentials, from the environment or .env:
//   CLOUDFLARE_API_TOKEN    Zone:Edit, DNS:Edit, SSL:Edit and Workers:Edit
//   CLOUDFLARE_ACCOUNT_ID

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadEnv } from './lib/loadEnv.mjs';
import { parseZoneFile, auditZone, renderZoneFile } from './lib/zone-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.indexOf(n) !== -1 ? args[args.indexOf(n) + 1] : undefined);

const WRITE = flag('--write');
const ZONE_FILE = opt('--zone-file');
const VERIFY = flag('--verify') || WRITE;

const env = loadEnv(root);
const API_TOKEN = env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

const results = [];
const step = (n, title) =>
  console.log(`\n${'='.repeat(72)}\nSTEP ${n}: ${title}\n${'='.repeat(72)}`);
const plan = (m) => console.log(`  [plan]  ${m}`);
const done = (m) => console.log(`  [done]  ${m}`);
const skip = (m) => console.log(`  [skip]  ${m}`);
const note = (m) => console.log(`          ${m}`);
const warn = (m) => console.log(`  [warn]  ${m}`);
const fail = (m) => console.log(`  [FAIL]  ${m}`);
const record = (check, status, detail) => results.push({ check, status, detail });

// ---------------------------------------------------------------------------
// Reading this repo's own identity
// ---------------------------------------------------------------------------

/**
 * The domain comes from src/data/site.ts, which apply-brand already owns, and
 * the Worker name from wrangler.jsonc. Neither is asked for on the command line
 * by default: a cutover that takes the domain as an argument is a cutover where
 * somebody can type the wrong one.
 */
function readDomain() {
  const override = opt('--domain');
  if (override) return override;
  const src = readFileSync(resolve(root, 'src/data/site.ts'), 'utf8');
  const m = src.match(/const\s+_domain\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('could not find _domain in src/data/site.ts');
  return m[1];
}

/** wrangler.jsonc is JSONC: comments and trailing commas. Same strip as worker-name.mjs. */
function readWorkerName() {
  const override = opt('--worker');
  if (override) return override;
  const raw = readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8');
  const json = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/,(\s*[}\]])/g, '$1');
  const name = JSON.parse(json).name;
  if (!name) throw new Error('wrangler.jsonc has no top-level "name"');
  return name;
}

// ---------------------------------------------------------------------------
// The Cloudflare API
// ---------------------------------------------------------------------------

const API = 'https://api.cloudflare.com/client/v4';

/**
 * One chokepoint for every Cloudflare call, on the same principle as
 * `sanityFetch`: a single place that knows about credentials, about dry run,
 * and about how this API reports failure.
 *
 * IN DRY RUN NOTHING LEAVES THE MACHINE, not even a GET. A plan that quietly
 * depends on live account state is a plan that reads differently to the person
 * who has the credentials and the person who does not, and both of them have to
 * be able to review it. Reads return null and the step says what it could not
 * see.
 *
 * Cloudflare answers 200 with `success: false` for real failures, so the status
 * code alone proves nothing.
 */
async function cf(method, path, body, { multipart } = {}) {
  if (!WRITE) {
    plan(`${method} ${path}${body && !multipart ? ` ${JSON.stringify(body)}` : ''}`);
    return null;
  }
  if (!API_TOKEN) throw new Error('CLOUDFLARE_API_TOKEN is not set');

  const init = { method, headers: { authorization: `Bearer ${API_TOKEN}` } };
  if (multipart) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!data.success) {
    const why = (data.errors || []).map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(`${method} ${path} failed (${res.status}): ${why || 'no detail'}`);
  }
  return data.result;
}

/** A GET that is allowed to come back empty rather than throwing. */
async function cfMaybe(method, path, body) {
  try {
    return await cf(method, path, body);
  } catch (err) {
    warn(`${path}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 1: the zone
// ---------------------------------------------------------------------------

async function ensureZone(domain) {
  step(1, `The zone for ${domain}`);

  const found = await cfMaybe(
    'GET',
    `/zones?name=${encodeURIComponent(domain)}&account.id=${ACCOUNT_ID ?? ''}`,
  );
  let zone = Array.isArray(found) && found.length ? found[0] : null;

  if (zone) {
    skip(`zone already exists (id ${zone.id}, status ${zone.status})`);
  } else if (!WRITE) {
    plan(
      `create the zone for ${domain} in account ${ACCOUNT_ID ?? '<CLOUDFLARE_ACCOUNT_ID>'} as a FULL setup`,
    );
    note('full setup, not partial: Cloudflare has to be authoritative for the zone before a');
    note('Worker custom domain or Email Sending can be attached to it.');
    note('The two nameservers to give the registrar are printed here once the zone exists.');
    return null;
  } else {
    zone = await cf('POST', '/zones', {
      name: domain,
      account: { id: ACCOUNT_ID },
      type: 'full',
    });
    done(`zone created (id ${zone.id})`);
  }

  if (zone) {
    console.log('');
    note('POINT THE REGISTRAR AT THESE TWO NAMESERVERS. Nothing on the live domain');
    note('changes until somebody does, which is what makes every step above safe to');
    note('run in advance.');
    for (const ns of zone.name_servers || []) console.log(`            ${ns}`);
    record('zone', zone.status === 'active' ? 'ok' : 'pending', `status ${zone.status}`);
  }
  return zone;
}

// ---------------------------------------------------------------------------
// Step 2: the zone file
// ---------------------------------------------------------------------------

async function importZoneFile(zone, domain) {
  step(2, 'The old zone: audit, then import a cleaned copy');

  if (!ZONE_FILE) {
    skip('no --zone-file given; DNS records will have to be added by hand');
    return;
  }
  const path = resolve(process.cwd(), ZONE_FILE);
  if (!existsSync(path)) {
    fail(`${path} does not exist`);
    record('zone file', 'fail', 'not found');
    return;
  }

  const audit = auditZone(parseZoneFile(readFileSync(path, 'utf8')), { domain });

  console.log('\n  AUDIT OF THE EXPORT (read this before anything is imported)\n');
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...audit.findings].sort((a, b) => order[a.level] - order[b.level]);
  if (sorted.length === 0) note('nothing to flag.');
  for (const f of sorted) {
    console.log(`  ${f.level.toUpperCase().padEnd(5)} ${f.code.padEnd(30)} ${f.message}`);
    for (const v of f.values || []) console.log(`        ${JSON.stringify(v)}`);
  }
  console.log(
    `\n  ${audit.counts.import} carried over, ${audit.counts.rewrite} rewritten, ${audit.counts.skip} left out.`,
  );
  record(
    'zone audit',
    audit.findings.some((f) => f.level === 'error') ? 'fixed' : 'ok',
    `${audit.findings.filter((f) => f.level === 'error').length} error(s) corrected`,
  );

  // The cleaned file is written in BOTH modes. It is a local artefact and it is
  // the only record of what was actually imported; on the day a client's mail
  // misbehaves after a move, the diff between the two files is the first thing
  // anybody wants to read.
  const cleaned = join(
    dirname(path),
    `${basename(path, extname(path))}.cleaned${extname(path) || '.txt'}`,
  );
  writeFileSync(
    cleaned,
    renderZoneFile(audit, {
      header: `Cleaned copy of ${basename(path)} for ${domain}.\nWritten by scripts/cutover.mjs on ${new Date().toISOString().slice(0, 10)}.`,
    }),
  );
  done(`cleaned copy written: ${cleaned}`);
  if (!WRITE) note('(a local file only; nothing is sent to Cloudflare without --write)');

  if (!zone) {
    plan('POST /zones/{id}/dns_records/import with the cleaned file, once the zone exists');
    return;
  }

  const existing = await cfMaybe('GET', `/zones/${zone.id}/dns_records?per_page=5`);
  if (Array.isArray(existing) && existing.length > 0) {
    skip(
      `the zone already holds ${existing.length >= 5 ? '5+' : existing.length} record(s); not importing over them`,
    );
    note('Delete them first, or import by hand. Re-importing on top is how a zone ends up');
    note('with two SPF records, which is the fault this audit exists to catch.');
    return;
  }

  if (!WRITE) {
    plan(`POST /zones/{id}/dns_records/import with ${cleaned} (proxied=false)`);
    return;
  }

  const form = new FormData();
  form.append('file', new Blob([readFileSync(cleaned)]), basename(cleaned));
  // proxied=false: none of these are the website. The apex and www come from
  // the Worker custom domains and are proxied by definition; proxying a mail or
  // verification name would break it.
  form.append('proxied', 'false');
  await cf('POST', `/zones/${zone.id}/dns_records/import`, form, { multipart: true });
  done(`imported ${audit.counts.import + audit.counts.rewrite} record(s)`);
}

// ---------------------------------------------------------------------------
// Step 3: the Worker, the redirect, the TLS settings
// ---------------------------------------------------------------------------

async function attachSite(zone, domain, worker) {
  step(3, `Attach ${worker} to ${domain} and www, and set the TLS posture`);

  if (!zone) {
    plan('everything in this step waits for the zone to exist');
    return;
  }
  if (zone.status !== 'active') {
    skip(`the zone is "${zone.status}", not "active"`);
    note('STOPPING HERE ON PURPOSE. A custom domain cannot be attached and a certificate');
    note('cannot be issued until Cloudflare is authoritative, which happens when the');
    note("registrar's nameserver change propagates. Point the registrar at the two");
    note('nameservers above, then run this again. Nothing below has been attempted.');
    record('worker custom domains', 'waiting', 'zone not active yet');
    return;
  }

  // ---- custom domains ----------------------------------------------------
  for (const hostname of [domain, `www.${domain}`]) {
    const have = await cfMaybe(
      'GET',
      `/accounts/${ACCOUNT_ID}/workers/domains?zone_id=${zone.id}&hostname=${encodeURIComponent(hostname)}`,
    );
    if (Array.isArray(have) && have.some((d) => d.service === worker)) {
      skip(`${hostname} is already a custom domain for ${worker}`);
      record(`custom domain ${hostname}`, 'ok', 'already attached');
      continue;
    }
    await cf('PUT', `/accounts/${ACCOUNT_ID}/workers/domains`, {
      zone_id: zone.id,
      hostname,
      service: worker,
      environment: 'production',
    });
    if (WRITE) done(`${hostname} attached to ${worker}`);
    record(`custom domain ${hostname}`, WRITE ? 'ok' : 'planned', worker);
  }

  // ---- www to apex -------------------------------------------------------
  // A REDIRECT RULE, not a second site. Both hostnames are custom domains so
  // both reach the Worker; without this rule the site answers on two addresses
  // with identical content, which splits every link and every search result.
  // It lives in the dynamic-redirect phase because that runs at the edge before
  // the Worker, so the 301 costs nothing.
  const phase = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const current = await cfMaybe('GET', phase);
  const wanted = {
    expression: `(http.host eq "www.${domain}")`,
    description: `www to apex (${domain})`,
  };
  const already =
    current && (current.rules || []).some((r) => r.description === wanted.description);
  if (already) {
    skip('the www-to-apex redirect rule is already in place');
    record('www redirect', 'ok', 'already in place');
  } else {
    const rules = [
      ...((current && current.rules) || []).map((r) => ({
        action: r.action,
        action_parameters: r.action_parameters,
        expression: r.expression,
        description: r.description,
        enabled: r.enabled,
      })),
      {
        action: 'redirect',
        action_parameters: {
          from_value: {
            status_code: 301,
            target_url: { expression: `concat("https://${domain}", http.request.uri.path)` },
            preserve_query_string: true,
          },
        },
        expression: wanted.expression,
        description: wanted.description,
        enabled: true,
      },
    ];
    await cf('PUT', phase, { rules });
    if (WRITE) done(`301 www.${domain} -> ${domain}, query string preserved`);
    record('www redirect', WRITE ? 'ok' : 'planned', '301 to the apex');
  }

  // ---- the TLS posture ---------------------------------------------------
  // The same four settings every other zone in this studio runs, set explicitly
  // rather than left on whatever the account default happens to be that year.
  // `ssl: strict` is the one that matters: `flexible` would let Cloudflare talk
  // to the origin over plain HTTP, and with a Worker origin there is no reason
  // on earth to allow that.
  const settings = [
    ['always_use_https', 'on'],
    ['min_tls_version', '1.2'],
    ['ssl', 'strict'],
    ['automatic_https_rewrites', 'on'],
  ];
  for (const [id, value] of settings) {
    const have = await cfMaybe('GET', `/zones/${zone.id}/settings/${id}`);
    if (have && String(have.value) === value) {
      skip(`${id} is already ${value}`);
      record(id, 'ok', value);
      continue;
    }
    await cf('PATCH', `/zones/${zone.id}/settings/${id}`, { value });
    if (WRITE) done(`${id} = ${value}`);
    record(id, WRITE ? 'ok' : 'planned', value);
  }
}

// ---------------------------------------------------------------------------
// Step 4: the two commands this script will not run
// ---------------------------------------------------------------------------

function manualCommands(domain) {
  step(4, 'The two commands a human runs');

  // `wrangler email sending enable` is a BETA command. It writes SPF and DKIM
  // records under a cf-bounce subdomain and puts the account into an onboarding
  // flow that has no documented, stable REST equivalent. Wrapping a beta CLI in
  // a script that runs against a client's live mail domain would be trading a
  // command somebody reads for one they do not.
  let enabled = null;
  if (WRITE) {
    try {
      const out = execFileSync('npx', ['--no-install', 'wrangler', 'email', 'sending', 'list'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      });
      enabled = out.includes(domain);
      note(
        `wrangler email sending list: ${enabled ? 'this domain is already onboarded' : 'this domain is not listed'}`,
      );
    } catch (err) {
      warn(`could not run \`wrangler email sending list\`: ${String(err.message).split('\n')[0]}`);
    }
  } else {
    plan('check `npx wrangler email sending list` for this domain');
  }

  console.log('');
  if (enabled) {
    skip(`${domain} is already onboarded for Email Sending`);
  } else {
    console.log(`  1.  npx wrangler email sending enable ${domain}`);
    note('Onboards the domain for OUTBOUND mail: it writes SPF and DKIM under a');
    note('cf-bounce subdomain, so it coexists with Microsoft 365 or Google Workspace');
    note('on the same domain (Email ROUTING would not: it takes the apex MX).');
    note('Not run here because it is a beta command with no stable API behind it.');
  }
  console.log('');
  console.log(`  2.  npx sanity cors add https://${domain} --credentials`);
  note('Not run here because it needs the interactive Sanity login, not an API token.');
  note('Without it the embedded Studio at /' + 'studio loads and then fails every request');
  note('from the new origin, which looks like a broken build rather than a CORS entry.');
}

// ---------------------------------------------------------------------------
// Step 5: verify from outside
// ---------------------------------------------------------------------------

async function verify(domain) {
  step(5, 'Verify from outside');

  if (!VERIFY) {
    plan(`GET https://${domain} expecting 200 and the site's <title>`);
    plan(`GET https://www.${domain} expecting 301 to https://${domain}`);
    plan(`GET http://${domain} expecting 301 to https://${domain}`);
    plan(`resolve MX for ${domain} and confirm mail still answers from the new nameservers`);
    note('Not run: outside checks only happen with --write or --verify, so a dry run');
    note('against a domain that is not live yet does not print four red lines.');
    return;
  }

  // Apex.
  try {
    const res = await fetch(`https://${domain}`, { redirect: 'manual' });
    const html = res.ok ? await res.text() : '';
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim();
    if (res.status === 200 && title) record('https apex', 'ok', `200, "${title}"`);
    else record('https apex', 'fail', `${res.status}${title ? '' : ', no <title>'}`);
  } catch (err) {
    record('https apex', 'fail', err.message);
  }

  // www, and http. `redirect: manual` is the point: following the redirect
  // would report a healthy 200 for a zone with no redirect rule at all.
  for (const [label, url] of [
    ['www 301', `https://www.${domain}`],
    ['http 301', `http://${domain}`],
  ]) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const to = res.headers.get('location') || '';
      const ok = res.status === 301 && to.startsWith(`https://${domain}`);
      record(label, ok ? 'ok' : 'fail', `${res.status} -> ${to || 'no Location'}`);
    } catch (err) {
      record(label, 'fail', err.message);
    }
  }

  // MX, over DNS-over-HTTPS so the check does not depend on this machine's
  // resolver or its cache. THIS IS THE ONE THAT MATTERS on cutover day: the
  // website being wrong is visible in a second, mail being wrong is invisible
  // until somebody does not get an email.
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
      headers: { accept: 'application/dns-json' },
    });
    const data = await res.json();
    const mx = (data.Answer || []).filter((a) => a.type === 15).map((a) => a.data);
    record('MX', mx.length ? 'ok' : 'fail', mx.join(', ') || 'no MX answer');
  } catch (err) {
    record('MX', 'fail', err.message);
  }
}

// ---------------------------------------------------------------------------

function summary(domain, worker) {
  console.log(
    `\n${'='.repeat(72)}\nSUMMARY  ${domain}  ->  ${worker}  (${WRITE ? 'WRITE' : 'DRY RUN'})\n${'='.repeat(72)}`,
  );
  const w = Math.max(20, ...results.map((r) => r.check.length));
  console.log(`  ${'check'.padEnd(w)}  status    detail`);
  console.log(`  ${'-'.repeat(w)}  --------  ------`);
  for (const r of results)
    console.log(`  ${r.check.padEnd(w)}  ${r.status.padEnd(8)}  ${r.detail}`);
  if (!WRITE) console.log('\n  Nothing was changed. Re-run with --write to act on this plan.');
  return results.some((r) => r.status === 'fail') ? 1 : 0;
}

async function main() {
  const domain = readDomain();
  const worker = readWorkerName();

  console.log(`cutover: ${domain} -> Worker "${worker}"`);
  console.log(
    WRITE
      ? 'MODE: WRITE. This will change live state.'
      : 'MODE: DRY RUN. Nothing will be changed and nothing leaves this machine.',
  );
  if (!API_TOKEN) warn('CLOUDFLARE_API_TOKEN is not set; --write would fail.');
  if (!ACCOUNT_ID) warn('CLOUDFLARE_ACCOUNT_ID is not set; --write would fail.');

  const zone = await ensureZone(domain);
  await importZoneFile(zone, domain);
  await attachSite(zone, domain, worker);
  manualCommands(domain);
  await verify(domain);

  process.exitCode = summary(domain, worker);
}

main().catch((err) => {
  console.error(`\ncutover failed: ${err.message}`);
  process.exitCode = 1;
});
