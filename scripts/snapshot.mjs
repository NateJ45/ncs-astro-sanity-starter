#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// snapshot.mjs - CI builds from a pinned copy of the content, not the live site
// =============================================================================
// WHY THIS EXISTS (PORTS.md card 138, 2026-10-19)
//
// A client edits their site in the Studio whenever they like: renames a page,
// retitles it, moves a nav item, adds or removes a page. CI used to build from
// the LIVE dataset, and tests name pages (`/staff`), so the day the church
// renamed Staff to Ministers, build, test, the e2e shards and the link check all
// went red on a docs-only PR. A client edit must never turn CI red or block a
// merge or a deploy. So CI no longer reads live content at all:
//
//   export   write the published documents to ci/sanity-snapshot.ndjson.gz
//            (read-only against Sanity; run it deliberately, commit the result)
//   serve    answer Sanity's query API (/v<ver>/data/query/<dataset>) from that
//            file with groq-js, on 127.0.0.1
//   run      start `serve` on a free port, set SANITY_SNAPSHOT_URL, run the
//            command that follows `--`, stop the server, exit with its code
//
//   node scripts/snapshot.mjs export
//   node scripts/snapshot.mjs run -- npm run build
//   node scripts/snapshot.mjs serve --port 4399
//
// Every build-time Sanity read goes through a client that spreads
// `snapshotClientOptions(env)`: with SANITY_SNAPSHOT_URL unset it adds nothing
// (production builds, local dev and scripts read the live dataset as before);
// with it set the client talks to the local server and carries no token.
//
// Images and files stay on cdn.sanity.io (their URLs are in the snapshot's asset
// documents); only the DOCUMENT reads are pinned. The snapshot is the published
// perspective, the same thing a production build reads. The dataset is already
// public (see public-data-audit.mjs), so committing the snapshot exposes nothing
// new; `export` still refuses the policy's blockedTypes.
//
// Refreshing the snapshot is a deliberate act: it is when the content moved, so
// it is the moment tests that name a page are updated, in a PR that is ours.
// Deploys (`deploy.yml`) never use it: production always builds live.
// =============================================================================
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SNAPSHOT_FILE = 'ci/sanity-snapshot.ndjson.gz';

/**
 * Pure. Options to spread into `createClient({...})` so it reads from the local
 * snapshot server. Empty when `env.SANITY_SNAPSHOT_URL` is unset or blank.
 * @param {Record<string, string | undefined>} env
 */
export function snapshotClientOptions(env) {
  const url = (env?.SANITY_SNAPSHOT_URL ?? '').trim();
  if (!url) return {};
  return { apiHost: url, useProjectHostname: false, useCdn: false, token: undefined };
}

/** Pure. NDJSON text for a list of documents, sorted by _id so diffs are stable. */
export function toNdjson(docs) {
  return (
    [...docs]
      .sort((a, b) => String(a._id).localeCompare(String(b._id)))
      .map((d) => JSON.stringify(d))
      .join('\n') + '\n'
  );
}

/** Pure. The documents in NDJSON text. */
export function fromNdjson(text) {
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

/** Read a snapshot file (gzipped NDJSON) into documents. */
export function readSnapshot(file = resolve(ROOT, SNAPSHOT_FILE)) {
  if (!existsSync(file)) {
    throw new Error(
      `no snapshot at ${file}: run \`node scripts/snapshot.mjs export\` and commit it`,
    );
  }
  return fromNdjson(gunzipSync(readFileSync(file)).toString('utf8'));
}

/**
 * Pure-ish. The JSON a Sanity query API would send for `query` over `docs`.
 * `params` are already-parsed values. Throws on a GROQ error.
 */
export async function runQuery(docs, query, params = {}) {
  const { parse, evaluate } = await import('groq-js');
  const tree = parse(query, { params });
  const value = await evaluate(tree, { dataset: docs, params });
  return await value.get();
}

/** The `$name=<json>` parameters of a query string. */
export function paramsFromSearch(search) {
  const params = {};
  for (const [k, v] of search) {
    if (k.startsWith('$')) params[k.slice(1)] = JSON.parse(v);
  }
  return params;
}

/** An http.Server answering the query API from `docs`. Not listening yet. */
export function createSnapshotServer(docs) {
  return createServer(async (req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/__health') return send(200, { ok: true, documents: docs.length });
      if (!/^\/v[^/]+\/data\/query\/[^/]+$/.test(url.pathname)) {
        return send(404, { error: { description: `snapshot server: no route ${url.pathname}` } });
      }
      let query;
      let params;
      if (req.method === 'POST') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        query = body.query;
        params = body.params ?? {};
      } else {
        query = url.searchParams.get('query');
        params = paramsFromSearch(url.searchParams);
      }
      if (!query) return send(400, { error: { description: 'missing query' } });
      const t0 = Date.now();
      const result = await runQuery(docs, query, params);
      send(200, { ms: Date.now() - t0, query, result });
    } catch (err) {
      send(400, { error: { description: String(err?.message ?? err), type: 'queryParseError' } });
    }
  });
}

/** Listen on `port` (0 = any free port) and resolve with { server, url }. */
export function listen(server, port = 0) {
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      ok({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

// --- export ------------------------------------------------------------------
async function exportSnapshot(env) {
  const { createClient } = await import('@sanity/client');
  const projectId = env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID;
  const dataset = env.PUBLIC_SANITY_DATASET || env.SANITY_STUDIO_DATASET || 'production';
  if (!projectId) throw new Error('PUBLIC_SANITY_PROJECT_ID is not set');
  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-05-01',
    useCdn: false,
    perspective: 'published',
    ...(env.SANITY_API_READ_TOKEN ? { token: env.SANITY_API_READ_TOKEN } : {}),
  });
  let blocked = [];
  try {
    blocked =
      JSON.parse(readFileSync(resolve(ROOT, 'public-data-policy.json'), 'utf8')).blockedTypes ?? [];
  } catch {
    // no policy file: nothing extra to refuse
  }
  const docs = (
    await client.fetch(
      '*[!(_id in path("drafts.**")) && !(_id in path("versions.**")) && !(_type match "system.*")]',
    )
  ).filter((d) => !blocked.includes(d._type));
  const file = resolve(ROOT, SNAPSHOT_FILE);
  mkdirSync(dirname(file), { recursive: true });
  // mtime 0 in the gzip header would need a custom writer; the bytes only need to
  // be deterministic for the same content, which gzipSync is.
  writeFileSync(file, gzipSync(toNdjson(docs), { level: 9 }));
  console.log(
    `snapshot: ${docs.length} documents from ${projectId}/${dataset} -> ${SNAPSHOT_FILE}`,
  );
}

// --- CLI ---------------------------------------------------------------------
function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'export') {
    const { loadEnv } = await import('./lib/loadEnv.mjs');
    return exportSnapshot(loadEnv(ROOT));
  }
  if (cmd === 'serve') {
    const docs = readSnapshot(flag(rest, '--file') ? resolve(flag(rest, '--file')) : undefined);
    const { url } = await listen(createSnapshotServer(docs), Number(flag(rest, '--port') ?? 4399));
    console.log(`snapshot server: ${docs.length} documents at ${url}`);
    return new Promise(() => {});
  }
  if (cmd === 'run') {
    const sep = rest.indexOf('--');
    const command = sep >= 0 ? rest.slice(sep + 1) : [];
    if (command.length === 0) throw new Error('usage: snapshot.mjs run -- <command...>');
    // A template with no Sanity project and no snapshot just runs the command.
    if (!existsSync(resolve(ROOT, SNAPSHOT_FILE)) && !process.env.PUBLIC_SANITY_PROJECT_ID) {
      const bare = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      return bare.on('exit', (c) => process.exit(c ?? 1));
    }
    const docs = readSnapshot();
    const { server, url } = await listen(createSnapshotServer(docs));
    console.log(`snapshot: ${docs.length} documents, serving ${url} for: ${command.join(' ')}`);
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, SANITY_SNAPSHOT_URL: url },
    });
    const code = await new Promise((ok) => {
      child.on('exit', (c, s) => ok(c ?? (s ? 1 : 0)));
      child.on('error', () => ok(1));
    });
    server.close();
    process.exit(code);
  }
  throw new Error('usage: snapshot.mjs export | serve [--port N] [--file F] | run -- <command...>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`snapshot: ${err.message}`);
    process.exit(1);
  });
}
