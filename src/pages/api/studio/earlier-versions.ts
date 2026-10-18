// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/earlier-versions/ - "Go back to an earlier version" (card 124)
// =============================================================================
// The Studio's "Earlier versions" panel (src/sanity/kit/EarlierVersions.tsx)
// talks to this route, and this route talks to GitHub. It never sees a backup:
// the backups are encrypted with BACKUP_PASSPHRASE, which only GitHub Actions
// holds, so the decrypting happens in CI (.github/workflows/restore-doc.yml).
// The pure half, and the full picture, is src/lib/earlier-versions.ts.
//
// EVERY call, GET or POST, must be:
//   1. same origin (the embedded Studio on this site), and
//   2. from a signed-in member of this Sanity project who can edit (not a
//      viewer): the Studio sends its own session token, the Worker asks Sanity
//      who it is (src/lib/studio-auth.ts). The token is never stored or logged.
// Anything else, or a Worker without its settings, is refused: fail closed.
//
// GET  ?backups=1     -> { configured, backups: [{ run, date }] } (newest first, at most 14)
// GET  ?request=<id>  -> { state: starting | running | done | failed, result? }
// POST { action: 'scan', id }              -> 202 { request }   lists the versions (writes nothing)
// POST { action: 'restore', id, run }      -> 202 { request }   puts ONE draft back
//      Rate limited per editor and per Worker instance; GitHub's concurrency
//      group on the workflow queues anything that slips past. Every dispatch
//      is logged here (Sanity user id, document id, backup run) and again in
//      the run itself.
//
// THE WORKER'S SETTINGS: the same ones as "Try again" (deploy-status.ts):
//   GITHUB_DEPLOY_TOKEN  secret. A fine-grained token on this repository only
//                        with "Actions: Read and write" (dispatch the workflow,
//                        list artifacts and runs, read a run's log). Nothing new.
//   GITHUB_REPO          "owner/name", a plain var in wrangler.jsonc.
//   DEPLOY_BRANCH        default "main": the branch the workflow runs from.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  artifactsUrl,
  backupsFromArtifacts,
  canEdit,
  dispatchBody,
  dispatchRefusal,
  githubHeaders,
  isDocId,
  isRepoName,
  isRequestId,
  isRunId,
  jobLogsUrl,
  parseMarker,
  recordDispatch,
  requestState,
  RESTORE_MARKER,
  restoreDispatchUrl,
  restoreRunsUrl,
  runForRequest,
  runJobsUrl,
  SCAN_MARKER,
  type Backup,
  type DispatchLog,
  type GithubArtifact,
  type RestoreRun,
} from '@/lib/earlier-versions';
import { bearerToken, isSameOrigin, verifyStudioUser, type StudioUser } from '@/lib/studio-auth';

export const prerender = false;

interface VersionsEnv {
  GITHUB_DEPLOY_TOKEN?: string;
  GITHUB_REPO?: string;
  DEPLOY_BRANCH?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function settings(): { token: string; repo: string; branch: string } | null {
  const e = env as unknown as VersionsEnv;
  if (!e.GITHUB_DEPLOY_TOKEN || !isRepoName(e.GITHUB_REPO)) return null;
  return { token: e.GITHUB_DEPLOY_TOKEN, repo: e.GITHUB_REPO, branch: e.DEPLOY_BRANCH || 'main' };
}

// Per Worker instance, like deploy-status: enough to stop a stuck button
// hammering GitHub. The workflow's concurrency group is the real backstop.
let dispatches: DispatchLog = { entries: [] };
let backupsCache: { at: number; value: Backup[] } | null = null;
const BACKUPS_CACHE_MS = 5 * 60 * 1000;
/** Finished answers, so polling a finished request costs GitHub nothing. Bounded. */
const finished = new Map<string, { state: 'done' | 'failed'; result: unknown }>();

/** Same origin and a signed-in editor, or the Response that refuses. */
async function gate(request: Request): Promise<StudioUser | Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user) {
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);
  }
  if (!canEdit(user.roles)) {
    return json({ ok: false, error: 'Your Studio account can look but not change things.' }, 403);
  }
  return user;
}

async function gh(url: string, token: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(url, {
      ...init,
      headers: { ...githubHeaders(token), ...(init.headers ?? {}) },
    });
  } catch (err) {
    console.error(`earlier-versions: ${err instanceof Error ? err.message : 'fetch failed'}`);
    return null;
  }
}

async function listBackups(s: NonNullable<ReturnType<typeof settings>>): Promise<Backup[] | null> {
  if (backupsCache && Date.now() - backupsCache.at < BACKUPS_CACHE_MS) return backupsCache.value;
  const res = await gh(artifactsUrl(s.repo), s.token);
  if (!res?.ok) {
    console.error(`earlier-versions: artifacts answered ${res?.status ?? 'nothing'}`);
    return null;
  }
  const body = (await res.json()) as { artifacts?: GithubArtifact[] };
  const value = backupsFromArtifacts(body.artifacts);
  backupsCache = { at: Date.now(), value };
  return value;
}

/** The marker the run printed: its first job's log, read back. */
async function runResult(
  s: NonNullable<ReturnType<typeof settings>>,
  run: RestoreRun,
): Promise<unknown> {
  const jobs = await gh(runJobsUrl(s.repo, run.id), s.token);
  if (!jobs?.ok) return null;
  const body = (await jobs.json()) as { jobs?: Array<{ id: number }> };
  const job = body.jobs?.[0];
  if (!job) return null;
  const log = await gh(jobLogsUrl(s.repo, job.id), s.token, { redirect: 'follow' });
  if (!log?.ok) return null;
  const text = await log.text();
  return parseMarker(text, SCAN_MARKER) ?? parseMarker(text, RESTORE_MARKER);
}

export const GET: APIRoute = async ({ request, url }) => {
  const who = await gate(request);
  if (who instanceof Response) return who;
  const s = settings();
  if (!s) return json({ configured: false });

  if (url.searchParams.has('backups')) {
    const backups = await listBackups(s);
    if (!backups) return json({ configured: true, error: 'GitHub did not answer.' }, 502);
    return json({ configured: true, backups });
  }

  const req = url.searchParams.get('request');
  if (!isRequestId(req)) return json({ ok: false, error: 'Which request?' }, 400);
  const done = finished.get(req);
  if (done) return json(done);

  const res = await gh(restoreRunsUrl(s.repo), s.token);
  if (!res?.ok) return json({ state: 'running' }); // a GitHub blip: keep waiting
  const body = (await res.json()) as { workflow_runs?: RestoreRun[] };
  const run = runForRequest(body.workflow_runs, req);
  const state = requestState(run);
  if (state === 'starting' || state === 'running' || !run) return json({ state });

  const result = state === 'done' ? await runResult(s, run) : null;
  const answer = { state: result || state === 'failed' ? state : 'failed', result };
  if (finished.size > 200) finished.clear();
  finished.set(req, answer as { state: 'done' | 'failed'; result: unknown });
  return json(answer);
};

export const POST: APIRoute = async ({ request }) => {
  const who = await gate(request);
  if (who instanceof Response) return who;
  const s = settings();
  if (!s)
    return json({ ok: false, error: 'Earlier versions are not set up for this website.' }, 409);

  let input: { action?: unknown; id?: unknown; run?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return json({ ok: false, error: 'That request was not readable.' }, 400);
  }
  const mode = input.action === 'scan' || input.action === 'restore' ? input.action : null;
  if (!mode || !isDocId(input.id)) return json({ ok: false, error: 'Which page?' }, 400);
  if (mode === 'restore') {
    if (!isRunId(input.run)) return json({ ok: false, error: 'Which night?' }, 400);
    // Only a backup GitHub still keeps: the run id must be one we listed.
    const backups = await listBackups(s);
    if (!backups?.some((b) => b.run === input.run)) {
      return json({ ok: false, error: 'That backup has expired. Look again.' }, 409);
    }
  }

  const now = Date.now();
  const refusal = dispatchRefusal(dispatches, who.id, now);
  if (refusal) return json({ ok: false, error: refusal }, 429);

  const requestId = crypto.randomUUID();
  const res = await gh(restoreDispatchUrl(s.repo), s.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      dispatchBody({
        branch: s.branch,
        mode,
        document: input.id,
        backupRun: mode === 'restore' ? (input.run as string) : undefined,
        request: requestId,
        requestedBy: who.id,
      }),
    ),
  });
  // 204 is the classic answer; newer API versions may answer 200 with the run.
  if (!res || (res.status !== 204 && res.status !== 200)) {
    console.error(`earlier-versions: dispatch answered ${res?.status ?? 'nothing'}`);
    return json({ ok: false, error: 'GitHub did not take the request.' }, 502);
  }
  dispatches = recordDispatch(dispatches, who.id, now);
  console.log(
    `earlier-versions: ${mode} of ${input.id}${mode === 'restore' ? ` from backup run ${String(input.run)}` : ''} started by Studio user ${who.id} (request ${requestId})`,
  );
  return json({ ok: true, request: requestId }, 202);
};
