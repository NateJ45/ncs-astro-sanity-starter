// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// write-gate.mjs - dry by default, and a second factor on production writes
// =============================================================================
// For the scripts that build their own Sanity client instead of importing
// scripts/lib/sanity-lib.mjs (which carries the same guard; PORTS.md card 86),
// above all scripts/publish-due.mjs, which must stay dependency-free because
// its workflow runs without `npm ci`. This module imports node builtins only.
// From stonesteps-50k (2026-10-13), adopted in the starter by PORTS.md card 114.
//
// THE RULE. A script that can write to Sanity writes only when the run carries
// its write flag (`--apply`, or a script's own older flag such as `--write`)
// AND, on the `production` dataset, NCS_PRODUCTION_WRITE=yes is in the real
// process environment:
//
//   node scripts/x.mjs                                   # dry run, prints the plan
//   NCS_PRODUCTION_WRITE=yes node scripts/x.mjs --apply  # writes to production
//   (PowerShell: $env:NCS_PRODUCTION_WRITE='yes'; node scripts/x.mjs --apply;
//    Remove-Item Env:NCS_PRODUCTION_WRITE)
//
// A bare run is a dry run. `--dry-run` is still accepted and always wins.
//
// WHY THE ENVIRONMENT. Anything a command line can carry, an accident can carry
// too: on 2026-10-04 a backticked command inside a shell string ran, with its
// own --yes, against another site's production. The variable is read from
// process.env AS IT WAS WHEN THIS MODULE LOADED, before any `dotenv` call in the
// importing script can copy `.env` into process.env, and a `.env` that defines it
// is refused outright: if `.env` could hold it, it would be set once and the
// guard would be open for good. Import this module BEFORE `dotenv/config`.
//
// THE CI ALLOWANCE. An unattended scheduled job (publish-due.yml runs
// `publish-due.mjs --apply`) cannot have a person present, and its workflow
// file is reviewed code holding the token as a repo secret. So a script that
// opts in with `ci: true` may write in GitHub Actions without the variable, and
// `ciBare: true` keeps a bare run writing there too (for a site whose workflow
// predates the flag). Off Actions the full rule applies.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FACTOR_VAR = 'NCS_PRODUCTION_WRITE';

// Snapshot at module load, before the importing script's own body (and its
// dotenv call, when the import order is right) can touch process.env.
const FACTOR_AT_LOAD = process.env[FACTOR_VAR];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** True when the root .env names the variable at all. */
export function envFileDefinesFactor(root = ROOT) {
  const file = resolve(root, '.env');
  if (!existsSync(file)) return false;
  return new RegExp(`^\\s*(export\\s+)?${FACTOR_VAR}\\s*=`, 'm').test(readFileSync(file, 'utf8'));
}

/**
 * Pure: may this run write? Returns { write, refusal, via }.
 *   write    true only when every condition holds
 *   refusal  a message when the run asked to write and may not, else null
 *   via      'flag+factor' | 'non-production' | 'ci' when write is true
 */
export function decideWrite({
  argv,
  processEnv,
  dataset,
  factor,
  flag = '--apply',
  ci = false,
  ciBare = false,
  envFileHasFactor = false,
}) {
  if (argv.includes('--dry-run')) return { write: false, refusal: null };
  const inCI = ci && processEnv.GITHUB_ACTIONS === 'true';
  const asked = argv.includes(flag) || (inCI && ciBare);
  if (!asked) return { write: false, refusal: null };
  if (dataset !== 'production') return { write: true, refusal: null, via: 'non-production' };
  if (inCI) return { write: true, refusal: null, via: 'ci' };
  if (envFileHasFactor) {
    return {
      write: false,
      refusal: `Refusing to write: .env defines ${FACTOR_VAR}. Remove that line; the second factor must be set per command, never in .env.`,
    };
  }
  if (factor === 'yes') return { write: true, refusal: null, via: 'flag+factor' };
  return {
    write: false,
    refusal: [
      `Refusing to write: ${flag} targets the production dataset, and ${flag} alone is not enough.`,
      `Set ${FACTOR_VAR}=yes in the same command, after a backup and a dry run`,
      `(bash: ${FACTOR_VAR}=yes node <script> ${flag}). A delegated agent may set it only under the write protocol (backup, dry run, apply, verify).`,
      `Run without ${flag} to see the plan. PORTS.md card 86.`,
    ].join('\n'),
  };
}

/**
 * The call each script makes. Exits 2 on a refusal (before any request);
 * otherwise returns true when the run may write, false for a dry run, and
 * prints one line saying which.
 */
export function writeGate({
  dataset,
  flag = '--apply',
  ci = false,
  ciBare = false,
  quiet = false,
}) {
  const decision = decideWrite({
    argv: process.argv.slice(2),
    processEnv: process.env,
    dataset,
    factor: FACTOR_AT_LOAD,
    flag,
    ci,
    ciBare,
    envFileHasFactor: envFileDefinesFactor(),
  });
  if (decision.refusal) {
    console.error(decision.refusal);
    process.exit(2);
  }
  if (!quiet) {
    console.log(
      decision.write
        ? `WRITE to ${dataset} (${decision.via}).`
        : `DRY RUN on ${dataset}: nothing will be written. To write: ${FACTOR_VAR}=yes node <script> ${flag}`,
    );
  }
  return decision.write;
}

// --- a client that only pretends to write --------------------------------------
// For scripts whose writes are scattered (seeds, uploads): wrap the client once
// and every write method logs what it would do instead. Reads pass through.

const short = (v) => {
  const s = JSON.stringify(v);
  return s && s.length > 90 ? s.slice(0, 87) + '...' : s;
};

function dryPatch(id, log, ops = []) {
  const p = new Proxy(
    {},
    {
      get(_, k) {
        if (k === 'then') return undefined;
        if (k === '__dryOps') return { id, ops };
        if (k === 'commit') {
          return async () => {
            log(`patch ${id}: ${ops.join(', ') || '(no ops)'}`);
            return { _id: id, results: [], transactionId: 'dry-run' };
          };
        }
        return (...a) => {
          ops.push(`${String(k)}(${a.map(short).join(', ')})`);
          return p;
        };
      },
    },
  );
  return p;
}

function dryTransaction(log) {
  const lines = [];
  const tx = {
    create: (d) => (lines.push(`create ${d._id ?? d._type}`), tx),
    createOrReplace: (d) => (lines.push(`createOrReplace ${d._id}`), tx),
    createIfNotExists: (d) => (lines.push(`createIfNotExists ${d._id}`), tx),
    delete: (id) => (lines.push(`delete ${typeof id === 'string' ? id : short(id)}`), tx),
    patch: (idOrPatch, fn) => {
      if (typeof idOrPatch === 'string') {
        const p = dryPatch(idOrPatch, log);
        if (typeof fn === 'function') fn(p);
        else if (fn) p.set?.(fn);
        const { id, ops } = p.__dryOps;
        lines.push(`patch ${id}: ${ops.join(', ')}`);
      } else {
        const d = idOrPatch?.__dryOps;
        lines.push(d ? `patch ${d.id}: ${d.ops.join(', ')}` : `patch ${short(idOrPatch)}`);
      }
      return tx;
    },
    commit: async () => {
      log(`transaction of ${lines.length}:`);
      for (const l of lines) log(`  ${l}`);
      return { results: [], transactionId: 'dry-run', documentIds: [] };
    },
  };
  return tx;
}

/** Return `client` unchanged when `write`, else a copy whose writes only log. */
export function gateClient(client, write, log = (s) => console.log(`DRY ${s}`)) {
  if (write) return client;
  const writes = {
    create: async (d) => (log(`create ${d._id ?? d._type}`), d),
    createOrReplace: async (d) => (log(`createOrReplace ${d._id}`), d),
    createIfNotExists: async (d) => (log(`createIfNotExists ${d._id}`), d),
    delete: async (id) => (log(`delete ${typeof id === 'string' ? id : short(id)}`), {}),
    mutate: async (m) => (log(`mutate ${short(m)}`), { results: [] }),
    patch: (id) => dryPatch(typeof id === 'string' ? id : short(id), log),
    transaction: () => dryTransaction(log),
  };
  const assets = new Proxy(client.assets, {
    get(target, k) {
      if (k === 'upload') {
        return async (kind, _body, opts = {}) => {
          const name = opts.filename ?? 'file';
          log(`upload ${kind} ${name}`);
          return { _id: `${kind}-dry-run-${name}`, _type: `sanity.${kind}Asset`, url: '' };
        };
      }
      const v = target[k];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  return new Proxy(client, {
    get(target, k) {
      if (k in writes) return writes[k];
      if (k === 'assets') return assets;
      const v = target[k];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
