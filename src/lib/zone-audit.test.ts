// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// zone-audit - reading a registrar's zone export before importing it
// =============================================================================
// The logic under test runs ONCE PER CLIENT, on the single irreversible day the
// nameservers move, usually at speed, usually with the client watching. There is
// no second chance to notice that the SPF merge dropped a mechanism or that the
// DKIM strip ate a character. So the rule that decides what follows a domain to
// Cloudflare is a pure module and it is tested here.
//
// Every case below is a fault that was actually present in one real GoDaddy
// export (stonesteps50k.com, 2026-09-18). The fixture it reads is
// scripts/fixtures/godaddy-zone-export.txt.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseZoneFile,
  auditZone,
  renderZoneFile,
  mergeSpf,
  spfIncludes,
  detectMailProvider,
} from '../../scripts/lib/zone-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = readFileSync(resolve(root, 'scripts/fixtures/godaddy-zone-export.txt'), 'utf8');
const DOMAIN = 'example-client.com';

const codes = (a: ReturnType<typeof auditZone>) => a.findings.map((f) => f.code);
const audited = () => auditZone(parseZoneFile(FIXTURE), { domain: DOMAIN });

// ---- parsing ---------------------------------------------------------------

test('comments, $ORIGIN and $TTL are not records', () => {
  const records = parseZoneFile(FIXTURE);
  assert.ok(records.length > 0);
  assert.ok(!records.some((r) => r.name.startsWith(';') || r.name.startsWith('$')));
});

test('MX preference is read as a preference, not as part of the target', () => {
  const mx = parseZoneFile(FIXTURE).find((r) => r.type === 'MX');
  assert.equal(mx?.priority, 0);
  assert.equal(mx?.value, 'example-client-com.mail.protection.outlook.com.');
});

test('a quoted TXT value keeps its interior bytes, including leading whitespace', () => {
  const dkim = parseZoneFile(FIXTURE).find((r) => r.name === 'selector1._domainkey');
  assert.ok(dkim);
  assert.match(dkim!.value, /^\s/, 'the fixture DKIM value starts with a tab and a space');
  assert.ok(dkim!.value.includes('k=rsa'));
});

test('an omitted owner name inherits the previous one', () => {
  const records = parseZoneFile(['@\t3600\tIN\tTXT\t"one"', '\t3600\tIN\tTXT\t"two"'].join('\n'));
  assert.deepEqual(
    records.map((r) => [r.name, r.value]),
    [
      ['@', 'one'],
      ['@', 'two'],
    ],
  );
});

// ---- SPF -------------------------------------------------------------------

test('two SPF records on the apex is an error, not a warning', () => {
  const a = audited();
  const f = a.findings.find((x) => x.code === 'spf-multiple');
  assert.ok(f, 'expected spf-multiple');
  assert.equal(f!.level, 'error');
  assert.equal(f!.values?.length, 2);
});

test('an SPF that names no include for the MX provider it can see is an error', () => {
  const a = audited();
  const f = a.findings.find((x) => x.code === 'spf-missing-provider-include');
  assert.ok(f);
  assert.equal(f!.level, 'error');
  assert.match(f!.message, /spf\.protection\.outlook\.com/);
});

test('the merge keeps every include and adds the provider first', () => {
  const merged = mergeSpf(
    ['v=spf1 include:secureserver.net -all', 'v=spf1 include:example-esp.net ~all'],
    'spf.protection.outlook.com',
  );
  assert.deepEqual(spfIncludes(merged), [
    'spf.protection.outlook.com',
    'secureserver.net',
    'example-esp.net',
  ]);
});

test('the merge takes the STRICTEST qualifier, so a merge never loosens a policy', () => {
  assert.match(mergeSpf(['v=spf1 include:a -all', 'v=spf1 include:b ~all']), /-all$/);
  assert.match(mergeSpf(['v=spf1 include:a ~all', 'v=spf1 include:b ~all']), /~all$/);
});

test('merging is idempotent and does not duplicate a provider include already present', () => {
  const once = mergeSpf(
    ['v=spf1 include:spf.protection.outlook.com -all'],
    'spf.protection.outlook.com',
  );
  const twice = mergeSpf([once], 'spf.protection.outlook.com');
  assert.equal(once, twice);
  assert.equal(spfIncludes(twice).length, 1);
});

test('non-include mechanisms (ip4, a, mx) survive the merge', () => {
  const merged = mergeSpf(['v=spf1 ip4:203.0.113.0/24 a mx include:x.example -all'], null);
  for (const token of ['ip4:203.0.113.0/24', 'a', 'mx', 'include:x.example', '-all']) {
    assert.ok(merged.split(' ').includes(token), `${token} missing from ${merged}`);
  }
});

test('exactly one SPF record survives the audit, and it is the merged one', () => {
  const a = audited();
  const kept = a.plan.filter(
    (p) => p.action !== 'skip' && p.record.type === 'TXT' && /^\s*v=spf1/i.test(p.record.value),
  );
  assert.equal(kept.length, 1);
  assert.match(kept[0].value!, /include:spf\.protection\.outlook\.com/);
});

// ---- DKIM ------------------------------------------------------------------

test('a DKIM value with leading whitespace is an error and is rewritten, not dropped', () => {
  const a = audited();
  assert.ok(codes(a).includes('dkim-leading-whitespace'));
  const step = a.plan.find((p) => p.record.name === 'selector1._domainkey');
  assert.equal(step?.action, 'rewrite');
  assert.match(step!.value!, /^k=rsa;/);
  assert.ok(step!.value!.includes('p=MIGf'), 'the key material itself is untouched');
});

// ---- the old host ----------------------------------------------------------

test('the apex A and www are left out because the Worker custom domains make their own', () => {
  const a = audited();
  assert.ok(codes(a).includes('apex-a-left-out'));
  assert.ok(codes(a).includes('www-left-out'));
  for (const name of ['@', 'www']) {
    const steps = a.plan.filter(
      (p) => p.record.name === name && p.record.type !== 'TXT' && p.record.type !== 'MX',
    );
    assert.ok(
      steps.every((s) => s.action === 'skip'),
      `${name} should not be imported`,
    );
  }
});

test('_acme-challenge, ftp and staging are left behind with the old host', () => {
  const a = audited();
  for (const name of ['_acme-challenge', 'ftp', 'staging']) {
    const step = a.plan.find((p) => p.record.name === name);
    assert.equal(step?.action, 'skip', `${name} should be skipped`);
    assert.equal(step?.reason, 'points at the old host');
  }
});

test('_domainconnect is registrar cruft', () => {
  const a = audited();
  assert.equal(a.plan.find((p) => p.record.name === '_domainconnect')?.action, 'skip');
  assert.ok(codes(a).includes('registrar-cruft'));
});

// ---- the GoDaddy Workspace names, and the one that must NOT be dropped ------

test('GoDaddy Workspace email names are dropped when the MX is elsewhere', () => {
  const a = audited();
  for (const name of ['email', 'imap', 'pop', 'smtp', 'mail', 'webmail', 'mobilemail']) {
    assert.equal(
      a.plan.find((p) => p.record.name === name)?.action,
      'skip',
      `${name} should be skipped`,
    );
  }
});

test('autodiscover pointing at OUTLOOK is kept, because the new provider needs it', () => {
  // The bug this guards: a name-only rule drops `autodiscover` as GoDaddy cruft
  // and takes Microsoft 365's own record with it, which breaks mail client
  // setup for everyone on the domain.
  const a = audited();
  const step = a.plan.find((p) => p.record.name === 'autodiscover');
  assert.equal(step?.action, 'import');
});

test('the same names ARE kept when GoDaddy is still the mail provider', () => {
  const zone = [
    '@\t3600\tIN\tMX\t0\tmailstore1.secureserver.net.',
    'imap\t3600\tIN\tCNAME\timap.secureserver.net.',
  ].join('\n');
  const a = auditZone(parseZoneFile(zone), { domain: DOMAIN });
  assert.equal(a.provider, 'godaddy');
  assert.equal(a.plan.find((p) => p.record.name === 'imap')?.action, 'import');
});

// ---- what survives ---------------------------------------------------------

test('mail, DMARC, domain verification, the delegated DKIM CNAME and SRV all carry over', () => {
  const a = audited();
  for (const name of ['_dmarc', 'api._domainkey', 'pay', '_sip._tls']) {
    assert.equal(
      a.plan.find((p) => p.record.name === name)?.action,
      'import',
      `${name} should import`,
    );
  }
  assert.equal(a.plan.find((p) => p.record.type === 'MX')?.action, 'import');
  const ms = a.plan.find((p) => p.record.value.startsWith('MS='));
  assert.equal(ms?.action, 'import');
});

test('NS and SOA are never imported: Cloudflare writes its own', () => {
  const a = auditZone(parseZoneFile(['@\t3600\tIN\tNS\tns13.domaincontrol.com.'].join('\n')), {
    domain: DOMAIN,
  });
  assert.equal(a.plan[0].action, 'skip');
});

test('the mail provider is detected from the MX, not guessed from the domain', () => {
  assert.equal(detectMailProvider(parseZoneFile(FIXTURE))?.id, 'microsoft365');
  assert.equal(
    detectMailProvider(parseZoneFile('@\t1\tIN\tMX\t1\taspmx.l.google.com.'))?.id,
    'google',
  );
  assert.equal(detectMailProvider(parseZoneFile('@\t1\tIN\tA\t203.0.113.1')), null);
});

// ---- the cleaned file ------------------------------------------------------

test('the cleaned file keeps every dropped record as a comment, for the record', () => {
  const text = renderZoneFile(audited());
  assert.match(text, /^; LEFT OUT \(points at the old host\): ftp\b/m);
  assert.ok(!/^ftp\t/m.test(text), 'ftp must not be an active line');
});

test('the cleaned file re-parses to exactly what the audit said it would import', () => {
  // The round trip is the point: what gets POSTed to Cloudflare has to be the
  // plan, not an approximation of it.
  const a = audited();
  const reparsed = parseZoneFile(renderZoneFile(a));
  assert.equal(reparsed.length, a.counts.import + a.counts.rewrite);
  const dkim = reparsed.find((r) => r.name === 'selector1._domainkey');
  assert.match(dkim!.value, /^k=rsa;/);
  assert.equal(reparsed.filter((r) => /^v=spf1/.test(r.value)).length, 1);
});

test('a long TXT value is split into resolver-legal chunks that rejoin unchanged', () => {
  const long = 'k=rsa; p=' + 'A'.repeat(600);
  const a = auditZone(parseZoneFile(`sel._domainkey\t3600\tIN\tTXT\t"${long}"`), {
    domain: DOMAIN,
  });
  const text = renderZoneFile(a);
  assert.ok(text.includes('" "'), 'expected the value to be chunked');
  assert.equal(parseZoneFile(text)[0].value, long);
});

test('a clean zone produces no errors and imports everything', () => {
  const zone = [
    '@\t3600\tIN\tMX\t0\texample-client-com.mail.protection.outlook.com.',
    '@\t3600\tIN\tTXT\t"v=spf1 include:spf.protection.outlook.com -all"',
    '_dmarc\t3600\tIN\tTXT\t"v=DMARC1; p=none;"',
  ].join('\n');
  const a = auditZone(parseZoneFile(zone), { domain: DOMAIN });
  assert.equal(
    a.findings.filter((f) => f.level === 'error').length,
    0,
    JSON.stringify(a.findings, null, 2),
  );
  assert.equal(a.counts.import, 3);
  assert.equal(a.counts.skip, 0);
});
