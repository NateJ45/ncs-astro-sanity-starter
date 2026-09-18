// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/lib/zone-audit.mjs
//
// Added 2026-09-18, out of the stonesteps50k.com cutover from GoDaddy to
// Cloudflare.
//
// WHY THIS IS A MODULE AND NOT A FEW LINES INSIDE cutover.mjs. A registrar's
// zone export is the only picture anyone has of a client's mail setup, and it
// is read exactly once: on the day the nameservers move. If something in it is
// wrong, importing it faithfully carries the fault onto the new nameservers and
// nobody finds out until a customer says an email never arrived. Every check
// below is a fault that one real export actually contained, so the rule is:
// read the zone, say what is wrong with it out loud, and import a CLEANED copy.
//
// It is also a pure module so it can be unit tested (src/lib/zone-audit.test.ts).
// A rule that runs once per client, on the one irreversible day of that client's
// project, is exactly the rule nobody notices is wrong.
//
// Nothing here touches the network or the filesystem. cutover.mjs does the I/O.

/**
 * Mail providers we can recognise from an MX target, and the SPF include each
 * one requires. An SPF record that authorises nothing the actual sender uses is
 * worse than no SPF at all: it publishes a policy that fails your own mail.
 */
const MAIL_PROVIDERS = [
  {
    id: 'microsoft365',
    label: 'Microsoft 365',
    mx: /\.protection\.outlook\.com\.?$/i,
    include: 'spf.protection.outlook.com',
  },
  {
    id: 'google',
    label: 'Google Workspace',
    mx: /(^|\.)(aspmx\.l\.google\.com|googlemail\.com)\.?$/i,
    include: '_spf.google.com',
  },
  {
    id: 'godaddy',
    label: 'GoDaddy / Secureserver',
    mx: /secureserver\.net\.?$/i,
    include: 'secureserver.net',
  },
  { id: 'zoho', label: 'Zoho Mail', mx: /zoho(\.eu|\.com)?\.?$/i, include: 'zoho.com' },
  {
    id: 'fastmail',
    label: 'Fastmail',
    mx: /messagingengine\.com\.?$/i,
    include: 'spf.messagingengine.com',
  },
];

/**
 * Names that belonged to the OLD host and must not follow the domain over.
 * The apex A and www are handled separately: they are not wrong, they are
 * simply replaced by the Worker's own custom domains.
 */
const OLD_HOST_NAMES = new Set([
  'ftp',
  'staging',
  'stage',
  'dev',
  'cpanel',
  'webmail-old',
  '_acme-challenge',
]);

/**
 * GoDaddy Workspace Email's hostnames. GoDaddy writes these into every zone it
 * hosts whether or not the customer ever used its mail, so they survive a move
 * to Microsoft 365 and then sit in the new zone pointing at a mailbox that does
 * not exist.
 *
 * TWO CONDITIONS, NOT ONE, and the second is the one that keeps this honest:
 * the MX must say mail lives somewhere else AND the record must actually point
 * at secureserver.net. Microsoft 365 wants an `autodiscover` CNAME of its own,
 * and a name-only rule would have thrown away a record the new provider needs.
 */
const GODADDY_MAIL_NAMES = new Set([
  'email',
  'imap',
  'pop',
  'smtp',
  'mail',
  'webmail',
  'autodiscover',
  'mobilemail',
  'e',
]);

/** Registrar plumbing that means nothing once the zone is on Cloudflare. */
const REGISTRAR_CRUFT = new Set(['_domainconnect']);

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a BIND-format zone export (the shape GoDaddy's "Export zone file"
 * button produces) into records.
 *
 * Deliberately tolerant rather than a real BIND parser: a registrar export is
 * flat, one record per line, no $INCLUDE, no multi-line parentheses. The two
 * things it DOES do that a naive split gets wrong are an omitted owner name
 * (the line starts with whitespace and inherits the previous name) and quoted
 * TXT values containing spaces, so both are handled.
 *
 * @param {string} text
 * @returns {import('./zone-audit.d.mts').ZoneRecord[]}
 */
export function parseZoneFile(text) {
  const records = [];
  let lastName = '@';

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith(';')) continue;
    if (line.trim().startsWith('$')) continue; // $ORIGIN / $TTL

    // An owner name is present only when the line does not start with space.
    const inherits = /^\s/.test(line);
    const parts = line.trim().split(/\s+/);
    let i = 0;

    const name = inherits ? lastName : parts[i++];
    lastName = name;

    // TTL and class arrive in either order, and either may be absent.
    let ttl = null;
    let cls = 'IN';
    for (let guard = 0; guard < 2 && i < parts.length; guard++) {
      if (/^\d+$/.test(parts[i])) ttl = Number(parts[i++]);
      else if (/^(IN|CH|HS)$/i.test(parts[i])) cls = parts[i++].toUpperCase();
      else break;
    }

    const type = (parts[i++] || '').toUpperCase();
    if (!type) continue;

    // MX, SRV and friends put numbers before the target.
    let priority = null;
    if ((type === 'MX' || type === 'SRV') && /^\d+$/.test(parts[i] || ''))
      priority = Number(parts[i++]);

    const rest = parts.slice(i).join(' ');
    // A quoted TXT value keeps its interior EXACTLY, including the leading
    // whitespace this module exists partly to catch. Concatenate the chunks the
    // way a resolver does rather than trimming them.
    const value = /^"/.test(rest) ? unquote(rest) : rest;

    records.push({ name, ttl, class: cls, type, priority, value, line: line.trim() });
  }

  return records;
}

/** Join the contents of one or more quoted strings, keeping every inner byte. */
function unquote(rest) {
  const chunks = rest.match(/"((?:[^"\\]|\\.)*)"/g);
  if (!chunks) return rest;
  return chunks.map((c) => c.slice(1, -1)).join('');
}

/** Is this record on the zone apex? Exports spell it `@` or the bare domain. */
function isApex(record, domain) {
  const n = record.name.replace(/\.$/, '').toLowerCase();
  return n === '@' || n === '' || (!!domain && n === domain.toLowerCase());
}

/** The label under the apex, e.g. `www` for `www.example.com.` */
function shortName(record, domain) {
  const n = record.name.replace(/\.$/, '').toLowerCase();
  if (isApex(record, domain)) return '@';
  if (domain && n.endsWith('.' + domain.toLowerCase())) return n.slice(0, -(domain.length + 1));
  return n;
}

// ---------------------------------------------------------------------------
// SPF
// ---------------------------------------------------------------------------

/** Every `include:` in an SPF string, in order. */
export function spfIncludes(value) {
  return [...String(value).matchAll(/\binclude:(\S+)/gi)].map((m) =>
    m[1].replace(/\.$/, '').toLowerCase(),
  );
}

/**
 * Merge several SPF records into the single one RFC 7208 allows, and make sure
 * it names the provider that actually sends the mail.
 *
 * The qualifier is the strictest one present, because a merge is the moment to
 * keep a policy rather than quietly loosen it: `-all` wins over `~all`.
 *
 * @param {string[]} values
 * @param {string|null} requiredInclude
 * @returns {string}
 */
export function mergeSpf(values, requiredInclude = null) {
  const includes = [];
  const extras = [];
  let qualifier = '~all';

  for (const v of values) {
    for (const inc of spfIncludes(v)) if (!includes.includes(inc)) includes.push(inc);
    for (const token of String(v).trim().split(/\s+/)) {
      if (/^v=spf1$/i.test(token) || /^include:/i.test(token)) continue;
      if (/all$/i.test(token)) {
        if (/^-all$/i.test(token)) qualifier = '-all';
        else if (qualifier !== '-all') qualifier = token.toLowerCase();
        continue;
      }
      if (!extras.includes(token)) extras.push(token);
    }
  }

  // The provider include goes FIRST: SPF evaluation stops at the first match,
  // and the sender that actually sends should not be behind two lookups it does
  // not need. The 10-lookup limit is real and merged records get close to it.
  if (requiredInclude && !includes.includes(requiredInclude.toLowerCase())) {
    includes.unshift(requiredInclude.toLowerCase());
  }

  return ['v=spf1', ...includes.map((i) => `include:${i}`), ...extras, qualifier].join(' ');
}

/** Which of the known providers this zone's MX records point at, if any. */
export function detectMailProvider(records) {
  for (const r of records) {
    if (r.type !== 'MX') continue;
    for (const p of MAIL_PROVIDERS) if (p.mx.test(r.value.trim())) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

/**
 * Read a parsed zone and decide, per record, whether it follows the domain to
 * Cloudflare. Returns findings for a human plus a machine-readable plan.
 *
 * Every finding carries `code` so a caller can assert on it without matching
 * prose, and `level`: `error` is "this is invalid or points at a host that is
 * going away", `warn` is "almost certainly not wanted", `info` is "correct, and
 * being left out on purpose".
 *
 * @param {import('./zone-audit.d.mts').ZoneRecord[]} records
 * @param {{ domain?: string }} [options]
 * @returns {import('./zone-audit.d.mts').ZoneAudit}
 */
export function auditZone(records, options = {}) {
  const domain = (options.domain || '').replace(/\.$/, '');
  const findings = [];
  const plan = [];

  const provider = detectMailProvider(records);
  if (provider) {
    findings.push({
      level: 'info',
      code: 'mail-provider',
      message: `Mail is on ${provider.label} (from the MX records). SPF must include ${provider.include}.`,
    });
  } else if (records.some((r) => r.type === 'MX')) {
    findings.push({
      level: 'warn',
      code: 'mail-provider-unknown',
      message:
        'The MX records point at a provider this audit does not recognise. Check the SPF by hand.',
    });
  }

  // ---- SPF ---------------------------------------------------------------
  const apexSpf = records.filter(
    (r) => r.type === 'TXT' && isApex(r, domain) && /^\s*v=spf1\b/i.test(r.value),
  );

  let mergedSpf = null;
  if (apexSpf.length > 1) {
    findings.push({
      level: 'error',
      code: 'spf-multiple',
      message: `${apexSpf.length} SPF records on the apex. RFC 7208 section 3.2 makes that a permerror, so every SPF check on this domain fails. Merged into one.`,
      values: apexSpf.map((r) => r.value),
    });
  }
  if (apexSpf.length > 0) {
    const named = new Set(apexSpf.flatMap((r) => spfIncludes(r.value)));
    if (provider && !named.has(provider.include)) {
      findings.push({
        level: 'error',
        code: 'spf-missing-provider-include',
        message: `No SPF record includes ${provider.include}, but ${provider.label} is what sends this domain's mail. Added.`,
      });
    }
    if (apexSpf.length > 1 || (provider && !named.has(provider.include))) {
      mergedSpf = mergeSpf(
        apexSpf.map((r) => r.value),
        provider ? provider.include : null,
      );
    }
  } else if (provider) {
    findings.push({
      level: 'warn',
      code: 'spf-absent',
      message: `No SPF record at all, with mail on ${provider.label}. Consider adding "v=spf1 include:${provider.include} ~all".`,
    });
  }

  // ---- per-record decisions ---------------------------------------------
  let spfKept = false;

  for (const record of records) {
    const short = shortName(record, domain);
    const apex = isApex(record, domain);

    // SOA and NS belong to whoever runs the zone. Cloudflare writes its own.
    if (record.type === 'SOA' || record.type === 'NS') {
      plan.push({ record, action: 'skip', reason: 'Cloudflare writes its own SOA and NS records' });
      continue;
    }

    // The Worker's custom domains create the apex and www themselves, with
    // their own certificates. Importing an A or CNAME for either would collide
    // with that and, worse, could answer from the old host in the window before
    // the custom domain attaches.
    if (apex && (record.type === 'A' || record.type === 'AAAA')) {
      findings.push({
        level: 'info',
        code: 'apex-a-left-out',
        message: `Apex ${record.type} ${record.value} is the old host. Left out: the Worker custom domain creates the apex record itself.`,
      });
      plan.push({
        record,
        action: 'skip',
        reason: 'the Worker custom domain creates the apex record',
      });
      continue;
    }
    if (
      short === 'www' &&
      (record.type === 'A' || record.type === 'AAAA' || record.type === 'CNAME')
    ) {
      findings.push({
        level: 'info',
        code: 'www-left-out',
        message: `www ${record.type} ${record.value} left out: the Worker custom domain creates www itself, and a 301 sends it to the apex.`,
      });
      plan.push({ record, action: 'skip', reason: 'the Worker custom domain creates www' });
      continue;
    }

    if (OLD_HOST_NAMES.has(short)) {
      findings.push({
        level: 'warn',
        code: 'old-host-record',
        message: `${short} ${record.type} ${record.value} belongs to the host being left behind. Left out.`,
      });
      plan.push({ record, action: 'skip', reason: 'points at the old host' });
      continue;
    }

    if (REGISTRAR_CRUFT.has(short)) {
      findings.push({
        level: 'warn',
        code: 'registrar-cruft',
        message: `${short} ${record.type} is registrar plumbing (Domain Connect) and means nothing on Cloudflare. Left out.`,
      });
      plan.push({ record, action: 'skip', reason: 'registrar-only record' });
      continue;
    }

    if (
      GODADDY_MAIL_NAMES.has(short) &&
      (record.type === 'CNAME' || record.type === 'A') &&
      /secureserver\.net\.?$/i.test(record.value.trim()) &&
      provider &&
      provider.id !== 'godaddy'
    ) {
      findings.push({
        level: 'warn',
        code: 'stale-webmail-record',
        message: `${short} ${record.type} ${record.value} is GoDaddy Workspace Email, but mail is on ${provider.label}. Left out.`,
      });
      plan.push({
        record,
        action: 'skip',
        reason: `mail is on ${provider.label}, not GoDaddy Workspace`,
      });
      continue;
    }

    // DKIM values are long base64 pasted by hand into a registrar's form, and a
    // leading tab or space inside the quotes travels with them. Most resolvers
    // hand the value back byte for byte, so the verifier reads a key that does
    // not parse and every signature fails "permerror" with a record that looks
    // right in every UI.
    if (record.type === 'TXT' && /_domainkey/i.test(record.name) && /^\s/.test(record.value)) {
      findings.push({
        level: 'error',
        code: 'dkim-leading-whitespace',
        message: `${record.name} DKIM value starts with whitespace (${JSON.stringify(record.value.slice(0, 8))}...). Stripped.`,
      });
      plan.push({
        record,
        action: 'rewrite',
        reason: 'leading whitespace stripped from the DKIM value',
        value: record.value.replace(/^\s+/, ''),
      });
      continue;
    }

    if (record.type === 'TXT' && apex && /^\s*v=spf1\b/i.test(record.value)) {
      if (mergedSpf) {
        if (spfKept) {
          plan.push({ record, action: 'skip', reason: 'merged into the single SPF record above' });
        } else {
          spfKept = true;
          plan.push({
            record,
            action: 'rewrite',
            reason: 'the merged SPF record',
            value: mergedSpf,
          });
        }
        continue;
      }
    }

    plan.push({ record, action: 'import', reason: 'carried over unchanged' });
  }

  const counts = {
    import: plan.filter((p) => p.action === 'import').length,
    rewrite: plan.filter((p) => p.action === 'rewrite').length,
    skip: plan.filter((p) => p.action === 'skip').length,
  };

  return { domain, provider: provider ? provider.id : null, findings, plan, counts };
}

// ---------------------------------------------------------------------------
// Rendering the cleaned file
// ---------------------------------------------------------------------------

/**
 * Turn an audit back into a BIND file for `POST /zones/{id}/dns_records/import`.
 *
 * The cleaned file is written next to the original and kept. It is the record
 * of what was actually imported, and on the one day a client's mail misbehaves
 * after a move, the difference between the two files is the first thing anyone
 * wants to read.
 *
 * @param {import('./zone-audit.d.mts').ZoneAudit} audit
 * @param {{ header?: string }} [options]
 * @returns {string}
 */
export function renderZoneFile(audit, options = {}) {
  const out = [];
  if (options.header) for (const l of options.header.split('\n')) out.push(`; ${l}`);
  out.push(
    `; Cleaned by scripts/cutover.mjs. ${audit.counts.import} carried over, ` +
      `${audit.counts.rewrite} rewritten, ${audit.counts.skip} left out.`,
  );
  out.push(';');

  for (const step of audit.plan) {
    if (step.action === 'skip') {
      out.push(`; LEFT OUT (${step.reason}): ${step.record.line}`);
      continue;
    }
    const r = step.record;
    const value = step.action === 'rewrite' ? step.value : r.value;
    const ttl = r.ttl ?? 3600;
    const prefix = `${r.name}\t${ttl}\tIN\t${r.type}`;
    const body =
      r.priority !== null && r.priority !== undefined
        ? `${r.priority}\t${quoteIfNeeded(r.type, value)}`
        : quoteIfNeeded(r.type, value);
    if (step.action === 'rewrite') out.push(`; REWRITTEN (${step.reason})`);
    out.push(`${prefix}\t${body}`);
  }

  return out.join('\n') + '\n';
}

/** TXT values are quoted; everything else is a bare token. */
function quoteIfNeeded(type, value) {
  if (type !== 'TXT' && type !== 'SPF') return value;
  // A string longer than 255 bytes has to be split into chunks a resolver
  // rejoins, which is the normal shape of a long DKIM key.
  const chunks = String(value).match(/.{1,255}/gs) || [''];
  return chunks.map((c) => `"${c.replace(/(["\\])/g, '\\$1')}"`).join(' ');
}
