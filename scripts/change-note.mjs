#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// change-note.mjs - the morning "What changed" note (PORTS.md card 114)
// =============================================================================
// Run by .github/workflows/change-note.yml once a day. It asks Sanity which
// documents were created, changed, published or moved to the Trash in the last
// 24 hours, and when anything did, opens (or updates) a GitHub issue titled
// "What changed on <date>". GitHub emails the repo's watchers about a new
// issue, so the owner gets a plain morning list without anyone wiring email.
// Quiet days post nothing.
//
// READ-ONLY against Sanity: a read token (SANITY_AUTH_TOKEN, the same one the
// backup workflow uses) is enough. It writes nothing to the dataset, ever.
//
// DEPENDENCY-FREE on purpose, like publish-due.mjs: global fetch only, so the
// job is checkout + setup-node + node, no `npm ci`. The one optional import is
// src/sanity/urls.ts (for the "Live page" links), loaded with Node's type
// stripping; if that ever fails the note simply has no live links.
//
//   node --experimental-strip-types scripts/change-note.mjs          # posts the issue
//   node --experimental-strip-types scripts/change-note.mjs --dry    # prints it only
//   ... --hours 72                                                  # a longer window
//
// Env: SANITY_AUTH_TOKEN, SANITY_PROJECT_ID (or PUBLIC_SANITY_PROJECT_ID in
// .env), SANITY_DATASET (default production), SITE_URL (default: astro.config
// `site:`), GITHUB_TOKEN + GITHUB_REPOSITORY (set by Actions; not needed with --dry).
// =============================================================================
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  authorsFromTransactions,
  buildChangeSummary,
  parseNdjson,
  publishedIdOf,
  siteFromAstroConfig,
  windowFor,
} from './lib/change-summary.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'v2025-02-19';
const DRY = process.argv.includes('--dry');
const hoursArg = process.argv.indexOf('--hours');
const HOURS = hoursArg > -1 ? Number(process.argv[hoursArg + 1]) || 24 : 24;

/** process.env first, then the root .env (for a local --dry run). */
function envOf(name) {
  if (process.env[name]) return process.env[name];
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) return undefined;
  const m = new RegExp(`^${name}=(.*)$`, 'm').exec(readFileSync(file, 'utf8'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

const token = envOf('SANITY_AUTH_TOKEN');
const projectId = envOf('SANITY_PROJECT_ID') || envOf('PUBLIC_SANITY_PROJECT_ID');
const dataset = envOf('SANITY_DATASET') || envOf('PUBLIC_SANITY_DATASET') || 'production';

if (!token || !projectId || !/^[a-z0-9]+$/i.test(projectId)) {
  console.error('change-note: SANITY_AUTH_TOKEN and SANITY_PROJECT_ID are both required.');
  process.exit(1);
}

const auth = { authorization: `Bearer ${token}` };
const dataBase = `https://${projectId}.api.sanity.io/${API}/data`;

/** A GROQ query against the raw perspective (drafts and published side by side). */
async function query(groq, params = {}) {
  const res = await fetch(`${dataBase}/query/${dataset}?perspective=raw`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ query: groq, params }),
  });
  if (!res.ok) throw new Error(`Sanity query answered ${res.status}`);
  return (await res.json()).result;
}

/** Newest author per id from the transaction history. Best-effort. */
async function authorsFor(ids, from, to) {
  const all = [];
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids
      .slice(i, i + 40)
      .map(encodeURIComponent)
      .join(',');
    const url =
      `${dataBase}/history/${dataset}/transactions/${batch}` +
      `?fromTime=${encodeURIComponent(from)}&toTime=${encodeURIComponent(to)}&excludeContent=true`;
    try {
      const res = await fetch(url, { headers: auth });
      if (!res.ok) {
        console.warn(`change-note: history answered ${res.status}; authors will read "Someone".`);
        continue;
      }
      all.push(...parseNdjson(await res.text()));
    } catch (err) {
      console.warn(`change-note: history failed (${err.message}).`);
    }
  }
  return authorsFromTransactions(all);
}

/** userId -> display name. A robot token may not be allowed to read users. */
async function namesFor(userIds) {
  if (userIds.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.sanity.io/${API}/projects/${projectId}/users/${userIds.map(encodeURIComponent).join(',')}`,
      { headers: auth },
    );
    if (!res.ok) return {};
    const body = await res.json();
    const list = Array.isArray(body) ? body : [body];
    return Object.fromEntries(
      list.filter((u) => u && u.id).map((u) => [u.id, u.displayName || u.givenName || 'Someone']),
    );
  } catch {
    return {};
  }
}

/** The live-path helper from the Studio, when Node can load it. */
async function loadPathFor() {
  try {
    const mod = await import(pathToFileURL(resolve(ROOT, 'src/sanity/urls.ts')).href);
    return typeof mod.pathForDoc === 'function' ? mod.pathForDoc : null;
  } catch {
    return null;
  }
}

function siteUrl() {
  const fromEnv = envOf('SITE_URL');
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  try {
    return siteFromAstroConfig(readFileSync(resolve(ROOT, 'astro.config.mjs'), 'utf8')) ?? '';
  } catch {
    return '';
  }
}

const GH = 'https://api.github.com';
function ghHeaders() {
  return {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'content-type': 'application/json',
  };
}

/** Open the issue, or update today's if a re-run already opened it. */
async function postIssue(title, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo)
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required to post.');
  const list = await fetch(`${GH}/repos/${repo}/issues?state=open&per_page=100`, {
    headers: ghHeaders(),
  });
  if (!list.ok) throw new Error(`GitHub issues list answered ${list.status}`);
  const existing = (await list.json()).find((i) => i.title === title && !i.pull_request);
  const res = existing
    ? await fetch(`${GH}/repos/${repo}/issues/${existing.number}`, {
        method: 'PATCH',
        headers: ghHeaders(),
        body: JSON.stringify({ body }),
      })
    : await fetch(`${GH}/repos/${repo}/issues`, {
        method: 'POST',
        headers: ghHeaders(),
        body: JSON.stringify({ title, body }),
      });
  if (!res.ok)
    throw new Error(`GitHub answered ${res.status} to the issue ${existing ? 'update' : 'create'}`);
  const issue = await res.json();
  console.log(`change-note: ${existing ? 'updated' : 'opened'} ${issue.html_url}`);
}

async function main() {
  const { from, to } = windowFor(new Date(), HOURS);

  const docs = await query(
    `*[_updatedAt > $from && _updatedAt <= $to && !(_id in path("_.**"))]{
      _id, _type, _createdAt, _updatedAt, title, name, heading, question, label, slug
    }`,
    { from, to },
  );
  const draftIds = docs.filter((d) => d._id.startsWith('drafts.')).map((d) => publishedIdOf(d._id));
  const publishedIds = draftIds.length ? await query(`*[_id in $ids]._id`, { ids: draftIds }) : [];
  const trashed = await query(
    `*[_type == "trashedItem" && _createdAt > $from && _createdAt <= $to]{
      _id, _createdAt, originalId, originalType, kind, title, deletedAt
    }`,
    { from, to },
  );

  const changedIds = [...new Set(docs.map((d) => d._id).concat(trashed.map((t) => t._id)))];
  const authors = await authorsFor(changedIds, from, to);
  // Trash rows: the author of the trashedItem write is the person who trashed it.
  for (const t of trashed) if (authors[t._id]) authors[t.originalId] = authors[t._id];
  const names = await namesFor([...new Set(Object.values(authors))]);

  const summary = buildChangeSummary({
    docs,
    publishedIds,
    trashed,
    from,
    to,
    authors,
    names,
    siteUrl: siteUrl(),
    pathFor: await loadPathFor(),
  });

  if (!summary) {
    console.log(`change-note: nothing changed between ${from} and ${to}. Posting nothing.`);
    return;
  }
  console.log(
    `change-note: ${summary.count} change(s).\n\n# ${summary.title}\n\n${summary.body}\n`,
  );
  if (DRY) {
    console.log('change-note: --dry, so no issue was posted.');
    return;
  }
  await postIssue(summary.title, summary.body);
}

main().catch((err) => {
  console.error(`change-note: ${err.message}`);
  process.exit(1);
});
